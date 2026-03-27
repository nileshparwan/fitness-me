"use client";

import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MenstrualCycleRow } from "@/app/actions/menstrual-cycles";
import { cn } from "@/utils";
import {
  CYCLE_AVERAGE_LINE_COLOR,
  CYCLE_AXIS_COLOR,
  CYCLE_GRID_COLOR,
  CYCLE_LENGTH_BAR_COLOR,
  CYCLE_PANEL_CLASS,
  CYCLE_SUB_PANEL_CLASS,
} from "./_constants";

type CycleLengthChartProps = {
  cycles: MenstrualCycleRow[];
};

function formatCycleDate(value: string) {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

export function CycleLengthChart({ cycles }: CycleLengthChartProps) {
  const rows = [...cycles]
    .filter((cycle) => cycle.cycle_length_days !== null)
    .slice(0, 6)
    .reverse()
    .map((cycle) => ({
      label: formatCycleDate(cycle.period_start_date),
      cycleLength: cycle.cycle_length_days as number,
    }));

  if (rows.length < 2) {
    return (
      <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Cycle Length History</h3>
          <p className="text-sm text-muted-foreground">
            Last 6 logged cycles, oldest to newest.
          </p>
        </div>
        <div
          className={cn(
            CYCLE_SUB_PANEL_CLASS,
            "flex min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground"
          )}
        >
          Log at least 2 cycles to see length trends
        </div>
      </section>
    );
  }

  const values = rows.map((row) => row.cycleLength);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  return (
    <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Cycle Length History</h3>
        <p className="text-sm text-muted-foreground">
          Last 6 logged cycles, oldest to newest.
        </p>
      </div>
      <div className={cn(CYCLE_SUB_PANEL_CLASS, "h-[220px]")}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows} barCategoryGap="28%">
            <CartesianGrid stroke={CYCLE_GRID_COLOR} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={CYCLE_AXIS_COLOR}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={CYCLE_AXIS_COLOR}
              tickLine={false}
              axisLine={false}
              width={34}
              domain={[Math.max(20, minValue - 2), maxValue + 2]}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value: number) => [`${value} days`, "Cycle length"]}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid rgba(134, 150, 182, 0.35)",
                backgroundColor: "rgba(10, 15, 29, 0.96)",
              }}
              itemStyle={{ color: "#e7edf8" }}
              labelStyle={{ color: "#e7edf8" }}
            />
            <ReferenceLine
              y={Number(average.toFixed(1))}
              stroke={CYCLE_AVERAGE_LINE_COLOR}
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{ value: "Avg", fill: CYCLE_AVERAGE_LINE_COLOR, position: "insideTopRight" }}
            />
            <Bar
              dataKey="cycleLength"
              fill={CYCLE_LENGTH_BAR_COLOR}
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
