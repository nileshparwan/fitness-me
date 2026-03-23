import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { inngest } from "@/lib/inngest/client";
import { Database } from "@/types/database";

type StrengthSetInsert = Database["public"]["Tables"]["strength_sets"]["Insert"];
type CardioSessionInsert = Database["public"]["Tables"]["cardio_sessions"]["Insert"];
type DbClient = SupabaseClient<Database>;

export async function insertWorkoutExerciseRows(input: {
  supabase: DbClient;
  strengthRows: StrengthSetInsert[];
  cardioRows: CardioSessionInsert[];
}) {
  if (input.strengthRows.length > 0) {
    const { error } = await input.supabase.from("strength_sets").insert(input.strengthRows);
    if (error) throw new Error(error.message);
  }
  if (input.cardioRows.length > 0) {
    const { error } = await input.supabase.from("cardio_sessions").insert(input.cardioRows);
    if (error) throw new Error(error.message);
  }
}

export async function replaceWorkoutExerciseRows(input: {
  supabase: DbClient;
  workoutId: string;
  strengthRows: StrengthSetInsert[];
  cardioRows: CardioSessionInsert[];
}) {
  const { error: deleteStrengthError } = await input.supabase.from("strength_sets").delete().eq("workout_id", input.workoutId);
  if (deleteStrengthError) throw new Error(deleteStrengthError.message);

  const { error: deleteCardioError } = await input.supabase.from("cardio_sessions").delete().eq("workout_id", input.workoutId);
  if (deleteCardioError) throw new Error(deleteCardioError.message);

  await insertWorkoutExerciseRows({
    supabase: input.supabase,
    strengthRows: input.strengthRows,
    cardioRows: input.cardioRows,
  });
}

export function revalidateTrainingWorkoutPaths(input: {
  workoutId?: string;
  includeGoals?: boolean;
  includeProgress?: boolean;
}) {
  revalidatePath("/workouts");
  if (input.workoutId) revalidatePath(`/workouts/${input.workoutId}`);
  if (input.includeGoals) revalidatePath("/goals");
  if (input.includeProgress) revalidatePath("/progress");
}

export function emitTrainingWorkoutCompleted(input: {
  workoutId: string;
  executionId?: string | null;
  userId: string;
  subjectUserId: string | null;
  subjectClientId: string | null;
}) {
  void inngest.send({
    name: "training/workout.completed",
    data: {
      workout_id: input.workoutId,
      execution_id: input.executionId ?? null,
      user_id: input.userId,
      subject_user_id: input.subjectUserId,
      subject_client_id: input.subjectClientId,
    },
  });
}
