import { Skeleton } from "@/components/ui/skeleton";

export default function CoachPlansLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-20 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
