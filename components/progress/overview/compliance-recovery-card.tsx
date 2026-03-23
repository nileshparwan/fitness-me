"use client";

import { Activity, Flame, ListChecks, Moon, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";
import type { ComplianceRecoveryData } from "@/app/actions/progress-overview";

type Props = {
  data: ComplianceRecoveryData | undefined;
  compareData?: ComplianceRecoveryData;
  compare: boolean;
  isLoading: boolean;
};

function formatDate(value: string) {
  return value.slice(5);
}

function mergeReadiness(
  current: ComplianceRecoveryData | undefined,
  compareData: ComplianceRecoveryData | undefined,
  compare: boolean
) {
  if (!current) return [];
  const byDate = new Map<string, Record<string, number | string | null>>();
  for (const row of current.readiness_series) {
    byDate.set(row.date, {
      date: row.date,
      recovery_score: row.recovery_score,
      hrv_normalized: row.hrv_ms !== null ? Math.min(100, Math.max(0, (row.hrv_ms / 80) * 100)) : null,
      rhr_bpm: current.rhr_series.find((item) => item.date === row.date)?.rhr_bpm ?? null,
    });
  }

  if (compare && compareData) {
    for (const row of compareData.readiness_series) {
      const currentRow = byDate.get(row.date) || { date: row.date };
      currentRow.compare_recovery_score = row.recovery_score;
      currentRow.compare_hrv_normalized =
        row.hrv_ms !== null ? Math.min(100, Math.max(0, (row.hrv_ms / 80) * 100)) : null;
      byDate.set(row.date, currentRow);
    }
  }

  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function mergeWeekly(
  current: ComplianceRecoveryData | undefined,
  compareData: ComplianceRecoveryData | undefined,
  compare: boolean
) {
  if (!current) return [];
  const byWeek = new Map<string, Record<string, number | string>>();
  for (const row of current.workouts_per_week) {
    byWeek.set(row.week_start, { week_start: row.week_start, session_count: row.session_count });
  }
  if (compare && compareData) {
    for (const row of compareData.workouts_per_week) {
      const currentRow = byWeek.get(row.week_start) || { week_start: row.week_start };
      currentRow.compare_session_count = row.session_count;
      byWeek.set(row.week_start, currentRow);
    }
  }
  return [...byWeek.values()].sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)));
}

