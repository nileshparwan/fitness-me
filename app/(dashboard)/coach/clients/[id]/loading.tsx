import { Skeleton } from "@/components/ui/skeleton";

export default function CoachClientDetailLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
