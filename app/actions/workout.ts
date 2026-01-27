"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- Types ---
type WorkoutInput = {
  name: string;
  date: Date;
  notes?: string;
  status?: 'active' | 'draft' | 'archived' | 'completed'
  exercises?: any[]; // Optional: if provided, we replace logs
};

// 1. CREATE ACTION
export async function createWorkoutAction(data: WorkoutInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // A. Insert Header
  const { data: workout, error: wError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: data.name,
      date: data.date.toISOString(),
      status: data.status || "active", // Default to active
      notes: data.notes
    })
    .select()
    .single();

  if (wError) throw new Error(wError.message);

  // B. Insert Logs (if exercises exist)
  if (data.exercises && data.exercises.length > 0) {
    const logs = data.exercises.flatMap((ex: any) => 
      ex.sets.map((set: any) => ({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.name,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe,
      }))
    );

    const { error: lError } = await supabase.from("workout_logs").insert(logs);
    if (lError) throw new Error(lError.message);
  }

  revalidatePath("/workouts");
  return workout;
}

// 2. UPDATE ACTION
export async function updateWorkoutAction(id: string, data: Partial<WorkoutInput>) {
  const supabase = await createClient();

  // A. Prepare Header Update Data
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.date) updateData.date = data.date.toISOString();
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status) updateData.status = data.status;

  // Update Header if there is data to update
  if (Object.keys(updateData).length > 0) {
    const { error: wError } = await supabase
      .from("workouts")
      .update(updateData)
      .eq("id", id);
    if (wError) throw new Error(wError.message);
  }

  // B. Replace Logs (Only if 'exercises' array is explicitly passed)
  if (data.exercises) {
    // 1. Delete old logs
    await supabase.from("workout_logs").delete().eq("workout_id", id);

    // 2. Prepare new logs
    const logs = data.exercises.flatMap((ex: any) => 
      ex.sets.map((set: any) => ({
        workout_id: id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.name,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe,
      }))
    );

    // 3. Insert new logs
    if (logs.length > 0) {
      const { error: lError } = await supabase.from("workout_logs").insert(logs);
      if (lError) throw new Error(lError.message);
    }
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
}

// 3. DELETE ACTION (Handles Single or Multiple)
export async function deleteWorkoutAction(ids: string | string[]) {
  const supabase = await createClient();
  const idArray = Array.isArray(ids) ? ids : [ids];

  const { error } = await supabase
    .from("workouts")
    .delete()
    .in("id", idArray);

  if (error) throw new Error(error.message);
  revalidatePath("/workouts");
}