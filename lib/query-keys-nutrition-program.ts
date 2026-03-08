export const nutritionProgramKeys = {
  plans: () => ["meal_plans"] as const,
  plan: (programId: string) => [...nutritionProgramKeys.plans(), programId] as const,
  planOptions: () => [...nutritionProgramKeys.plans(), "options"] as const,
  planMealsRoot: () => ["meal_plan_meals"] as const,
  planMeals: (programId: string) =>
    [...nutritionProgramKeys.planMealsRoot(), { program_id: programId }] as const,
};
