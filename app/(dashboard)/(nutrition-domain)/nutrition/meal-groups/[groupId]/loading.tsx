import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionMealGroupDetailLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
