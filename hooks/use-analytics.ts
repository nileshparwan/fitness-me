"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useAnalytics() {
  const supabase = createClient();

  // 1. Overall Workout Stats
  const workoutStats = useQuery({
    queryKey: ["analytics", "workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_summary") // Using the SQL View
        .select("*")
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // 2. Specific Exercise Progress (e.g., Bench Press Max over time)
  const getExerciseProgress = (exerciseName: string) => useQuery({
    queryKey: ["analytics", "exercise", exerciseName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_progress") // Using the SQL View
        .select("*")
        .eq("exercise_name", exerciseName)
        .order("date", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!exerciseName,
  });

  return { workoutStats, getExerciseProgress };
}