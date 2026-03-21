import { Skeleton } from "@/components/ui/skeleton";

export default function ClientTrainingLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-28 w-full rounded-[10px]" />
      <Skeleton className="h-24 w-full rounded-[10px]" />
      <Skeleton className="h-72 w-full rounded-[10px]" />
      <Skeleton className="h-64 w-full rounded-[10px]" />
    </div>
  );
}
