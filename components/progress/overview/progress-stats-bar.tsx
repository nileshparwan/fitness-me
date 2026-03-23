"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";
import type { ProgressSummaryStats, ProgressTrainingType } from "@/app/actions/progress-overview";

type Props = {
  data: ProgressSummaryStats | undefined;
  isLoading: boolean;
  trainingType: ProgressTrainingType;
};

function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return `${Math.round(value)}`;
}

function valueClass(value: number) {
  if (value >= 80) return "text-[#5ed28f]";
  if (value >= 60) return "text-[#efb241]";
  return "text-foreground";
}

function weightClass(delta: number | null) {
  if (delta === null || delta === 0) return "text-foreground";
  return delta < 0 ? "text-[#5ed28f]" : "text-[#e45f7a]";
}

function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-[12px] border border-white/10 bg-[#131b2f]/75 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold leading-none", className)}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function ProgressStatsBar({ data, isLoading, trainingType }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[96px] rounded-[12px]" />
        ))}
      </div>
    );
  }

  const volumeSuppressed = trainingType === "cardio";
  const rpeSuppressed = trainingType === "cardio";
  const cardioSuppressed = trainingType === "strength";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      <StatTile label="Sessions" value={data ? `${data.sessions}` : "0"} />
      <StatTile
        label="Completion"
        value={data ? `${data.completion_pct}%` : "0%"}
        className={data ? valueClass(data.completion_pct) : undefined}
      />
      <StatTile
        label="Avg RPE"
        value={rpeSuppressed ? "—" : data?.avg_rpe !== null && data?.avg_rpe !== undefined ? `${data.avg_rpe}` : "—"}
      />
      <StatTile
        label="Volume"
        value={volumeSuppressed ? "—" : data ? formatCompactNumber(data.volume_kg) : "0"}
        className={volumeSuppressed ? undefined : "text-[#5b9cff]"}
        sub={volumeSuppressed ? undefined : "kg total"}
      />
      <StatTile
        label="Cardio Time"
        value={cardioSuppressed ? "—" : data ? `${Math.round(data.cardio_time_minutes)}m` : "0m"}
      />
      <StatTile
        label="Steps/Day"
        value={data?.avg_steps_per_day ? `${Math.round(data.avg_steps_per_day).toLocaleString()}` : "—"}
      />
      <StatTile
        label="Weight"
        value={data?.latest_weight_kg !== null && data?.latest_weight_kg !== undefined ? `${data.latest_weight_kg.toFixed(1)} kg` : "—"}
        className={weightClass(data?.weight_delta_kg ?? null)}
        sub={
          data?.weight_delta_kg !== null && data?.weight_delta_kg !== undefined
            ? `${data.weight_delta_kg > 0 ? "+" : ""}${data.weight_delta_kg.toFixed(1)} kg vs prior`
            : undefined
        }
      />
      <StatTile
        label="VO2 Max"
        value={data?.vo2max_estimate !== null && data?.vo2max_estimate !== undefined ? `${data.vo2max_estimate}` : "—"}
        className="text-[#5b9cff]"
        sub={
          data?.vo2max_delta !== null && data?.vo2max_delta !== undefined
            ? `${data.vo2max_delta > 0 ? "↑" : "↓"} ${Math.abs(data.vo2max_delta).toFixed(1)} vs prior`
            : "ml/kg/min"
        }
      />
    </div>
  );
}
