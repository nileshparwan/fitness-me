"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Define the exact shape required by your DB
type CardioLogInsert = {
  id?: string;
  workout_id?: string | null;
  user_id: string;
  activity_type: string;
  date?: string;
  duration_minutes: number;
  distance_km?: number | null;
  calories_burned?: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  average_pace?: string | null;
  elevation_gain_m?: number | null;
  reps?: number | null;
  notes?: string | null;
};

export async function upsertCardioLog(data: Omit<CardioLogInsert, "user_id">) {
  const supabase = await createClient();
  
  // 1. Get Current User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Prepare Payload
  const payload: CardioLogInsert = {
    ...data,
    user_id: user.id,
    date: data.date || new Date().toISOString(),
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
        revalidatePath(`/workouts/${data.workout_id}/cardio`); // Add this line
    }
}

export async function deleteCardioLog(id: string, workoutId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("cardio_logs")
      .delete()
      .eq("id", id);
  
    if (error) throw new Error(error.message);
  
    revalidatePath(`/workouts/${workoutId}`);
  }