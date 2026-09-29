"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import type { ProgressSummaryStats, ProgressTrainingType } from "@/app/actions/progress-overview";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type KPICardsProps = {
  data: ProgressSummaryStats | null | undefined;
  compareData?: ProgressSummaryStats | null;
  comparePrevious: boolean;
  trainingType?: ProgressTrainingType;
};

type KPIItem = {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  accent?: string;
};

function formatCompact(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return `${Math.round(value)}`;
}

function Delta({
  value,
  suffix,
}: {
  value?: number | null;
  suffix?: string;
}) {
  if (value === null || value === undefined) return null;

  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive ? "text-[#5ed28f]" : negative ? "text-[#e65778]" : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}
      {suffix ?? ""}
    </span>
  );
}

function KPI({
  item,
  comparePrevious,
}: {
  item: KPIItem;
  comparePrevious: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-[#10182c]/85 p-4 transition-colors hover:border-white/15">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className={`text-2xl font-semibold leading-none ${item.accent ?? "text-foreground"}`}>{item.value}</p>
        {comparePrevious ? <Delta value={item.delta} suffix={item.deltaSuffix} /> : null}
      </div>
    </div>
  );
}

export function KPICards({
  data,
  compareData,
  comparePrevious,
  trainingType = "mixed",
}: KPICardsProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  const volumeSuppressed = trainingType === "cardio";
  const cardioSuppressed = trainingType === "strength";
  const rpeSuppressed = trainingType === "cardio";

  const items: KPIItem[] = [
    {
      label: "Sessions",
      value: `${data?.sessions ?? 0}`,
      delta:
        data?.sessions !== undefined && compareData?.sessions !== undefined
          ? data.sessions - compareData.sessions
          : null,
    },
    {
      label: "Completion",
      value: `${data?.completion_pct ?? 0}%`,
      delta:
        data?.completion_pct !== undefined && compareData?.completion_pct !== undefined
          ? data.completion_pct - compareData.completion_pct
          : null,
      deltaSuffix: "%",
      accent: "text-[#5ed28f]",
    },
    {
      label: "Avg RPE",
      value:
        rpeSuppressed || data?.avg_rpe === null || data?.avg_rpe === undefined
          ? "—"
          : `${data.avg_rpe.toFixed(1)}`,
      delta:
        rpeSuppressed ||
        data?.avg_rpe === null ||
        data?.avg_rpe === undefined ||
        compareData?.avg_rpe === null ||
        compareData?.avg_rpe === undefined
          ? null
          : data.avg_rpe - compareData.avg_rpe,
    },
    {
      label: "Volume",
      value:
        volumeSuppressed || !data
          ? "—"
          : `${formatCompact(displayWeight(data.volume_kg, system) ?? 0)} ${labels.weight}`,
      delta:
        volumeSuppressed || !data || !compareData
          ? null
          : (displayWeight(data.volume_kg, system) ?? 0) - (displayWeight(compareData.volume_kg, system) ?? 0),
      deltaSuffix: labels.weight,
      accent: "text-[#5b9cff]",
    },
    {
      label: "Cardio Time",
      value: cardioSuppressed || !data ? "—" : `${Math.round(data.cardio_time_minutes)}m`,
      delta:
        cardioSuppressed || !data || !compareData
          ? null
          : data.cardio_time_minutes - compareData.cardio_time_minutes,
      deltaSuffix: "m",
    },
    {
      label: "Steps/Day",
      value:
        data?.avg_steps_per_day !== null && data?.avg_steps_per_day !== undefined
          ? `${Math.round(data.avg_steps_per_day).toLocaleString()}`
          : "—",
      delta:
        data?.avg_steps_per_day !== null &&
        data?.avg_steps_per_day !== undefined &&
        compareData?.avg_steps_per_day !== null &&
        compareData?.avg_steps_per_day !== undefined
          ? data.avg_steps_per_day - compareData.avg_steps_per_day
          : null,
    },
    {
      label: "Weight",
      value:
        data?.latest_weight !== null && data?.latest_weight !== undefined
          ? `${displayWeight(data.latest_weight, system)?.toFixed(1)} ${labels.weight}`
          : "—",
      delta:
        data?.latest_weight !== null &&
        data?.latest_weight !== undefined &&
        compareData?.latest_weight !== null &&
        compareData?.latest_weight !== undefined
          ? (displayWeight(data.latest_weight, system) ?? 0) - (displayWeight(compareData.latest_weight, system) ?? 0)
          : null,
      deltaSuffix: labels.weight,
      accent:
        data?.weight_delta_kg !== null && data?.weight_delta_kg !== undefined
          ? data.weight_delta_kg <= 0
            ? "text-[#5ed28f]"
            : "text-[#efb241]"
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <KPI key={item.label} item={item} comparePrevious={comparePrevious} />
      ))}
    </div>
  );
}

