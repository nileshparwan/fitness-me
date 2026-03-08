import { Skeleton } from "@/components/ui/skeleton";

export default function ClientNutritionLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
