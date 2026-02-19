"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

// 1. DERIVED TYPES FROM DATABASE
type WorkoutInsert = Database['public']['Tables']['workouts']['Insert'];
type WorkoutLogInsert = Database['public']['Tables']['workout_logs']['Insert'];
type CardioLogInsert = Database['public']['Tables']['cardio_logs']['Insert'];

// 2. FORM INPUT TYPE
export type WorkoutActionInput = {
  name: string;
  date: Date;
  notes?: string | null;
  status?: WorkoutInsert['status'];
  overall_rating?: number;
  ai_feedback?: string;
  template_id?: string;
  exercises?: {
    type?: 'strength' | 'cardio'; 
    exercise_id?: string;
    group_id?: string;
    name: string;
    notes?: string;
    // Strength fields
    sets?: {
      set_number: number;
      reps: number | string;
      weight: number | string;
      rest_seconds?: number | string;
      tempo?: string;
      is_warmup?: boolean;
      is_dropset?: boolean;
      form_video_url?: string;
    }[];
    // Cardio fields
    duration?: number | string;
    distance?: number | string;
    calories?: number | string;
    heartRate?: number | string;
  }[];
};

function buildWorkoutLogs(
  exercises: WorkoutActionInput["exercises"] | undefined,
  workoutId: string,
  userId: string,
  dateISO: string
) {
  const strengthLogs: WorkoutLogInsert[] = [];
  const cardioLogs: CardioLogInsert[] = [];

  if (!exercises || exercises.length === 0) {
    return { strengthLogs, cardioLogs };
  }

  for (const ex of exercises) {
    if (ex.type === "cardio") {
      cardioLogs.push({
        workout_id: workoutId,
        user_id: userId,
        date: dateISO,
        activity_type: ex.name,
        duration_minutes: Number(ex.duration || 0),
        distance_km: ex.distance ? Number(ex.distance) : null,
        calories_burned: ex.calories ? Number(ex.calories) : null,
        average_heart_rate: ex.heartRate ? Number(ex.heartRate) : null,
      });
      continue;
    }

    if (!ex.sets) continue;

    ex.sets.forEach((set) => {
      strengthLogs.push({
        workout_id: workoutId,
        exercise_id: ex.exercise_id || null,
        group_id: ex.group_id || null,
        exercise_name: ex.name,
        set_number: set.set_number,
        reps: Number(set.reps || 0),
        weight: Number(set.weight || 0),
        rest_seconds: set.rest_seconds !== undefined ? Number(set.rest_seconds) : null,
        tempo: set.tempo || null,
        is_warmup: Boolean(set.is_warmup),
        is_dropset: Boolean(set.is_dropset),
        form_video_url: set.form_video_url || null,
        notes: ex.notes || null,
      });
    });
  }

  return { strengthLogs, cardioLogs };
}

// ============================================================================
// 2. CREATE WORKOUT
// ============================================================================
export async function createWorkoutAction(data: WorkoutActionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated");

  // A. Insert Parent Workout
  const workoutPayload: WorkoutInsert = {
    user_id: user.id,
    name: data.name,
    date: data.date.toISOString(),
    status: data.status || "active",
    notes: data.notes || null,
    overall_rating: data.overall_rating ?? null,
    ai_feedback: data.ai_feedback || null,
    template_id: data.template_id || null,
  };

  const { data: workout, error: wError } = await supabase
    .from("workouts")
    .insert(workoutPayload)
    .select()
    .single();

  if (wError) throw new Error(wError.message);

  const { strengthLogs, cardioLogs } = buildWorkoutLogs(
    data.exercises,
    workout.id,
    user.id,
    data.date.toISOString()
  );

  if (strengthLogs.length > 0) await supabase.from("workout_logs").insert(strengthLogs);
  if (cardioLogs.length > 0) await supabase.from("cardio_logs").insert(cardioLogs);

  revalidatePath("/workouts");
  return workout;
}

// ============================================================================
// 3. UPDATE WORKOUT
// ============================================================================
export async function updateWorkoutAction(id: string, data: Partial<WorkoutActionInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: ownedWorkout } = await supabase
    .from("workouts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownedWorkout) throw new Error("Forbidden");

  // A. Update Header
  const updateData: Database['public']['Tables']['workouts']['Update'] = {};
  if (data.name) updateData.name = data.name;
  if (data.date) updateData.date = data.date.toISOString();
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status) updateData.status = data.status;
  if (data.overall_rating !== undefined) updateData.overall_rating = data.overall_rating;
  if (data.ai_feedback !== undefined) updateData.ai_feedback = data.ai_feedback || null;
  if (data.template_id !== undefined) updateData.template_id = data.template_id || null;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from("workouts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  // B. Wipe & Rewrite Logs
  if (data.exercises) {
    // 1. Delete existing
    await supabase.from("workout_logs").delete().eq("workout_id", id);
    await supabase.from("cardio_logs").delete().eq("workout_id", id);

    // 2. Prepare new
    const dateStr = data.date ? data.date.toISOString() : new Date().toISOString();
    const { strengthLogs, cardioLogs } = buildWorkoutLogs(data.exercises, id, user.id, dateStr);
    if (strengthLogs.length > 0) await supabase.from("workout_logs").insert(strengthLogs);
    if (cardioLogs.length > 0) await supabase.from("cardio_logs").insert(cardioLogs);
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
  revalidatePath("/progress"); 
}

// ============================================================================
// 4. DELETE WORKOUT
// ============================================================================
export async function deleteWorkoutAction(ids: string | string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const idArray = Array.isArray(ids) ? ids : [ids];

  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("user_id", user.id)
    .in("id", idArray);
  if (error) throw new Error(error.message);
  
  revalidatePath("/workouts");
}
