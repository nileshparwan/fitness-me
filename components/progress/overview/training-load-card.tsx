"use client";

import { cn } from "@/utils";
import type { TrainingLoadData } from "@/app/actions/progress-overview";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  data: TrainingLoadData | undefined;
  compareData?: TrainingLoadData;
  compare: boolean;
  isLoading: boolean;
};

function statusClass(status: TrainingLoadData["training_status"]) {
  switch (status) {
    case "Productive":
      return "bg-[#123227] text-[#5ed28f] border-[#5ed28f]/35";
    case "Maintaining":
      return "bg-[#13253f] text-[#5b9cff] border-[#5b9cff]/35";
    case "Peaking":
      return "bg-[#3b3117] text-[#efb241] border-[#efb241]/35";
    case "Recovery":
      return "bg-[#2c2347] text-[#b298ff] border-[#b298ff]/35";
    case "Detraining":
      return "bg-[#3d1f29] text-[#ef5f7a] border-[#ef5f7a]/35";
    default:
      return "bg-[#25314f] text-[#a6b3cf] border-white/20";
  }
}

function formatDate(value: string) {
  return value.slice(5);
}

function mergeCompare(
  current: TrainingLoadData | undefined,
  compareData: TrainingLoadData | undefined,
  compare: boolean
) {
  if (!current) return [];
  if (!compare || !compareData) return current.load_trend;

  const byDate = new Map<string, Record<string, number | string>>();
  for (const row of current.load_trend) {
    byDate.set(row.date, { ...row });
  }
  for (const row of compareData.load_trend) {
    const existing = byDate.get(row.date) || { date: row.date };
    existing.compare_fitness = row.fitness;
    existing.compare_fatigue = row.fatigue;
    existing.compare_form = row.form;
    byDate.set(row.date, existing);
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function TrainingLoadCard({ data, compareData, compare, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-[340px] rounded-[16px]" />;
  }

  const rows = mergeCompare(data, compareData, compare);

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Training Load &amp; Status</h2>
        <span
          className={cn(
            "rounded-[999px] border px-3 py-1 text-xs font-medium",
            statusClass(data?.training_status ?? "Insufficient Data")
          )}
        >
          {data?.training_status ?? "Insufficient Data"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-[10px] border border-white/10 bg-[#131b2f]/75 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Fitness</p>
          <p className="mt-1 text-2xl font-semibold">{data?.fitness_score ?? 0}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#131b2f]/75 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Fatigue</p>
          <p className="mt-1 text-2xl font-semibold">{data?.fatigue_score ?? 0}</p>
        </div>
        <div className="rounded-[10px] border border-white/10 bg-[#131b2f]/75 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Form</p>
          <p className="mt-1 text-2xl font-semibold">
            {typeof data?.form_score === "number" && data.form_score > 0 ? "+" : ""}
            {data?.form_score ?? 0}
          </p>
        </div>
      </div>
      {data && data.fitness_score > 0 && data.fatigue_score > data.fitness_score * 1.5 ? (
        <p className="mt-2 rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Acute load is well above your chronic base. A deload week may prevent overtraining.
        </p>
      ) : null}

      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={26} />
            <YAxis stroke="#8692af" width={44} />
            <ReferenceLine y={0} stroke="rgba(148,163,184,0.4)" strokeDasharray="2 2" />
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
              dataKey="fitness"
              stroke="#4ADE80"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#4ADE80", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#4ADE80", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              dataKey="fatigue"
              stroke="#FBBF24"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#FBBF24", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#FBBF24", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              dataKey="form"
              stroke="#60A5FA"
              strokeDasharray="4 2"
              strokeWidth={1.8}
              dot={{ r: 2.5, fill: "#60A5FA", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#60A5FA", strokeWidth: 0 }}
              connectNulls={false}
              type="monotone"
              isAnimationActive={false}
            />
            {compare ? (
              <>
                <Line
                  dataKey="compare_fitness"
                  stroke="#4ADE80"
                  strokeOpacity={0.45}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#4ADE80", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#4ADE80", strokeWidth: 0 }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="compare_fatigue"
                  stroke="#FBBF24"
                  strokeOpacity={0.45}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#FBBF24", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#FBBF24", strokeWidth: 0 }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="compare_form"
                  stroke="#60A5FA"
                  strokeOpacity={0.45}
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5, fill: "#60A5FA", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#60A5FA", strokeWidth: 0 }}
                  connectNulls={false}
                  type="monotone"
                  isAnimationActive={false}
                />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
