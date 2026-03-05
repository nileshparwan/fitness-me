import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionPlansLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
