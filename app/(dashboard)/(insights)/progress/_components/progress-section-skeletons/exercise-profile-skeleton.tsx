import { Skeleton } from "@/components/ui/skeleton";

export function ExerciseProfileSkeleton() {
  return (
    <div className="native-surface surface-pad">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl md:h-36" />
        <div className="space-y-3 md:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
