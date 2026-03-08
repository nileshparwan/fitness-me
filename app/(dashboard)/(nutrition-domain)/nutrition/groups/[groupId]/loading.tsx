import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionGroupsDetailLoading() {
  return (
    <div className="page-shell space-y-4 md:space-y-5">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}
