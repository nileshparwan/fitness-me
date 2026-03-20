import { Skeleton } from "@/components/ui/skeleton";
import { getGreeting, getTodayLabel } from "@/lib/nutrition/greeting";

export function NutritionHeroSkeleton() {
  return (
    <section className="glass-surface surface-pad space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-44 rounded-xl" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      <div className="hidden gap-6 md:flex md:items-center">
        <Skeleton className="mx-auto h-44 w-44 shrink-0 rounded-full sm:h-48 sm:w-48" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 md:hidden">
        <Skeleton className="h-36 w-36 rounded-full" />
        <div className="w-full space-y-3">
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </div>
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-16 flex-1 rounded-2xl" />
        <Skeleton className="h-16 flex-1 rounded-2xl" />
        <Skeleton className="h-16 flex-1 rounded-2xl" />
      </div>
    </section>
  );
}

export function ActivitySectionSkeleton() {
  return (
    <section className="glass-surface surface-pad space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-40 rounded-xl" />
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
      <div className="divide-y divide-border/30 rounded-2xl border border-border/60 bg-card/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function NutritionDashboardSkeleton() {
  return (
    <div className="section-gap">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
        <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
      </section>

      <NutritionHeroSkeleton />

      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
        <Skeleton className="col-span-2 h-11 rounded-xl md:col-auto md:min-w-[140px] md:flex-none" />
        <Skeleton className="h-11 rounded-xl md:flex-1" />
        <Skeleton className="h-11 rounded-xl md:flex-1" />
        <Skeleton className="h-11 rounded-xl md:flex-1" />
      </div>

      <ActivitySectionSkeleton />
    </div>
  );
}
