import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-32 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[12px]" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-[320px] rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[320px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
