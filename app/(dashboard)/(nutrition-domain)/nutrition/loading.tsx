import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
