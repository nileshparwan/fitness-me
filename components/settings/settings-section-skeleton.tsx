import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSectionSkeleton() {
  return (
    <section className="native-surface surface-pad stack-gap">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40 rounded-md" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </section>
  );
}
