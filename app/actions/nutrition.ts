"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NutritionProgram, NutritionMeal, ProgramSummary } from "@/types/nutrition";

// --- PROGRAMS ---

export async function getPrograms(): Promise<NutritionProgram[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("nutrition_programs")
        .select("*")
        .order("start_date", { ascending: false });
    return data || [];
}

// PERFORMANCE FIX: Lean query for dropdowns
export async function getProgramOptions(): Promise<ProgramSummary[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("nutrition_programs")
        .select("id, name")
        .order("start_date", { ascending: false });
    return data || [];
}

export async function createNutritionProgram(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const programData = {
        user_id: user.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        notes: (formData.get("notes") as string) || null,
        start_date: formData.get("start_date") as string,
        end_date: formData.get("end_date") as string,
        is_public: formData.get("is_public") === "on",
        status: 'active' // Default status
    };

    const { error } = await supabase.from("nutrition_programs").insert(programData);
    if (error) throw new Error(error.message);

    revalidatePath("/nutrition");
}

export async function updateNutritionProgram(formData: FormData, programId: string) {
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

    // 1. Fetch Original
    const { data: original } = await supabase
        .from("nutrition_programs")
        .select("*")
        .eq("id", programId)
        .single();

    if (!original) throw new Error("Program not found");

    // 2. Create Copy
    const { data: newProgram, error: progError } = await supabase
        .from("nutrition_programs")
        .insert({
            user_id: user.id,
            name: `Copy of ${original.name}`,
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

    // 3. Fetch Meals
    const { data: meals } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("program_id", programId);

    // 4. Bulk Insert Meals
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
        }));

        const { error: mealError } = await supabase.from("nutrition_meals").insert(newMeals);
        if (mealError) throw new Error(mealError.message);
    }

    revalidatePath("/nutrition");
}

// --- MEALS ---

export async function getProgramMeals(programId: string): Promise<NutritionMeal[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("program_id", programId)
        .order("position", { ascending: true }); 
    return data || [];
}

export async function addMeal(formData: FormData, programId: string) {
    const supabase = await createClient();
    
    // Get max position (Optimized: select only position)
    const { data: maxPos } = await supabase
      .from("nutrition_meals")
      .select("position")
      .eq("program_id", programId)
      .order("position", { ascending: false })
      .limit(1)
      .single();
  
    const nextPosition = (maxPos?.position ?? 0) + 1;
  
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
      // Note: We don't update date/position here usually
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
  
    const { data: original } = await supabase.from("nutrition_meals").select("*").eq("id", originalMealId).single();
    if (!original) throw new Error("Meal not found");
  
    const { data: maxPos } = await supabase.from("nutrition_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();
    
    // Strip system fields
    const { id, created_at, updated_at, ...mealData } = original;
    
    await supabase.from("nutrition_meals").insert({
      ...mealData,
      program_id: targetProgramId,
      position: (maxPos?.position ?? 0) + 1
    });
  
    revalidatePath(`/nutrition/program/${targetProgramId}`);
}

export async function moveMeal(mealId: string, targetProgramId: string) {
    const supabase = await createClient();

    const { data: maxPos } = await supabase.from("nutrition_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();

    const { error } = await supabase.from("nutrition_meals").update({
        program_id: targetProgramId,
        position: (maxPos?.position ?? 0) + 1
    }).eq("id", mealId);

    if (error) throw new Error(error.message);

    revalidatePath("/nutrition");
}

// PERFORMANCE NOTE: 
// For production apps with large lists, consider a Postgres Function (RPC) for this.
// For < 50 items, Promise.all is acceptable.
export async function updateMealPositions(updates: { id: string; position: number }[], programId: string) {
    const supabase = await createClient();

    await Promise.all(
        updates.map(u =>
            supabase.from("nutrition_meals").update({ position: u.position }).eq("id", u.id)
        )
    );

    revalidatePath(`/nutrition/program/${programId}`);
}


export async function updateMealStatus(mealId: string, status: 'active' | 'draft') {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("nutrition_meals")
      .update({ status })
      .eq("id", mealId);
  
    if (error) throw new Error(error.message);
    
    revalidatePath("/nutrition");
  }
