"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

type ExerciseLibraryRow = Database["public"]["Tables"]["exercise_catalog"]["Row"];
type QuickExercise = Pick<ExerciseLibraryRow, "id" | "name" | "category">;
type CardioInsert = Database["public"]["Tables"]["cardio_sessions"]["Insert"];
type WorkoutLogInsert = Database["public"]["Tables"]["strength_sets"]["Insert"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AuthUser = { id: string };

async function requireQuickActor(): Promise<{ supabase: SupabaseServerClient; user: AuthUser }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user: { id: user.id } };
}

async function ensureOwnedWorkout(input: { supabase: SupabaseServerClient; workoutId: string; userId: string }) {
  const { data: workout, error } = await input.supabase
    .from("training_sessions")
    .select("id")
    .eq("id", input.workoutId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!workout) throw new Error("Forbidden");
}

async function insertExerciseIntoWorkout(input: {
  supabase: SupabaseServerClient;
  workoutId: string;
  userId: string;
  exercise: QuickExercise;
  dateIso?: string;
}) {
  const isCardio = input.exercise.category?.toLowerCase() === "cardio";
  if (isCardio) {
    const payload: CardioInsert = {
      workout_id: input.workoutId,
      user_id: input.userId,
      date: input.dateIso || new Date().toISOString(),
      activity_type: input.exercise.name,
      duration_minutes: 0,
      distance_km: 0,
    };
    const { error } = await input.supabase.from("cardio_sessions").insert(payload);
    if (error) throw new Error(error.message);
    return;
  }

  const payload: WorkoutLogInsert = {
    workout_id: input.workoutId,
    exercise_id: input.exercise.id,
    exercise_name: input.exercise.name,
    set_number: 1,
    reps: 0,
    weight: 0,
  };
  const { error } = await input.supabase.from("strength_sets").insert(payload);
  if (error) throw new Error(error.message);
}

function revalidateQuickWorkoutPaths(workoutId: string) {
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${workoutId}`);
}

export async function getOpenWorkouts() {
  return runTrackedAction({
    eventName: "workout.quick.open.list",
    action: async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("training_sessions")
        .select("id, name, date, status")
        .in("status", ["active", "draft"])
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(5);

      return data || [];
    },
  });
}

export async function addExerciseToWorkout(workoutId: string, exercise: QuickExercise) {
  return runTrackedAction({
    eventName: "workout.quick.add_exercise",
    payload: { workout_id: workoutId, exercise_id: exercise.id, exercise_name: exercise.name },
    action: async () => {
      const { supabase, user } = await requireQuickActor();
      await ensureOwnedWorkout({ supabase, workoutId, userId: user.id });
      await insertExerciseIntoWorkout({
        supabase,
        workoutId,
        userId: user.id,
        exercise,
      });
      revalidateQuickWorkoutPaths(workoutId);
      return { success: true };
    },
  });
}

export async function createWorkoutWithExercise(exercise: QuickExercise) {
  return runTrackedAction({
    eventName: "workout.quick.create_with_exercise",
    payload: { exercise_id: exercise.id, exercise_name: exercise.name },
    action: async () => {
      const { supabase, user } = await requireQuickActor();
      const nowIso = new Date().toISOString();

      const { data: workout, error: wError } = await supabase
        .from("training_sessions")
        .insert({
          user_id: user.id,
          created_by_user_id: user.id,
          subject_user_id: user.id,
          subject_client_id: null,
          name: `${exercise.name} Session`,
          date: nowIso,
          performed_on: nowIso.slice(0, 10),
          session_slot: "other",
          status: "active",
        })
        .select()
        .single();

      if (wError) throw new Error(wError.message);

      await insertExerciseIntoWorkout({
        supabase,
        workoutId: workout.id,
        userId: user.id,
        exercise,
        dateIso: nowIso,
      });
      revalidateQuickWorkoutPaths(workout.id);

      return { workoutId: workout.id };
    },
  });
}
