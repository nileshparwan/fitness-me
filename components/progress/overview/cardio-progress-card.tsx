"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";

import { AnimatedFill } from "@/components/ui/animated-fill";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PROGRESS_CARDIO_HR_ZONES } from "@/utils/app-constants";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { KM_PER_MILE, displayDistance } from "@/utils/unit-conversion";
import type { CardioProgressSeries } from "@/app/actions/progress-overview";

type Props = {
  data: CardioProgressSeries;
  compareData?: CardioProgressSeries;
  compare: boolean;
  isLoading: boolean;
  vo2maxEstimate: number | null;
};

type SeriesKey = "distance" | "pace_min_per_km" | "avg_hr_bpm";

type LineConfig = { key: SeriesKey; label: string; color: string };

function formatDate(value: string) {
  const raw = String(value || "");
  const isoDay = raw.includes("T") ? raw.slice(0, 10) : raw;
  return isoDay.length >= 10 ? isoDay.slice(5) : isoDay;
}

function formatTime(totalMinutes: number) {
  const secondsTotal = Math.round(totalMinutes * 60);
  const hours = Math.floor(secondsTotal / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = secondsTotal % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function predictRaceTime(vo2max: number, distanceKm: number) {
  const velocity = Math.max(130, (vo2max + 4.6) / 0.182258); // m/min approximation
  const baseline5k = 5000 / velocity;
  const minutes = baseline5k * Math.pow(distanceKm / 5, 1.06);
  return formatTime(minutes);
}

function mergeCompare(
  current: CardioProgressSeries,
  compareData: CardioProgressSeries | undefined,
  compare: boolean,
  system: ReturnType<typeof useUnitSystem>
) {
  if (!compare || !compareData) return current.series;
  const byDate = new Map<string, Record<string, number | string | null>>();
  for (const row of current.series) {
    byDate.set(row.date, {
      ...row,
      distance: displayDistance(row.distance, system),
      pace_min_per_km:
        row.pace_min_per_km !== null && row.pace_min_per_km !== undefined
          ? system === "imperial"
            ? row.pace_min_per_km * KM_PER_MILE
            : row.pace_min_per_km
          : row.pace_min_per_km,
    });
  }
  for (const row of compareData.series) {
    const existing = byDate.get(row.date) || { date: row.date };
    existing.compare_distance = displayDistance(row.distance, system);
    existing.compare_pace_min_per_km =
      row.pace_min_per_km !== null && row.pace_min_per_km !== undefined
        ? system === "imperial"
          ? row.pace_min_per_km * KM_PER_MILE
          : row.pace_min_per_km
        : row.pace_min_per_km;
    existing.compare_avg_hr_bpm = row.avg_hr_bpm;
    byDate.set(row.date, existing);
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function CardioProgressCard({ data, compareData, compare, isLoading, vo2maxEstimate }: Props) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (isLoading) {
    return <Skeleton className="h-[720px] rounded-[16px]" />;
  }

  const chartRows = mergeCompare(data, compareData, compare, system);
  const lines: LineConfig[] = [
    { key: "distance", label: `Distance (${labels.distance})`, color: "#60A5FA" },
    { key: "pace_min_per_km", label: `Pace (min/${labels.distance})`, color: "#4ADE80" },
    { key: "avg_hr_bpm", label: "Avg HR (bpm)", color: "#F472B6" },
  ];

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h2 className="text-xl font-semibold">Cardio Progress</h2>

      {data.activity_breakdown.length > 1 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Activity Mix:</p>
          {data.activity_breakdown.map((item) => (
            <span
              key={item.type}
              className="rounded-[8px] border border-white/10 bg-[#131b2f]/65 px-2 py-1 text-xs text-muted-foreground"
            >
              {item.type} {item.pct}%
            </span>
          ))}
        </div>
      ) : null}

      {chartRows.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-white/10 bg-[#121b2f]/45 px-4 py-10 text-center text-sm text-muted-foreground">
          No cardio sessions logged in this period.
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {lines.map((line, index) => (
            <div key={line.key} className="h-[150px] w-full">
              <p className="mb-1 text-sm text-muted-foreground">{line.label}</p>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} syncId="cardio">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke="#8692af"
                      hide={index < lines.length - 1}
                      minTickGap={26}
                    />
                  <YAxis stroke="#8692af" width={42} />
                  <ChartTooltip
                    cursor={{ stroke: "rgba(229,237,255,0.55)", strokeWidth: 1 }}
                    formatter={(value) => [value ?? "—", line.label]}
                    labelFormatter={(label) => formatDate(String(label))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(16,25,45,0.96)",
                      color: "#ecf3ff",
                    }}
                    itemStyle={{ color: line.color }}
                    labelStyle={{ color: "#ecf3ff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 2.5, fill: line.color, strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: line.color, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                  {compare ? (
                    <Line
                      type="monotone"
                      dataKey={`compare_${line.key}`}
                      stroke={line.color}
                      strokeOpacity={0.45}
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      connectNulls={false}
                      dot={{ r: 2.5, fill: line.color, strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: line.color, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {data.hr_zones_summary ? (
        <div className="mt-6">
          <p className="mb-2 text-sm text-muted-foreground">HR Zones</p>
          <div className="h-8 overflow-hidden rounded-[8px] border border-white/10 bg-[#131b2f]/75">
            <div className="flex h-full w-full">
              {PROGRESS_CARDIO_HR_ZONES.map((zone) => {
                const value = data.hr_zones_summary?.[zone.key] ?? 0;
                return (
                <AnimatedFill
                  key={zone.key}
                  width={value}
                  style={{ background: zone.color }}
                  className="grid min-w-[36px] place-items-center text-[10px] font-semibold text-[#08101f]"
                  title={`${zone.shortLabel}: ${value}%`}
                >
                  {value > 9 ? `${zone.shortLabel} ${value}%` : ""}
                </AnimatedFill>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Based on average heart rate from logged cardio sessions.</p>
          <TooltipProvider delayDuration={200}>
            <div className="mt-3 hidden flex-wrap gap-2 xl:flex">
              {PROGRESS_CARDIO_HR_ZONES.map((zone) => {
                const value = data.hr_zones_summary?.[zone.key] ?? 0;
                return (
                  <Tooltip key={`desktop-${zone.key}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-[8px] border border-white/10 bg-[#131b2f]/65 px-2.5 py-1.5 text-xs text-muted-foreground"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                        <span className="font-medium text-foreground">{zone.shortLabel}</span>
                        <span>{value}%</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] rounded-[8px] border border-white/10 bg-[#131b2f] p-2 text-[#ecf3ff]">
                      <p className="text-xs font-semibold">{zone.title}</p>
                      <p className="text-[11px] text-[#9fb0cf]">{zone.range}</p>
                      <p className="mt-1 text-[11px] text-[#d7e2f7]">{zone.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
          <div className="mt-3 grid gap-2 xl:hidden">
            {PROGRESS_CARDIO_HR_ZONES.map((zone) => {
              const value = data.hr_zones_summary?.[zone.key] ?? 0;
              return (
                <div
                  key={`mobile-${zone.key}`}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-[8px] border border-white/10 bg-[#131b2f]/55 px-2.5 py-2"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{zone.title}</p>
                    <p className="text-[11px] text-[#9fb0cf]">{zone.range}</p>
                    <p className="text-[11px] text-muted-foreground">{zone.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {vo2maxEstimate ? (
        <div className="mt-6 rounded-[12px] border border-white/10 bg-[#111a2f]/65 p-3">
          <p className="text-sm font-medium">Race Predictions (VO2 max {vo2maxEstimate})</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="rounded-[8px] border border-white/10 bg-[#131b2f]/70 px-2 py-2">
              <p className="text-xs text-muted-foreground">{`${displayDistance(5, system)?.toFixed(1)} ${labels.distance}`}</p>
              <p className="font-semibold">{predictRaceTime(vo2maxEstimate, 5)}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-[#131b2f]/70 px-2 py-2">
              <p className="text-xs text-muted-foreground">{`${displayDistance(10, system)?.toFixed(1)} ${labels.distance}`}</p>
              <p className="font-semibold">{predictRaceTime(vo2maxEstimate, 10)}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-[#131b2f]/70 px-2 py-2">
              <p className="text-xs text-muted-foreground">Half</p>
              <p className="font-semibold">{predictRaceTime(vo2maxEstimate, 21.0975)}</p>
            </div>
            <div className="rounded-[8px] border border-white/10 bg-[#131b2f]/70 px-2 py-2">
              <p className="text-xs text-muted-foreground">Full</p>
              <p className="font-semibold">{predictRaceTime(vo2maxEstimate, 42.195)}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
