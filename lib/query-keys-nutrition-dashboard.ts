import { nutritionKeys } from "@/lib/query-keys-nutrition";
import type { NutritionSubject } from "@/lib/query-keys-nutrition";

export const nutritionDashboardKeys = {
  all: nutritionKeys.dashboard,
  summary: (subject?: NutritionSubject, date?: string, mealGroupId?: string | null) =>
    nutritionKeys.dashboardSummary(subject, date, mealGroupId),
  activity: (subject?: NutritionSubject, limit = 10, mealGroupId?: string | null) =>
    nutritionKeys.dashboardActivity(subject, limit, mealGroupId),
};
