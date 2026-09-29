import { Skeleton } from "@/components/ui/skeleton";

export function StrengthTabSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Skeleton className="h-[360px] rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
    </div>
  );
}
