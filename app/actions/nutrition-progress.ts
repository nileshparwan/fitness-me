"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { NutritionProgram, NutritionMeal } from "@/types/nutrition";

export interface GoalData {
  daily_calories?: number;
  target_weight?: number;
  goal_type?: string;
}

export async function getProgressData() {
  return runTrackedAction({
    eventName: "nutrition.progress.read",
    action: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: programs } = await supabase
        .from("meal_plans")
        .select(`*, meal_plan_meals (*)`)
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      const { data: goals } = await supabase
        .from("fitness_goals")
        .select("daily_calories, target_weight, goal_type")
        .eq("user_id", user.id)
        .single();

      return {
        programs: (programs || []) as (NutritionProgram & { meal_plan_meals: NutritionMeal[] })[],
        goals: (goals || null) as GoalData | null
      };
    },
  });
}
