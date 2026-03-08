import { NutritionDashboardSkeleton } from "@/components/nutrition/dashboard/nutrition-dashboard-skeleton";

export default function NutritionDashboardLoading() {
  return (
    <div className="page-shell">
      <NutritionDashboardSkeleton />
    </div>
  );
}
