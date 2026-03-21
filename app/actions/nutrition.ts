"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { revalidatePath } from "next/cache";
import { NutritionMeal, NutritionProgram, ProgramSummary } from "@/types/nutrition";
import { z } from "zod";

const programIdSchema = z.string().uuid();

// --- PROGRAMS ---

export async function getProgramById(programId: string): Promise<NutritionProgram | null> {
    const safeProgramId = programIdSchema.parse(programId);
    return runTrackedAction({
        eventName: "nutrition.program.read",
        payload: { program_id: safeProgramId },
        action: async () => {
            const supabase = await createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthorized");

            const { data, error } = await supabase
                .from("meal_plans")
                .select("*")
                .eq("id", safeProgramId)
                .eq("user_id", user.id)
                .maybeSingle();
            if (error) throw new Error(error.message);
            return (data || null) as NutritionProgram | null;
        },
    });
}

export async function getPublicProgramWithMeals(programId: string): Promise<{ program: NutritionProgram; meals: NutritionMeal[] } | null> {
    const safeProgramId = programIdSchema.parse(programId);
    return runTrackedAction({
        eventName: "nutrition.program.public.read",
        payload: { program_id: safeProgramId },
        action: async () => {
            const supabase = await createClient();
            const { data: program, error: programError } = await supabase
                .from("meal_plans")
                .select("*")
                .eq("id", safeProgramId)
                .eq("is_public", true)
                .maybeSingle();
            if (programError) throw new Error(programError.message);
            if (!program) return null;

            const { data: meals, error: mealsError } = await supabase
                .from("meal_plan_meals")
                .select("*")
                .eq("program_id", safeProgramId)
                .order("position", { ascending: true });
            if (mealsError) throw new Error(mealsError.message);

            return {
                program: program as NutritionProgram,
                meals: (meals || []) as NutritionMeal[],
            };
        },
    });
}

// PERFORMANCE FIX: Lean query for dropdowns
export async function getProgramOptions(): Promise<ProgramSummary[]> {
    return runTrackedAction({
        eventName: "nutrition.program.options.read",
        action: async () => {
            const supabase = await createClient();
            const { data } = await supabase
                .from("meal_plans")
                .select("id, name")
                .order("start_date", { ascending: false });
            return data || [];
        },
    });
}

export async function updateProgramStatus(programId: string, status: string) {
    return runTrackedAction({
        eventName: "nutrition.program.status.update",
        payload: { program_id: programId, status },
        action: async () => {
            const supabase = await createClient();
            await supabase.from("meal_plans").update({ status }).eq("id", programId);
            revalidatePath("/nutrition");
            revalidatePath(`/nutrition/${programId}`);
        },
    });
}

export async function updateProgramNotes(programId: string, notes: string) {
    return runTrackedAction({
        eventName: "nutrition.program.notes.update",
        payload: { program_id: programId },
        action: async () => {
            const supabase = await createClient();
            await supabase.from("meal_plans").update({ notes }).eq("id", programId);
            revalidatePath(`/nutrition/${programId}`);
        },
    });
}

// --- MEALS ---

export async function getProgramMeals(programId: string): Promise<NutritionMeal[]> {
    return runTrackedAction({
        eventName: "nutrition.meals.read",
        payload: { program_id: programId },
        action: async () => {
            const supabase = await createClient();
            const { data } = await supabase
                .from("meal_plan_meals")
                .select("*")
                .eq("program_id", programId)
                .order("position", { ascending: true }); 
            return data || [];
        },
    });
}

export async function addMeal(formData: FormData, programId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.create",
        payload: { program_id: programId, meal_type: formData.get("meal_type") as string },
        action: async () => {
    const supabase = await createClient();
    
    // Get max position (Optimized: select only position)
    const { data: maxPos } = await supabase
      .from("meal_plan_meals")
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
  
    const { error } = await supabase.from("meal_plan_meals").insert(mealData);
    if (error) throw new Error(error.message);
  
    revalidatePath(`/nutrition/${programId}`);
        },
    });
}

export async function updateMeal(formData: FormData, mealId: string, programId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.update",
        payload: { meal_id: mealId, program_id: programId },
        action: async () => {
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
  
    const { error } = await supabase.from("meal_plan_meals").update(updates).eq("id", mealId);
    if (error) throw new Error(error.message);
    
    revalidatePath(`/nutrition/${programId}`);
        },
    });
}

export async function deleteMeal(mealId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.delete",
        payload: { meal_id: mealId },
        action: async () => {
            const supabase = await createClient();
            await supabase.from("meal_plan_meals").delete().eq("id", mealId);
            revalidatePath("/nutrition");
        },
    });
}

export async function copyMeal(originalMealId: string, targetProgramId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.copy",
        payload: { meal_id: originalMealId, target_program_id: targetProgramId },
        action: async () => {
    const supabase = await createClient();
  
    const { data: original } = await supabase.from("meal_plan_meals").select("*").eq("id", originalMealId).single();
    if (!original) throw new Error("Meal not found");
  
    const { data: maxPos } = await supabase.from("meal_plan_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();
    
    // Strip system fields
    const { id, created_at, updated_at, ...mealData } = original;
    
    await supabase.from("meal_plan_meals").insert({
      ...mealData,
      program_id: targetProgramId,
      position: (maxPos?.position ?? 0) + 1
    });
  
    revalidatePath(`/nutrition/${targetProgramId}`);
        },
    });
}

export async function moveMeal(mealId: string, targetProgramId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.move",
        payload: { meal_id: mealId, target_program_id: targetProgramId },
        action: async () => {
    const supabase = await createClient();

    const { data: maxPos } = await supabase.from("meal_plan_meals").select("position").eq("program_id", targetProgramId).order("position", { ascending: false }).limit(1).single();

    const { error } = await supabase.from("meal_plan_meals").update({
        program_id: targetProgramId,
        position: (maxPos?.position ?? 0) + 1
    }).eq("id", mealId);

    if (error) throw new Error(error.message);

    revalidatePath("/nutrition");
        },
    });
}

// PERFORMANCE NOTE: 
// For production apps with large lists, consider a Postgres Function (RPC) for this.
// For < 50 items, Promise.all is acceptable.
export async function updateMealPositions(updates: { id: string; position: number }[], programId: string) {
    return runTrackedAction({
        eventName: "nutrition.meal.positions.update",
        payload: { program_id: programId, count: updates.length },
        action: async () => {
    const supabase = await createClient();

    await Promise.all(
        updates.map(u =>
            supabase.from("meal_plan_meals").update({ position: u.position }).eq("id", u.id)
        )
    );

    revalidatePath(`/nutrition/${programId}`);
        },
    });
}


export async function updateMealStatus(mealId: string, status: 'active' | 'draft') {
    return runTrackedAction({
        eventName: "nutrition.meal.status.update",
        payload: { meal_id: mealId, status },
        action: async () => {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("meal_plan_meals")
      .update({ status })
      .eq("id", mealId);
  
    if (error) throw new Error(error.message);
    
    revalidatePath("/nutrition");
        },
    });
}
