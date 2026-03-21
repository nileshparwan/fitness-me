import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-28 w-full rounded-[10px]" />
      <Skeleton className="h-80 w-full rounded-[10px]" />
    </div>
  );
}
