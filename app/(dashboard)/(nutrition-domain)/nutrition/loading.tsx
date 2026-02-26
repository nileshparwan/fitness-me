import { Skeleton } from "@/components/ui/skeleton";

export default function NutritionLoading() {
  return (
    <div className="page-shell section-gap max-w-[1600px] mx-auto">
      <div className="native-surface md:desktop-surface surface-pad h-[96px]" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[130px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
