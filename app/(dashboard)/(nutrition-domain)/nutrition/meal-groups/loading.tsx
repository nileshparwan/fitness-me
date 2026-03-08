import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionMealGroupsLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    </div>
  );
}
