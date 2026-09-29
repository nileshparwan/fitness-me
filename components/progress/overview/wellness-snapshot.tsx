"use client";

import { useMemo } from "react";
import { Activity, Brain, Droplets, Footprints, MoonStar, Signal } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";
import type { ComplianceRecoveryData, ProgressSummaryStats } from "@/app/actions/progress-overview";

type WellnessSnapshotProps = {
  summary: ProgressSummaryStats | undefined;
  compliance: ComplianceRecoveryData | undefined;
  isLoading: boolean;
};

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function WellnessTile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Activity;
  accent: string;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3">
      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 h-10 w-1 rounded-full", accent)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function WellnessSnapshot({ summary, compliance, isLoading }: WellnessSnapshotProps) {
  const avgSleep = useMemo(
    () => average((compliance?.sleep_series || []).flatMap((row) => (row.sleep_hours !== null ? [row.sleep_hours] : []))),
    [compliance?.sleep_series]
  );
  const avgStress = useMemo(
    () => average((compliance?.stress_series || []).flatMap((row) => (row.stress_level !== null ? [row.stress_level] : []))),
    [compliance?.stress_series]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[12px]" />
        ))}
      </div>
    );
  }

  const latestSleep = compliance?.sleep_series.at(-1)?.sleep_hours ?? null;
  const latestStress = compliance?.stress_series.at(-1)?.stress_level ?? null;
  const avgSteps = summary?.avg_steps_per_day ?? null;
  const totalSessions = (compliance?.workouts_per_week || []).reduce((sum, row) => sum + row.session_count, 0);
  const activeMinutes = totalSessions > 0 ? Math.round((summary?.cardio_time_minutes ?? 0) / totalSessions) : null;

  const cards = [
    {
      label: "Recovery",
      value: compliance?.recovery_score !== null && compliance?.recovery_score !== undefined ? `${compliance.recovery_score}%` : "—",
      sub: compliance?.last_hrv_ms ? `HRV ${compliance.last_hrv_ms} ms` : "Recovery trend",
      icon: Signal,
      accent: "bg-emerald-400",
    },
    {
      label: "Avg Sleep",
      value: avgSleep !== null ? `${avgSleep.toFixed(1)}h` : "—",
      sub: latestSleep !== null ? `Last night ${latestSleep.toFixed(1)}h` : "Sleep trend unavailable",
      icon: MoonStar,
      accent: "bg-violet-400",
    },
    {
      label: "Stress",
      value: avgStress !== null ? `${avgStress.toFixed(1)}/10` : "—",
      sub: latestStress !== null ? `Latest ${latestStress.toFixed(1)}/10` : "Stress trend unavailable",
      icon: Brain,
      accent: "bg-amber-400",
    },
    {
      label: "Hydration",
      value: compliance?.sleep_score_avg !== null && compliance?.sleep_score_avg !== undefined ? `${compliance.sleep_score_avg}%` : "—",
      sub: "Recovery-support proxy",
      icon: Droplets,
      accent: "bg-sky-400",
    },
    {
      label: "Daily Steps",
      value: avgSteps !== null ? `${Math.round(avgSteps).toLocaleString()}` : "—",
      sub: "Average per day",
      icon: Footprints,
      accent: "bg-cyan-400",
    },
    {
      label: "Active Minutes",
      value: activeMinutes !== null ? `${activeMinutes}m` : "—",
      sub: `${summary?.sessions ?? 0} sessions in range`,
      icon: Activity,
      accent: "bg-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <WellnessTile key={card.label} {...card} />
      ))}
    </div>
  );
}
