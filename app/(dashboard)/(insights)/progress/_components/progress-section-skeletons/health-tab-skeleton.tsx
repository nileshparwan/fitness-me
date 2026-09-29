import { Skeleton } from "@/components/ui/skeleton";

export function HealthTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[12px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[280px] rounded-xl md:h-[320px]" />
        ))}
      </div>
    </div>
  );
}
