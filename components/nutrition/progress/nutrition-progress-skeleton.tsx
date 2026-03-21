"use client";

import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

type NutritionProgressSkeletonProps = {
  showHeader?: boolean;
};

export function NutritionProgressSkeleton({
  showHeader = true,
}: NutritionProgressSkeletonProps) {
  return (
    <div className="section-gap">
      {showHeader ? (
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/30">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-lg sm:w-72" />
              <Skeleton className="h-4 w-52 rounded-lg" />
            </div>
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={`card-${index}`} className="h-24 rounded-[10px]" />
        ))}
      </div>

      <Skeleton className="h-80 rounded-[26px]" />
      <Skeleton className="h-80 rounded-[26px]" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[26px]" />
        <Skeleton className="h-64 rounded-[26px]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-[26px]" />
        <Skeleton className="h-72 rounded-[26px]" />
      </div>

      <Skeleton className="h-72 rounded-[26px]" />
      <Skeleton className="h-52 rounded-[26px]" />
    </div>
  );
}

export default NutritionProgressSkeleton;
