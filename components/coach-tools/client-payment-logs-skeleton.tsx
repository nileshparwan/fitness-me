import { Skeleton } from "@/components/ui/skeleton";

export function ClientPaymentLogsSkeleton() {
  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-2">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`client-payment-kpi-${index}`} className="h-24 rounded-[10px]" />
        ))}
      </section>

      <section className="rounded-[10px] border border-border/60 p-3 md:p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        <div className="hidden space-y-2 md:block">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={`client-payment-row-${index}`} className="h-10 w-full rounded-lg" />
          ))}
        </div>

        <div className="space-y-2 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`client-payment-mobile-${index}`} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </section>

      <section className="rounded-[10px] border border-border/60 p-4">
        <Skeleton className="mb-3 h-5 w-48 rounded-md" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`client-payment-history-${index}`} className="mb-2 h-14 w-full rounded-xl" />
        ))}
      </section>
    </div>
  );
}
