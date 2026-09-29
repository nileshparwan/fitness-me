"use client";

import type { StrengthProgressData } from "@/app/actions/progress-overview";
import { StrengthProgressCard } from "@/components/progress/overview/strength-progress-card";

type StrengthProgressProps = {
  data: StrengthProgressData | undefined;
  compareData?: StrengthProgressData | null;
  compare: boolean;
  isLoading: boolean;
  latestWeightKg: number | null;
};

export function StrengthProgress({
  data,
  compareData,
  compare,
  isLoading,
  latestWeightKg,
}: StrengthProgressProps) {
  return (
    <StrengthProgressCard
      data={data}
      compareData={compareData ?? undefined}
      compare={compare}
      isLoading={isLoading}
      latestWeightKg={latestWeightKg}
    />
  );
}

