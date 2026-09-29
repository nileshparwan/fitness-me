import { Skeleton } from "@/components/ui/skeleton";

export function BodyTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[12px]" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-[14px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}
