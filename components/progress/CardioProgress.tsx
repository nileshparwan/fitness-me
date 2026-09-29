"use client";

import type { CardioProgressSeries } from "@/app/actions/progress-overview";
import { CardioProgressCard } from "@/components/progress/overview/cardio-progress-card";

type CardioProgressProps = {
  data: CardioProgressSeries;
  compareData?: CardioProgressSeries | null;
  compare: boolean;
  isLoading: boolean;
  vo2maxEstimate: number | null;
};

export function CardioProgress({
  data,
  compareData,
  compare,
  isLoading,
  vo2maxEstimate,
}: CardioProgressProps) {
  return (
    <CardioProgressCard
      data={data}
      compareData={compareData ?? undefined}
      compare={compare}
      isLoading={isLoading}
      vo2maxEstimate={vo2maxEstimate}
    />
  );
}

