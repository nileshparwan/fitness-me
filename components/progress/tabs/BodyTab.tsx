"use client";

import type { ProgressOverviewBundle } from "@/app/actions/progress-overview";
import { BodyComposition } from "@/components/progress/BodyComposition";
import { HumanBodyMap } from "@/components/progress/HumanBodyMap";
import { BodyHealthMetricsPanel } from "@/components/progress/body/body-health-metrics-panel";
import { BodyTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";

type BodyTabProps = {
  bundle: ProgressOverviewBundle | undefined;
  isLoading: boolean;
  compare: boolean;
};

export function BodyTab({ bundle, isLoading, compare }: BodyTabProps) {
  if (isLoading && !bundle) {
    return <BodyTabSkeleton />;
  }

  return (
    <div className="space-y-6">
      <BodyHealthMetricsPanel
        metrics={bundle?.bodyHealth?.metrics ?? null}
        dataAvailable={bundle?.bodyHealth?.data_available ?? true}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <BodyComposition
          series={bundle?.body_composition.current ?? []}
          compareSeries={bundle?.body_composition.compare}
          compare={compare}
          isLoading={isLoading}
        />
        <HumanBodyMap
          muscles={bundle?.muscleActivation ?? []}
          title="Body Focus Map"
          description="Your recent training emphasis translated onto the body map."
        />
      </div>
    </div>
  );
}

