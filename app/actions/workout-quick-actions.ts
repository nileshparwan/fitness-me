"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

type ExerciseLibraryRow = Database["public"]["Tables"]["exercise_catalog"]["Row"];
type QuickExercise = Pick<ExerciseLibraryRow, "id" | "name" | "category">;
type CardioInsert = Database["public"]["Tables"]["cardio_sessions"]["Insert"];
type WorkoutLogInsert = Database["public"]["Tables"]["strength_sets"]["Insert"];

export async function getOpenWorkouts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("training_sessions")
    .select("id, name, date, status")
    .in("status", ["active", "draft"]) 
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(5);

  return data || [];
}

export async function addExerciseToWorkout(workoutId: string, exercise: QuickExercise) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: workout } = await supabase
    .from("training_sessions")
    .select("id")
    .eq("id", workoutId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!workout) throw new Error("Forbidden");

  const isCardio = exercise.category?.toLowerCase() === "cardio";

  if (isCardio) {
    const payload: CardioInsert = {
      workout_id: workoutId,
      user_id: user.id,
      date: new Date().toISOString(),
      activity_type: exercise.name,
      duration_minutes: 0,
      distance_km: 0,
    };

    const { error } = await supabase.from("cardio_sessions").insert(payload);
    if (error) {
      console.error("Add Exercise Error:", error.message);
      throw new Error(error.message);
    }
  } else {
    const payload: WorkoutLogInsert = {
      workout_id: workoutId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      set_number: 1,
      reps: 0,
      weight: 0,
    };

    const { error } = await supabase.from("strength_sets").insert(payload);
    if (error) {
      console.error("Add Exercise Error:", error.message);
      throw new Error(error.message);
    }
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}`);
  return { success: true };
}

export async function createWorkoutWithExercise(exercise: QuickExercise) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Create Workout Header
  const { data: workout, error: wError } = await supabase
    .from("training_sessions")
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
