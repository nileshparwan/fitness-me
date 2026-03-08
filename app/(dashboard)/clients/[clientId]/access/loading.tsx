import { Skeleton } from "@/components/ui/skeleton";

export default function ClientAccessLoading() {
  return (
    <div className="page-shell space-y-4">
      <Skeleton className="h-20 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
