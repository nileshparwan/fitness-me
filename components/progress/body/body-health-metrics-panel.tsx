"use client";

import { useMemo, useState } from "react";
import { Activity, Flame, Target, Zap } from "lucide-react";

import type { BodyHealthMetrics } from "@/lib/calculations/body-health";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

type BodyHealthMetricsPanelProps = {
  metrics: BodyHealthMetrics | null;
  isLoading?: boolean;
  compact?: boolean;
  dataAvailable?: boolean;
};

function MetricTile({
  label,
  value,
  helper,
  icon: Icon,
  badge,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: typeof Flame;
  badge?: string | null;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        {badge ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/80">
            {badge}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatKcal(value: number | null) {
  return value === null ? "—" : `${Math.round(value)} kcal`;
}

function formatMetric(value: number | null, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

export function BodyHealthMetricsPanel({
  metrics,
  isLoading = false,
  compact = false,
  dataAvailable = true,
}: BodyHealthMetricsPanelProps) {
  const [goal, setGoal] = useState<"reduction" | "maintain" | "gain">("maintain");
  const selectedCalories = useMemo(() => {
    if (!metrics) return null;
    return metrics.caloric_needs[goal];
  }, [goal, metrics]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[12px]" />
          ))}
        </div>
        {!compact ? <Skeleton className="h-36 rounded-[14px]" /> : null}
      </section>
    );
  }

  if (!metrics || !dataAvailable) {
    return (
      <section className="rounded-[16px] border border-white/10 bg-[#111a2f]/70 p-4">
        <h3 className="text-base font-semibold text-foreground">Metabolic Profile</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your height and date of birth in Settings to unlock metabolic calculations.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" asChild>
          <a href="/settings/profile">Open Profile Settings</a>
        </Button>
      </section>
    );
  }

  const idealHelper =
    metrics.weight_vs_ideal_kg === null
      ? "Ideal weight estimate"
      : metrics.weight_vs_ideal_kg === 0
        ? "At ideal"
        : `${metrics.weight_vs_ideal_kg > 0 ? "+" : ""}${metrics.weight_vs_ideal_kg} kg vs ideal`;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="BMR"
          value={formatKcal(metrics.bmr)}
          helper="Resting metabolic rate"
          icon={Flame}
        />
        <MetricTile
          label="TDEE"
          value={formatKcal(metrics.tdee)}
          helper="With current activity level"
          icon={Zap}
        />
        {!compact ? (
          <MetricTile
            label="Ideal Body Weight"
            value={formatMetric(metrics.ideal_body_weight_kg, " kg")}
            helper={idealHelper}
            icon={Target}
          />
        ) : null}
        <MetricTile
          label="BMI"
          value={formatMetric(metrics.bmi)}
          helper="Body mass index"
          badge={metrics.bmi_category}
          icon={Activity}
        />
      </div>

      {!compact ? (
        <div className="rounded-[14px] border border-white/10 bg-[#111a2f]/70 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Caloric Needs</h3>
              <p className="mt-1 text-sm text-muted-foreground">Switch goals to preview your daily target.</p>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 bg-[#131b2f]/75 p-1">
              {(["reduction", "maintain", "gain"] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={goal === item ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-8 rounded-lg px-3 capitalize")}
                  onClick={() => setGoal(item)}
                >
                  {item === "reduction" ? "Weight Loss" : item === "maintain" ? "Maintain" : "Gain"}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricTile label="Reduction" value={formatKcal(metrics.caloric_needs.reduction)} icon={Flame} />
            <MetricTile label="Maintain" value={formatKcal(metrics.caloric_needs.maintain)} icon={Zap} />
            <MetricTile label="Gain" value={formatKcal(metrics.caloric_needs.gain)} icon={Target} />
          </div>

          <div className="mt-4 rounded-[12px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Selected Goal</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatKcal(selectedCalories)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {goal === "reduction" ? "Moderate reduction target" : goal === "maintain" ? "Maintenance target" : "Lean gain target"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
