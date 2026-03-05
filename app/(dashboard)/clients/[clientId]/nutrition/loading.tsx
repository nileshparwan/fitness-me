import { Skeleton } from "@/components/ui/skeleton";

export default function ClientNutritionLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
