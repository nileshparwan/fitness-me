import { Skeleton } from "@/components/ui/skeleton";

function DashboardCardSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`w-full rounded-3xl ${className}`} />;
}

export function ClientsDashboardSkeleton() {
  return (
    <div className="space-y-4 md:space-y-5">
      <section className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-32 rounded-xl" />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardCardSkeleton className="h-32" />
        <DashboardCardSkeleton className="h-32" />
        <DashboardCardSkeleton className="h-32" />
        <DashboardCardSkeleton className="h-32" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <DashboardCardSkeleton className="h-64" />
          <DashboardCardSkeleton className="h-72" />
          <DashboardCardSkeleton className="h-96" />
        </div>
        <div className="space-y-4">
          <DashboardCardSkeleton className="h-80" />
          <DashboardCardSkeleton className="h-72" />
          <DashboardCardSkeleton className="h-60" />
          <DashboardCardSkeleton className="h-52" />
        </div>
      </section>
    </div>
  );
}

