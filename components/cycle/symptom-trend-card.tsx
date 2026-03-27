"use client";

import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MenstrualCycleRow } from "@/app/actions/menstrual-cycles";
import { cn } from "@/utils";
import {
  CYCLE_AXIS_COLOR,
  CYCLE_ENERGY_COLOR,
  CYCLE_GRID_COLOR,
  CYCLE_MOOD_COLOR,
  CYCLE_PANEL_CLASS,
  CYCLE_SUB_PANEL_CLASS,
} from "./_constants";

type SymptomTrendCardProps = {
  cycles: MenstrualCycleRow[];
};

type SymptomRow = {
  label: string;
  energyScore: number | null;
  energyLabel: string;
  moodScore: number | null;
  moodLabel: string;
};

function formatCycleDate(value: string) {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function toIndexLabel(value: number | null) {
  if (value === null) return "Not logged";
  if (value >= 5) return "Very high";
  if (value === 4) return "High";
  if (value === 3) return "Moderate";
  if (value === 2) return "Low";
  return "Very low";
}

export function SymptomTrendCard({ cycles }: SymptomTrendCardProps) {
  const rows: SymptomRow[] = [...cycles]
    .slice(0, 6)
    .reverse()
    .map((cycle) => ({
      label: formatCycleDate(cycle.period_start_date),
      energyScore: cycle.energy_level !== null ? cycle.energy_level * 20 : null,
      energyLabel: toIndexLabel(cycle.energy_level),
      moodScore: cycle.mood !== null ? cycle.mood * 20 : null,
      moodLabel: toIndexLabel(cycle.mood),
    }));

  const rowsWithSignals = rows.filter(
    (row) => row.energyScore !== null || row.moodScore !== null
  );

  if (rowsWithSignals.length < 2) {
    return (
      <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Symptom Trends</h3>
          <p className="text-sm text-muted-foreground">
            Energy and mood across recent cycles.
          </p>
        </div>
        <div
          className={cn(
            CYCLE_SUB_PANEL_CLASS,
            "flex min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground"
          )}
        >
          Log symptoms while tracking to see trends
        </div>
      </section>
    );
  }

  return (
    <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Symptom Trends</h3>
        <p className="text-sm text-muted-foreground">
          Energy and mood across recent cycles.
        </p>
      </div>
      <div className={cn(CYCLE_SUB_PANEL_CLASS, "h-[220px]")}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rows}>
            <CartesianGrid stroke={CYCLE_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={CYCLE_AXIS_COLOR}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide domain={[0, 100]} />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as SymptomRow | undefined;
                if (!row) return null;
                return (
                  <div className="rounded-[14px] border border-white/10 bg-[#0b1224]/95 px-3 py-2 text-xs text-[#e7edf8] shadow-xl">
                    <p className="font-medium">{label}</p>
                    <p>Energy: {row.energyLabel}</p>
                    <p>Mood: {row.moodLabel}</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="energyScore"
              stroke={CYCLE_ENERGY_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CYCLE_ENERGY_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CYCLE_ENERGY_COLOR, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="moodScore"
              stroke={CYCLE_MOOD_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CYCLE_MOOD_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CYCLE_MOOD_COLOR, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
