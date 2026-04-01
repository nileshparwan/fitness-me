import { Skeleton } from "@/components/ui/skeleton";

export function ManualNutritionDiarySkeleton() {
  return (
    <div className="space-y-4 py-2">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
