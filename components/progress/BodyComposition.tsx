"use client";

import type { BodyCompositionSeries } from "@/app/actions/progress-overview";
import { BodyCompositionCard } from "@/components/progress/overview/body-composition-card";

type BodyCompositionProps = {
  series: BodyCompositionSeries;
  compareSeries?: BodyCompositionSeries | null;
  compare: boolean;
  isLoading: boolean;
};

export function BodyComposition({
  series,
  compareSeries,
  compare,
  isLoading,
}: BodyCompositionProps) {
  return (
    <BodyCompositionCard
      series={series}
      compareSeries={compareSeries ?? undefined}
      compare={compare}
      isLoading={isLoading}
    />
  );
}

