"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnitLabels, useUnitSystem, useSettingsStore } from "@/stores/use-settings-store";
import { displayCircumference, displayWeight } from "@/utils/unit-conversion";
import { cn } from "@/utils";
import type { BodyCompositionSeries } from "@/app/actions/progress-overview";
import { getBodyFatCategory } from "@/utils/body-fat-ranges";

type Props = {
  series: BodyCompositionSeries;
  compareSeries?: BodyCompositionSeries;
  compare: boolean;
  isLoading: boolean;
};

type MetricKey =
  | "weight"
  | "body_fat_pct"
  | "waist"
  | "hips"
  | "chest"
  | "neck"
  | "bicep_left"
  | "bicep_right"
  | "thigh_left"
  | "thigh_right"
  | "calf";

type Metric = { key: MetricKey; label: string; color: string; unit: string; more?: boolean };

const BASE_METRICS: Array<Omit<Metric, "unit">> = [
  { key: "weight", label: "Weight", color: "#F472B6" },
  { key: "body_fat_pct", label: "Body Fat", color: "#4ADE80" },
  { key: "waist", label: "Waist", color: "#FBBF24" },
  { key: "hips", label: "Hips", color: "#60A5FA" },
  { key: "chest", label: "Chest", color: "#A78BFA" },
  { key: "neck", label: "Neck", color: "#06B6D4", more: true },
  { key: "bicep_left", label: "Bicep L", color: "#8B5CF6", more: true },
  { key: "bicep_right", label: "Bicep R", color: "#EC4899", more: true },
  { key: "thigh_left", label: "Thigh L", color: "#F97316", more: true },
  { key: "thigh_right", label: "Thigh R", color: "#14B8A6", more: true },
  { key: "calf", label: "Calf", color: "#84CC16", more: true },
];

const DEFAULT_ACTIVE: MetricKey[] = ["weight", "body_fat_pct"];
const GRID = "rgba(140,156,187,0.22)";

function formatDate(value: string) {
  return value.slice(5);
}

function convertPoint(
  row: BodyCompositionSeries[number],
  system: ReturnType<typeof useUnitSystem>
): BodyCompositionSeries[number] {
  return {
    ...row,
    weight: displayWeight(row.weight, system),
    waist: displayCircumference(row.waist, system),
    hips: displayCircumference(row.hips, system),
    chest: displayCircumference(row.chest, system),
    neck: displayCircumference(row.neck, system),
    bicep_left: displayCircumference(row.bicep_left, system),
    bicep_right: displayCircumference(row.bicep_right, system),
    thigh_left: displayCircumference(row.thigh_left, system),
    thigh_right: displayCircumference(row.thigh_right, system),
    calf: displayCircumference(row.calf, system),
  };
}

function convertMetricValue(key: MetricKey, value: number | null | undefined, system: ReturnType<typeof useUnitSystem>) {
  if (value === null || value === undefined) return null;
  switch (key) {
    case "weight":
      return displayWeight(value, system);
    case "body_fat_pct":
      return value;
    default:
      return displayCircumference(value, system);
  }
}

