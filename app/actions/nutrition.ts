"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- PROGRAMS ---

export async function getPrograms() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("nutrition_programs")
        .select("*")
        .order("start_date", { ascending: false });
    return data || [];
}

export async function createProgram(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("You must be logged in to create a program.");

    const programData = {
        user_id: user.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        notes: (formData.get("notes") as string) || null,
        start_date: formData.get("start_date") as string,
        end_date: formData.get("end_date") as string,
        is_public: formData.get("is_public") === "on",
    };

    const { error } = await supabase.from("nutrition_programs").insert(programData);

    if (error) {
        console.error("Error creating program:", error);
        throw new Error(error.message);
    }

    revalidatePath("/nutrition");
}

export async function updateProgram(formData: FormData, programId: string) {
    const supabase = await createClient();

    const updates = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        notes: formData.get("notes") as string,
        start_date: formData.get("start_date") as string,
        end_date: formData.get("end_date") as string,
        is_public: formData.get("is_public") === "on",
    };

    const { error } = await supabase
        .from("nutrition_programs")
        .update(updates)
        .eq("id", programId);

    if (error) throw new Error(error.message);
    
    revalidatePath("/nutrition");
    revalidatePath(`/nutrition/program/${programId}`);
}

export async function deleteProgram(id: string) {
    const supabase = await createClient();
    await supabase.from("nutrition_programs").delete().eq("id", id);
    revalidatePath("/nutrition");
}

export async function updateProgramStatus(programId: string, status: string) {
    const supabase = await createClient();
    await supabase.from("nutrition_programs").update({ status }).eq("id", programId);
    revalidatePath("/nutrition");
    revalidatePath(`/nutrition/program/${programId}`);
}

export async function updateProgramNotes(programId: string, notes: string) {
    const supabase = await createClient();
    await supabase.from("nutrition_programs").update({ notes }).eq("id", programId);
    revalidatePath(`/nutrition/program/${programId}`);
}

export async function duplicateProgram(programId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // A. Fetch Original Program
    const { data: original } = await supabase
        .from("nutrition_programs")
        .select("*")
        .eq("id", programId)
        .single();

    if (!original) throw new Error("Program not found");

    // B. Create New Program
    const { data: newProgram, error: progError } = await supabase
        .from("nutrition_programs")
        .insert({
            user_id: user.id,
            name: `Copy_of_${original.name}`,
            description: original.description,
            notes: original.notes,
            start_date: original.start_date,
            end_date: original.end_date,
            status: 'draft',
            is_public: false
        })
        .select()
        .single();

    if (progError) throw new Error(progError.message);

    // C. Fetch Original Meals
    const { data: meals } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("program_id", programId);

    // D. Bulk Insert Meals
    if (meals && meals.length > 0) {
        const newMeals = meals.map(m => ({
            program_id: newProgram.id,
            meal_type: m.meal_type,
            food_name: m.food_name,
            calories: m.calories,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            fats_g: m.fats_g,
            instructions: m.instructions,
            alternatives: m.alternatives,
            position: m.position
            // REMOVED: is_completed (column deleted)
        }));

        const { error: mealError } = await supabase.from("nutrition_meals").insert(newMeals);
        if (mealError) throw new Error(mealError.message);
    }

    revalidatePath("/nutrition");
}

// --- MEALS ---

export async function getProgramMeals(programId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("program_id", programId)
        // FIXED: Removed .order("meal_date") as it was deleted
        .order("position", { ascending: true }); 
    return data || [];
}

export async function addMeal(formData: FormData, programId: string) {
    const supabase = await createClient();
    
    // Get max position to append to end
    const { data: maxPos } = await supabase
      .from("nutrition_meals")
      .select("position")
      .eq("program_id", programId)
      .order("position", { ascending: false })
      .limit(1)
      .single();
  
    const nextPosition = (maxPos?.position || 0) + 1;
  
    const mealData = {
      program_id: programId,
      meal_type: formData.get("meal_type") as string,
      food_name: formData.get("food_name") as string,
      calories: Number(formData.get("calories") || 0),
      protein_g: Number(formData.get("protein_g") || 0),
      carbs_g: Number(formData.get("carbs_g") || 0),
      fats_g: Number(formData.get("fats_g") || 0),
      instructions: (formData.get("instructions") as string) || null,
      alternatives: (formData.get("alternatives") as string) || null,
      position: nextPosition
    };
  
    const { error } = await supabase.from("nutrition_meals").insert(mealData);
    if (error) throw new Error(error.message);
  
    revalidatePath(`/nutrition/program/${programId}`);
}

export async function updateMeal(formData: FormData, mealId: string, programId: string) {
    const supabase = await createClient();
    
    const updates = {
      meal_type: formData.get("meal_type") as string,
      food_name: formData.get("food_name") as string,
      calories: Number(formData.get("calories") || 0),
      protein_g: Number(formData.get("protein_g") || 0),
      carbs_g: Number(formData.get("carbs_g") || 0),
      fats_g: Number(formData.get("fats_g") || 0),
      instructions: (formData.get("instructions") as string) || null,
      alternatives: (formData.get("alternatives") as string) || null,
    };
  
    const { error } = await supabase.from("nutrition_meals").update(updates).eq("id", mealId);
    if (error) throw new Error(error.message);
    
    revalidatePath(`/nutrition/program/${programId}`);
}

export async function deleteMeal(mealId: string) {
    const supabase = await createClient();
    await supabase.from("nutrition_meals").delete().eq("id", mealId);
    revalidatePath("/nutrition");
}

export async function copyMeal(originalMealId: string, targetProgramId: string) {
    const supabase = await createClient();
  
    // 1. Get original
    const { data: original } = await supabase.from("nutrition_meals").select("*").eq("id", originalMealId).single();
    if (!original) throw new Error("Meal not found");
  
    // 2. Get max position in target
    const { data: maxPos } = await supabase.from("nutrition_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();
    
    // 3. Insert Copy
    // Note: We strip 'id', 'created_at', 'updated_at'. 
    // Since 'is_completed' is deleted from DB, 'original' wont have it, so spread is safe.
    const { id, created_at, updated_at, ...mealData } = original;
    
    await supabase.from("nutrition_meals").insert({
      ...mealData,
      program_id: targetProgramId,
      position: (maxPos?.position || 0) + 1
    });
  
    revalidatePath(`/nutrition/program/${targetProgramId}`);
}

export async function moveMeal(mealId: string, targetProgramId: string) {
    const supabase = await createClient();

    // 1. Get max position in target
    const { data: maxPos } = await supabase.from("nutrition_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();

    // 2. Update Program ID and Position
    const { error } = await supabase.from("nutrition_meals").update({
        program_id: targetProgramId,
        position: (maxPos?.position || 0) + 1
    }).eq("id", mealId);

    if (error) throw new Error(error.message);

    revalidatePath("/nutrition");
}

export async function updateMealPositions(updates: { id: string; position: number }[], programId: string) {
    const supabase = await createClient();

    await Promise.all(
        updates.map(u =>
            supabase.from("nutrition_meals").update({ position: u.position }).eq("id", u.id)
        )
    );

    revalidatePath(`/nutrition/program/${programId}`);
}