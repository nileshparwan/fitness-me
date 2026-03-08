import { MealPlannerSkeleton } from "@/components/nutrition/meal-planner/meal-planner-skeleton";

export default function NutritionMealPlannerLoading() {
  return (
    <div className="page-shell">
      <MealPlannerSkeleton />
    </div>
  );
}
