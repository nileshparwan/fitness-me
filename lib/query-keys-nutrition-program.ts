import { nutritionKeys } from "@/lib/query-keys-nutrition";

export const nutritionProgramKeys = {
  plans: nutritionKeys.programs,
  plan: nutritionKeys.programById,
  planOptions: nutritionKeys.programOptions,
  planMealsRoot: nutritionKeys.programMealsRoot,
  planMeals: nutritionKeys.programMealsByProgramId,
};
