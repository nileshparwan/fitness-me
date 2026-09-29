"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function MuscleBodyMapSkeleton() {
  return (
    <div className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-[280px] rounded-[14px] md:h-[320px]" />
        <Skeleton className="h-[280px] rounded-[14px] md:h-[320px]" />
      </div>
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}
