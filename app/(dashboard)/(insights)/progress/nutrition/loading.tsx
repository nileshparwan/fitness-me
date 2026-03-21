import { NutritionProgressSkeleton } from "@/components/nutrition/progress/nutrition-progress-skeleton";

export default function NutritionProgressLoading() {
  return (
    <div className="page-shell">
      <NutritionProgressSkeleton />
    </div>
  );
}
