import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutsLoading() {
  return (
    <div className="page-shell section-gap">
      <div className="native-surface md:desktop-surface surface-pad h-[96px]" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