function avgRecovery(data: ComplianceRecoveryData | undefined) {
  if (!data) return null;
  const values = data.readiness_series
    .map((row) => row.recovery_score)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function minutesToLabel(minutes: number | null) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function ComplianceRecoveryCard({ data, compareData, compare, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-[760px] rounded-[16px]" />;
  }

  const readinessRows = mergeReadiness(data, compareData, compare);
  const weeklyRows = mergeWeekly(data, compareData, compare);
  const recoveryAvg = avgRecovery(data);

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h2 className="text-xl font-semibold">Compliance &amp; Recovery</h2>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3 text-center">
          <Flame className="mx-auto h-4 w-4 text-[#f59e0b]" />
          <p className="mt-2 text-3xl font-semibold leading-none">{data?.day_streak ?? 0}</p>
          <p className="text-sm text-muted-foreground">Day Streak</p>
        </div>
        <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3 text-center">
          <ListChecks className="mx-auto h-4 w-4 text-[#5b9cff]" />
          <p className="mt-2 text-3xl font-semibold leading-none">{data?.task_completion.pct ?? 0}%</p>
          <p className="text-sm text-muted-foreground">
            {data?.task_completion.completed ?? 0}/{data?.task_completion.total ?? 0} Tasks
          </p>
        </div>
        <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3 text-center">
          <Zap className="mx-auto h-4 w-4 text-[#5ed28f]" />
          <p className="mt-2 text-3xl font-semibold leading-none">{data?.recovery_score ?? "—"}</p>
          <p className="text-sm text-muted-foreground">Recovery Score</p>
        </div>
      </div>

      <div className="mt-5 h-[190px] w-full">
        <p className="mb-1 text-sm text-muted-foreground">Workouts per Week</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.2)" />
            <XAxis dataKey="week_start" tickFormatter={formatDate} stroke="#8692af" />
            <YAxis stroke="#8692af" width={34} domain={[0, 7]} />
            <ChartTooltip
              cursor={{ fill: "rgba(148,163,184,0.15)" }}
              formatter={(value) => [value ?? "—", "days"]}
              labelFormatter={(label) => String(label).slice(5)}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(16,25,45,0.96)",
                color: "#ecf3ff",
              }}
            />
            <Bar dataKey="session_count" fill="#e65778" radius={[4, 4, 0, 0]} />
            {compare ? <Bar dataKey="compare_session_count" fill="#f2b648" radius={[4, 4, 0, 0]} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5">
        <p className="text-sm text-muted-foreground">Recovery &amp; Readiness (14-day)</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-[10px] border border-white/10 bg-[#131b2f]/75 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Moon className="h-4 w-4 text-[#9f88f0]" />
              <span className="font-medium">{data?.last_sleep_hours ? `${data.last_sleep_hours}h` : "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Last Sleep{data?.sleep_score_avg ? ` · Score ${data.sleep_score_avg}` : ""}
            </p>
          </div>
          <div className="rounded-[10px] border border-white/10 bg-[#131b2f]/75 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-[#5ed28f]" />
              <span className="font-medium">{data?.last_hrv_ms ? `${data.last_hrv_ms} ms` : "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">Last HRV</p>
          </div>
        </div>

        {data?.sleep_stages_last ? (
          <div className="mt-3 rounded-[10px] border border-white/10 bg-[#131b2f]/75 p-2">
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">Last night sleep</p>
            <div className="flex h-7 overflow-hidden rounded-[8px] border border-white/10">
              {[
                {
                  label: "Deep",
                  minutes: data.sleep_stages_last.deep_minutes,
                  color: "#6366f1",
                },
                {
                  label: "REM",
                  minutes: data.sleep_stages_last.rem_minutes,
                  color: "#8b5cf6",
                },
                {
                  label: "Light",
                  minutes: data.sleep_stages_last.light_minutes,
                  color: "#38bdf8",
                },
                {
                  label: "Awake",
                  minutes: data.sleep_stages_last.awake_minutes,
                  color: "#64748b",
                },
              ]
                .filter((segment) => (segment.minutes ?? 0) > 0)
                .map((segment) => {
                  const total =
                    (data.sleep_stages_last?.deep_minutes ?? 0) +
                    (data.sleep_stages_last?.rem_minutes ?? 0) +
                    (data.sleep_stages_last?.light_minutes ?? 0) +
                    (data.sleep_stages_last?.awake_minutes ?? 0);
                  const width = total > 0 ? ((segment.minutes || 0) / total) * 100 : 0;
                  return (
                    <div
                      key={segment.label}
                      className="grid place-items-center text-[10px] font-medium text-[#08101f]"
                      style={{ width: `${width}%`, background: segment.color }}
                      title={`${segment.label}: ${minutesToLabel(segment.minutes)}`}
                    >
                      {width > 18 ? segment.label : ""}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={readinessRows} margin={{ top: 4, right: 8, left: -16, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={24} />
            <YAxis yAxisId="left" stroke="#8692af" width={40} domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" stroke="#8692af" width={40} domain={[40, 100]} />
            <ChartTooltip
              cursor={{ stroke: "rgba(229,237,255,0.55)", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(16,25,45,0.96)",
                color: "#ecf3ff",
              }}
            />
            <Line
              yAxisId="left"
              dataKey="recovery_score"
              stroke="#5ed28f"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#5ed28f", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#5ed28f", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              dataKey="hrv_normalized"
              stroke="#9f88f0"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#9f88f0", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#9f88f0", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              dataKey="rhr_bpm"
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            {compare ? (
              <>
                <Line
                  yAxisId="left"
                  dataKey="compare_recovery_score"
                  stroke="#5ed28f"
                  strokeOpacity={0.45}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#5ed28f", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#5ed28f", strokeWidth: 0 }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="left"
                  dataKey="compare_hrv_normalized"
                  stroke="#9f88f0"
                  strokeOpacity={0.45}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#9f88f0", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#9f88f0", strokeWidth: 0 }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        Avg recovery: {recoveryAvg !== null ? `${recoveryAvg}/100` : "—"}
      </p>

      <div className="mt-5">
        <h3 className="text-sm font-medium text-muted-foreground">Habits</h3>
        {data?.habits.length ? (
          <div className="mt-2 space-y-2">
            {data.habits.map((habit) => (
              <div
                key={habit.id}
                className={cn(
                  "rounded-[10px] border border-white/10 bg-[#131b2f]/65 px-3 py-2",
                  habit.completed_today ? "bg-[#123227]/35" : ""
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{habit.name}</p>
                  <p className="text-muted-foreground">🔥 {habit.streak_days}d</p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#1f2a44]">
                  <div
                    className="h-full rounded-full bg-[#5ed28f]"
                    style={{ width: `${habit.completion_pct_range}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{habit.completion_pct_range}% completed</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No habits set up yet.
          </p>
        )}
      </div>
    </section>
  );
}
