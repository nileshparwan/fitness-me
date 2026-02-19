"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";
import { calculatePaceMinutesPerKm, formatPace } from "@/utils/fitness-logic";

type CardioLogInsert = Database["public"]["Tables"]["cardio_logs"]["Insert"];
type CardioLogUpsertInput = Omit<CardioLogInsert, "user_id" | "created_at" | "updated_at">;

export async function upsertCardioLog(data: CardioLogUpsertInput) {
  const supabase = await createClient();
  
  // 1. Get Current User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (data.workout_id) {
    const { data: workout } = await supabase
      .from("workouts")
      .select("id")
      .eq("id", data.workout_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!workout) throw new Error("Forbidden");
  }

  // 2. Prepare Payload
  const paceValue =
    data.average_pace ??
    (data.distance_km && data.duration_minutes
      ? formatPace(calculatePaceMinutesPerKm(data.distance_km, data.duration_minutes))
      : null);

  const payload: CardioLogInsert = {
    ...data,
    user_id: user.id,
    date: data.date || new Date().toISOString(),
    average_pace: paceValue,
  };

  // 3. Upsert
  const { error } = await supabase
    .from("cardio_logs")
    .upsert(payload)
    .select();

  if (error) {
    console.error("Cardio Log Error:", error);
    throw new Error(error.message);
  }

  // 4. Revalidate
  if (data.workout_id) {
      revalidatePath(`/workouts/${data.workout_id}`);
  }
  
  // <--- NEW: Update the global progress view immediately
  revalidatePath("/progress"); 
}

export async function deleteCardioLog(id: string, workoutId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: ownedWorkout } = await supabase
      .from("workouts")
      .select("id")
      .eq("id", workoutId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!ownedWorkout) throw new Error("Forbidden");
    
    const { error } = await supabase
      .from("cardio_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  
    if (error) throw new Error(error.message);
  
    revalidatePath(`/workouts/${workoutId}`);
    
    // <--- NEW: Update the global progress view immediately
    revalidatePath("/progress");
}
