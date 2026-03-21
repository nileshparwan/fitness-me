import type { MealGroupSubject } from "@/lib/query-keys-nutrition";

export type NutritionProgressRange = 7 | 30 | 90;

export type NutritionProgressInput = {
  range: NutritionProgressRange;
  subject?: MealGroupSubject;
  start_date?: string;
  end_date?: string;
};

export type NutritionInsight = {
  id: string;
  type: "success" | "warning" | "info";
  text: string;
};

export type NutritionProgressDayRow = {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  deficit_surplus: number;
  rolling_avg_7: number | null;
};

export type NutritionProgressTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "plan_assignment" | "fitness_goal" | "none";
  plan_name: string | null;
};

export type NutritionProgressMealBreakdown = {
  type: string;
  calories: number;
  pct: number;
};

export type NutritionProgressTopFood = {
  name: string;
  count: number;
  avg_calories: number;
};

export type NutritionProgressDeltas = {
  avg_calories: number | null;
  avg_protein_g: number | null;
  avg_carbs_g: number | null;
  avg_fat_g: number | null;
  compliance_score: number | null;
};

export type NutritionProgressData = {
  range: NutritionProgressRange;
  start_date: string;
  end_date: string;
  days_in_range: number;
  days_logged: number;
  logging_streak: number;

  targets: NutritionProgressTargets;

  avg_calories: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  avg_fiber_g: number;

  compliance_score: number;
  cal_compliance: number;
  protein_compliance: number;
  carbs_compliance: number;
  fat_compliance: number;

  total_calories: number;
  total_deficit_surplus: number;

  protein_pct_of_calories: number;
  carbs_pct_of_calories: number;
  fat_pct_of_calories: number;

  weekday_avg_calories: number;
  weekend_avg_calories: number;

  daily_rows: NutritionProgressDayRow[];
  meal_breakdown: NutritionProgressMealBreakdown[];
  top_foods: NutritionProgressTopFood[];
  deltas: NutritionProgressDeltas;

  daily_compliance: {
    date: string;
    level:
      | "logged_on_target"
      | "logged_off_target"
      | "partial_log"
      | "logged_no_target"
      | "not_logged";
  }[];
  dow_avg_calories: { dow: number; label: string; avg: number }[];
  cumulative_rows: { date: string; cumulative: number }[];
  avg_first_meal_time: string | null;
  avg_last_meal_time: string | null;
  avg_eating_window_minutes: number | null;
  late_meal_days: number;
  perfect_days: number;
  longest_streak: number;
  insights: NutritionInsight[];
};
