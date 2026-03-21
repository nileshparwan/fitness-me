import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-32 w-full rounded-[10px]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
      </div>
      <Skeleton className="h-36 w-full rounded-[10px]" />
      <Skeleton className="h-36 w-full rounded-[10px]" />
      <Skeleton className="h-36 w-full rounded-[10px]" />
    </div>
  );
}
