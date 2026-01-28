"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getOpenWorkouts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("workouts")
    .select("id, name, date, status")
    .in("status", ["active", "draft"]) 
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(5);

  return data || [];
}

export async function addExerciseToWorkout(workoutId: string, exercise: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const isCardio = exercise.category?.toLowerCase() === "cardio";
  const table = isCardio ? "cardio_logs" : "workout_logs";

  let payload: any = {};

  if (isCardio) {
    // Cardio Logs DO need user_id (based on your schema) and date
    payload = {
      workout_id: workoutId,
      user_id: user.id,          // <--- Keep for Cardio
      date: new Date().toISOString(),
      activity_type: exercise.name,
      duration_minutes: 0,
      distance_km: 0,
    };
  } else {
    // Strength Logs DO NOT need user_id (it inherits from workout) or date
    payload = {
      workout_id: workoutId,
      // user_id: user.id,       // <--- REMOVED THIS LINE
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      set_number: 1,
      reps: 0,
      weight: 0,
    };
  }

  const { error } = await supabase.from(table).insert(payload);

  if (error) {
    console.error("❌ Add Exercise Error:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}`);
  return { success: true };
}

export async function createWorkoutWithExercise(exercise: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Create Workout Header
  const { data: workout, error: wError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: `${exercise.name} Session`,
      date: new Date().toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (wError) {
    console.error("Create Workout Error:", wError.message);
    throw new Error(wError.message);
  }

  // 2. Add the Exercise
  await addExerciseToWorkout(workout.id, exercise);

  return { workoutId: workout.id };
}