"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import type { StrengthProgressData } from "@/app/actions/progress-overview";
import { PROGRESS_STRENGTH_LEVELS, PROGRESS_STRENGTH_STANDARDS } from "@/utils/app-constants";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type Props = {
  data: StrengthProgressData | undefined;
  compareData?: StrengthProgressData;
  compare: boolean;
  isLoading: boolean;
  latestWeightKg: number | null;
};

const LINE_COLORS = ["#60A5FA", "#4ADE80", "#F472B6", "#FBBF24"] as const;

function formatDate(value: string) {
  return value.slice(5);
}

function formatMetric(value: unknown) {
  if (typeof value !== "number") return "—";
  return value.toFixed(1);
}

function buildCompareSeries(
  data: StrengthProgressData | undefined,
  compareData: StrengthProgressData | undefined,
  compare: boolean
) {
  if (!compare || !data || !compareData) return data?.trend_series || [];

  const byDate = new Map<string, Record<string, string | number | null>>();
  for (const row of data.trend_series) {
    byDate.set(row.date, { ...row });
  }
  for (const row of compareData.trend_series) {
    const current = byDate.get(row.date) || { date: row.date };
    for (const exercise of data.top_exercises) {
      current[`compare_${exercise}`] = row[exercise] as number | null;
    }
    byDate.set(row.date, current);
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function extractLatestExerciseValue(data: StrengthProgressData, matcher: RegExp) {
  const key = data.top_exercises.find((exercise) => matcher.test(exercise.toLowerCase()));
  if (!key) return null;
  const values = [...data.trend_series]
    .reverse()
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length > 0 ? values[0] : null;
}

function scoreToLevel(score: number, thresholds: number[]) {
  let levelIndex = 0;
  for (let index = 0; index < thresholds.length; index += 1) {
    if (score >= thresholds[index]) {
      levelIndex = index;
    }
  }
  return levelIndex;
}

export function StrengthProgressCard({ data, compareData, compare, isLoading, latestWeightKg }: Props) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  const chartRows = useMemo(() => {
    const rows = buildCompareSeries(data, compareData, compare);
    if (!data) return rows;
    return rows.map((row) => {
      const next: Record<string, string | number | null> = { ...row };
      for (const exercise of data.top_exercises) {
        next[exercise] = displayWeight((row[exercise] as number | null | undefined) ?? null, system);
        next[`compare_${exercise}`] = displayWeight((row[`compare_${exercise}`] as number | null | undefined) ?? null, system);
      }
      return next;
    });
  }, [compare, compareData, data, system]);

  if (isLoading) {
    return <Skeleton className="h-[620px] rounded-[16px]" />;
  }

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h2 className="text-xl font-semibold">Strength Progress</h2>
      <p className="mt-1 text-sm text-muted-foreground">Estimated 1RM Trends</p>

      <div className="mt-4 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 6, right: 10, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={28} />
            <YAxis stroke="#8692af" width={52} tickFormatter={(value) => `${value} ${labels.weight}`} />
            <ChartTooltip
              cursor={{ stroke: "rgba(229,237,255,0.55)", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(16,25,45,0.96)",
                color: "#ecf3ff",
              }}
            />
            {(data?.top_exercises || []).map((exercise, index) => {
              const color = LINE_COLORS[index % LINE_COLORS.length];
              return (
                <Line
                  key={exercise}
                  dataKey={exercise}
                  stroke={color}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                  type="monotone"
                  isAnimationActive={false}
                />
              );
            })}
            {compare
              ? (data?.top_exercises || []).map((exercise, index) => {
                  const color = LINE_COLORS[index % LINE_COLORS.length];
                  return (
                    <Line
                      key={`compare_${exercise}`}
                      dataKey={`compare_${exercise}`}
                      stroke={color}
                      strokeOpacity={0.45}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      connectNulls={false}
                      dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                      type="monotone"
                      isAnimationActive={false}
                    />
                  );
                })
              : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground">Recent PRs</h3>
        {(data?.recent_prs || []).length > 0 ? (
          <div className="mt-3 space-y-2">
            {(data?.recent_prs || []).map((pr) => (
              <div
                key={`${pr.exercise}-${pr.achieved_on}`}
                className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-[#111a2f]/65 px-3 py-2"
              >
                <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#f3ba4a1a] text-[#f3ba4a]">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pr.exercise}</p>
                  <p className="text-xs text-muted-foreground">Est. 1RM · {pr.achieved_on}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {displayWeight(pr.estimated_1rm_kg, system)?.toFixed(1)} {labels.weight}
                  </p>
                  <p className="text-xs text-[#5ed28f]">
                    +{displayWeight(pr.delta_kg, system)?.toFixed(1)} {labels.weight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No PRs recorded in this period.</p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium text-muted-foreground">Strength Standards</h3>
        {data && latestWeightKg ? (
          <div className="mt-3 space-y-3">
            {[
              { label: "Squat", value: extractLatestExerciseValue(data, /squat/) ?? null, key: "squat" },
              {
                label: "Bench Press",
                value: extractLatestExerciseValue(data, /bench/) ?? null,
                key: "bench press",
              },
              {
                label: "Deadlift",
                value: extractLatestExerciseValue(data, /deadlift/) ?? null,
                key: "deadlift",
              },
              {
                label: "OHP",
                value: extractLatestExerciseValue(data, /overhead|ohp|military press/) ?? null,
                key: "ohp",
              },
            ]
              .filter((row) => row.value !== null)
              .map((row) => {
                const ratio = (row.value || 0) / latestWeightKg;
                const thresholds = PROGRESS_STRENGTH_STANDARDS[row.key] || PROGRESS_STRENGTH_STANDARDS.squat;
                const levelIndex = scoreToLevel(ratio, thresholds);
                const progress = Math.min(100, ((levelIndex + 1) / PROGRESS_STRENGTH_LEVELS.length) * 100);
                return (
                  <div key={row.label} className="rounded-[12px] border border-white/10 bg-[#111a2f]/55 px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium">{row.label}</p>
                      <p className="text-muted-foreground">
                        {formatMetric(row.value)} {labels.weight} · {PROGRESS_STRENGTH_LEVELS[levelIndex]}
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#1f2a44]">
                      <div
                        className="h-full rounded-full bg-[#5b9cff]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Body weight data is required to compute standards.
          </p>
        )}
      </div>
    </section>
  );
}
