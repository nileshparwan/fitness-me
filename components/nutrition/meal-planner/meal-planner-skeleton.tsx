import { Skeleton } from "@/components/ui/skeleton";

export function MealPlannerSkeleton() {
  return (
    <div className="section-gap">
      <section className="glass-surface surface-pad space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56 rounded-xl" />
            <Skeleton className="h-5 w-44 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-16 rounded-[10px]" />
          ))}
        </div>
      </section>

      <Skeleton className="h-20 w-full rounded-[10px]" />

      <section className="space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-[10px]" />
        ))}
      </section>

      <section className="glass-surface surface-pad space-y-3">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-44 w-full rounded-[10px]" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </section>
    </div>
  );
}
