"use server";

import { createClient } from "@/lib/supabase/server";

export type HistoryEntry = {
  date: string;
  type: 'strength' | 'cardio';
  weight: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  distance_km: number | null;
  duration_minutes: number | null;
  rpe: number | null;
};

export async function getExerciseHistory(exerciseName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("exercise_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching history:", error);
    return [];
  }

  // FIX: Cast to unknown first to bypass the mismatch error
  return data as unknown as HistoryEntry[];
}