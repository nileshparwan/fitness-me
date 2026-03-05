import { Skeleton } from "@/components/ui/skeleton";

export default function CoachClientsLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
