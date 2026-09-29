"use client";

import { Activity, Brain, Heart, Moon, Zap } from "lucide-react";

import type { ProgressOverviewBundle } from "@/app/actions/progress-overview";
import { HealthRecoveryChart } from "@/components/progress/health/health-recovery-chart";
import { HealthSleepCard } from "@/components/progress/health/health-sleep-card";
import { HealthStepsCard } from "@/components/progress/health/health-steps-card";
import { HealthVitalsCard } from "@/components/progress/health/health-vitals-card";
import { WellnessSnapshot } from "@/components/progress/overview/wellness-snapshot";
import { HealthTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";

type HealthTabProps = {
  bundle: ProgressOverviewBundle | undefined;
  isLoading: boolean;
};

function avg(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function Kpi({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-[#10182c]/85 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export function HealthTab({ bundle, isLoading }: HealthTabProps) {
  if (isLoading && !bundle) {
    return <HealthTabSkeleton />;
  }

  const compliance = bundle?.compliance.current;
  const latestSleep = compliance?.last_sleep_hours ?? null;
  const avgSleep = avg((compliance?.sleep_series ?? []).map((row) => row.sleep_hours));
  const avgStress = avg((compliance?.stress_series ?? []).map((row) => row.stress_level));
  const avgSteps = avg((compliance?.steps_series ?? []).map((row) => row.steps));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Recovery Score"
          value={compliance?.recovery_score !== null && compliance?.recovery_score !== undefined ? `${compliance.recovery_score}%` : "—"}
          helper="Latest readiness reading"
          icon={Activity}
          tone="text-[#5ed28f]"
        />
        <Kpi
          label="Sleep"
          value={latestSleep !== null ? `${latestSleep.toFixed(1)}h` : "—"}
          helper={avgSleep !== null ? `Average ${avgSleep.toFixed(1)}h` : "No sleep data"}
          icon={Moon}
          tone="text-[#9f88f0]"
        />
        <Kpi
          label="HRV"
          value={compliance?.last_hrv_ms !== null && compliance?.last_hrv_ms !== undefined ? `${compliance.last_hrv_ms} ms` : "—"}
          helper="Latest HRV"
          icon={Heart}
          tone="text-[#5b9cff]"
        />
        <Kpi
          label="Stress"
          value={avgStress !== null ? `${avgStress.toFixed(1)}/10` : "—"}
          helper="Average stress level"
          icon={Brain}
          tone="text-[#efb241]"
        />
        <Kpi
          label="Steps"
          value={avgSteps !== null ? Math.round(avgSteps).toLocaleString() : "—"}
          helper="Average daily steps"
          icon={Zap}
          tone="text-[#e65778]"
        />
      </div>

      <div className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-4">
        <h3 className="text-lg font-semibold text-foreground">Wellness Snapshot</h3>
        <div className="mt-4">
          <WellnessSnapshot summary={bundle?.summary} compliance={compliance} isLoading={isLoading} />
        </div>
      </div>

      <HealthRecoveryChart data={compliance} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <HealthSleepCard data={compliance} isLoading={isLoading} />
        <HealthVitalsCard data={compliance} isLoading={isLoading} />
        <HealthStepsCard data={compliance} isLoading={isLoading} />
      </div>
    </div>
  );
}