function BodyTooltip({
  active,
  payload,
  activeKeys,
  metrics,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, number | string | null> }>;
  activeKeys: MetricKey[];
  metrics: Metric[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-[12px] border border-white/15 bg-[#10192d]/95 px-3 py-2 text-xs shadow-2xl">
      <p className="mb-1 text-sm font-medium text-foreground">{String(row.date).slice(5)}</p>
      {activeKeys.map((key) => {
        const metric = metrics.find((item) => item.key === key);
        if (!metric) return null;
        const value = row[key];
        if (value === null || value === undefined) return null;
        return (
          <p key={key} style={{ color: metric.color }}>
            {metric.label} ({metric.unit}) : {value}
          </p>
        );
      })}
    </div>
  );
}

export function BodyCompositionCard({ series, compareSeries, compare, isLoading }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>(DEFAULT_ACTIVE);
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const gender = useSettingsStore((state) => state.gender);

  const metrics = useMemo<Metric[]>(
    () =>
      BASE_METRICS.map((metric) => ({
        ...metric,
        unit:
          metric.key === "weight"
            ? labels.weight
            : metric.key === "body_fat_pct"
              ? "%"
              : labels.circumference,
      })),
    [labels]
  );

  const availableMap = useMemo(() => {
    const map = new Map<MetricKey, boolean>();
    for (const metric of metrics) {
      const hasCurrent = series.some((row) => row[metric.key] !== null && row[metric.key] !== undefined);
      const hasCompare = compareSeries?.some((row) => row[metric.key] !== null && row[metric.key] !== undefined) ?? false;
      map.set(metric.key, hasCurrent || hasCompare);
    }
    return map;
  }, [series, compareSeries, metrics]);

  const chartRows = useMemo(() => {
    const byDate = new Map<string, Record<string, number | string | null>>();
    for (const row of series) {
      byDate.set(row.date, convertPoint(row, system));
    }
    if (compare && compareSeries) {
      for (const row of compareSeries) {
        const existing = (byDate.get(row.date) || convertPoint(row, system)) as Record<string, number | string | null>;
        for (const metric of metrics) {
          existing[`compare_${metric.key}`] = convertMetricValue(metric.key, row[metric.key], system);
        }
        byDate.set(row.date, existing);
      }
    }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [series, compareSeries, compare, metrics, system]);

  const yDomain = useMemo(() => {
    const values: number[] = [];
    for (const row of chartRows) {
      for (const key of activeKeys) {
        const value = row[key];
        if (typeof value === "number") values.push(value);
        if (compare) {
          const compareValue = row[`compare_${key}`];
          if (typeof compareValue === "number") values.push(compareValue);
        }
      }
    }
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min * 0.95), Math.ceil(max * 1.05)];
  }, [chartRows, activeKeys, compare]);

  const primaryMetrics = metrics.filter((metric) => !metric.more);
  const extraMetrics = metrics.filter((metric) => metric.more);
  const latestBodyFat = [...series].reverse().find((row) => row.body_fat_pct !== null && row.body_fat_pct !== undefined);
  const bodyFatCategory =
    gender && latestBodyFat?.body_fat_pct !== null && latestBodyFat?.body_fat_pct !== undefined
      ? getBodyFatCategory(latestBodyFat.body_fat_pct, gender)
      : null;

  if (isLoading) {
    return <Skeleton className="h-[520px] rounded-[16px]" />;
  }

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Body Composition</h2>
        <div className="flex items-center gap-2">
          {bodyFatCategory ? (
            <Badge
              variant="outline"
              className="border-transparent px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${bodyFatCategory.color}20`,
                color: bodyFatCategory.color,
              }}
              title={`Based on ACE classifications for ${gender === "female" ? "female" : gender === "male" ? "male" : "female"} users`}
            >
              {bodyFatCategory.category} ●
            </Badge>
          ) : gender ? null : (
            <span className="text-xs text-muted-foreground">Set gender in profile settings for personalised context.</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-[8px] px-3 text-xs text-muted-foreground hover:bg-white/10 hover:text-white"
            onClick={() => setShowMore((prev) => !prev)}
          >
            + More
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[...primaryMetrics, ...(showMore ? extraMetrics : [])].map((metric) => {
          const active = activeKeys.includes(metric.key);
          const disabled = !availableMap.get(metric.key);
          return (
            <Button
              key={metric.key}
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              title={disabled ? "No data logged" : undefined}
              className={cn(
                "h-8 rounded-[8px] border px-3 text-xs",
                active
                  ? "border-[#e65778]/45 bg-[#e65778]/20 text-foreground hover:bg-[#e65778]/30"
                  : "border-white/10 bg-[#131b2f]/65 text-muted-foreground hover:bg-white/10 hover:text-white"
              )}
              onClick={() => {
                setActiveKeys((previous) => {
                  if (previous.includes(metric.key)) {
                    const next = previous.filter((key) => key !== metric.key);
                    return next.length > 0 ? next : previous;
                  }
                  return [...previous, metric.key];
                });
              }}
            >
              {metric.label}
            </Button>
          );
        })}
      </div>

      {chartRows.length > 0 ? (
        <div className="mt-4 h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 10, right: 8, left: -12, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDate(String(value))}
                stroke="#8692af"
                minTickGap={28}
              />
              <YAxis
                stroke="#8692af"
                width={46}
                domain={yDomain as [number, number]}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={<BodyTooltip activeKeys={activeKeys} metrics={metrics} />}
                cursor={{ stroke: "rgba(229,237,255,0.55)", strokeWidth: 1 }}
              />
              {activeKeys.map((key) => {
                const metric = metrics.find((item) => item.key === key);
                if (!metric) return null;
                return (
                  <Line
                    key={key}
                    dataKey={key}
                    stroke={metric.color}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 2.5, fill: metric.color, strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: metric.color, strokeWidth: 0 }}
                    type="monotone"
                    isAnimationActive={false}
                  />
                );
              })}
              {compare
                ? activeKeys.map((key) => {
                    const metric = metrics.find((item) => item.key === key);
                    if (!metric) return null;
                    return (
                      <Line
                        key={`compare_${key}`}
                        dataKey={`compare_${key}`}
                        stroke={metric.color}
                        strokeOpacity={0.45}
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                        connectNulls={false}
                        dot={{ r: 2.5, fill: metric.color, strokeWidth: 0 }}
                        activeDot={{ r: 4, fill: metric.color, strokeWidth: 0 }}
                        type="monotone"
                        isAnimationActive={false}
                      />
                    );
                  })
                : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 rounded-[12px] border border-white/10 bg-[#121b2f]/45 px-4 py-10 text-center text-sm text-muted-foreground">
          No body composition data in this period.
        </div>
      )}

      <div className="mt-5 rounded-[12px] border border-white/10 bg-[#111a2f]/70 p-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Progress Photos</p>
          <Button type="button" size="sm" disabled className="rounded-[8px]">
            + Add Photo
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          No photos logged yet. Track your body composition visually over time.
        </p>
      </div>
    </section>
  );
}
