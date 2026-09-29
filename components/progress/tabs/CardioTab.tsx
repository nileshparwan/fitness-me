"use client";

import { Footprints, HeartPulse, Route, Timer } from "lucide-react";

import type { ProgressOverviewBundle } from "@/app/actions/progress-overview";
import { CardioProgress } from "@/components/progress/CardioProgress";
import { CardioTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayDistance } from "@/utils/unit-conversion";

type CardioTabProps = {
  bundle: ProgressOverviewBundle | undefined;
  isLoading: boolean;
  compare: boolean;
};

function Card({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Timer;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-[#10182c]/85 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]">
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function CardioTab({ bundle, isLoading, compare }: CardioTabProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (isLoading && !bundle) {
    return <CardioTabSkeleton />;
  }

  const totalDistanceKm =
    bundle?.cardio.current.series.reduce((sum, row) => sum + (row.distance ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Cardio Time" value={`${Math.round(bundle?.summary.cardio_time_minutes ?? 0)} min`} icon={Timer} tone="text-[#5b9cff]" />
        <Card
          label="Distance"
          value={`${displayDistance(totalDistanceKm, system)?.toFixed(1) ?? "0.0"} ${labels.distance}`}
          icon={Route}
          tone="text-[#5ed28f]"
        />
        <Card
          label="Avg Steps/Day"
          value={
            bundle?.summary.avg_steps_per_day !== null && bundle?.summary.avg_steps_per_day !== undefined
              ? Math.round(bundle.summary.avg_steps_per_day).toLocaleString()
              : "—"
          }
          icon={Footprints}
          tone="text-[#efb241]"
        />
        <Card
          label="VO2 Max"
          value={bundle?.summary.vo2max_estimate !== null && bundle?.summary.vo2max_estimate !== undefined ? `${bundle.summary.vo2max_estimate}` : "—"}
          icon={HeartPulse}
          tone="text-[#e65778]"
        />
      </div>

      <CardioProgress
        data={bundle?.cardio.current ?? { series: [], activity_breakdown: [], hr_zones_summary: null }}
        compareData={bundle?.cardio.compare}
        compare={compare}
        isLoading={isLoading}
        vo2maxEstimate={bundle?.summary.vo2max_estimate ?? null}
      />
    </div>
  );
}

