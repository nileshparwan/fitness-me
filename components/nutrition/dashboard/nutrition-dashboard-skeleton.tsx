import { Skeleton } from "@/components/ui/skeleton";

export function NutritionDashboardSkeleton() {
  return (
    <div className="section-gap">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-5 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-52 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-lg" />
        </div>
        <div className="grid gap-3 md:hidden">
          <div className="grid grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] items-center gap-2">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>
        <div className="hidden gap-3 md:grid xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <Skeleton className="mx-auto h-44 w-44 rounded-full sm:h-48 sm:w-48" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-2">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </section>
    </div>
  );
}
