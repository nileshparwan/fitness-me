"use client";

import {
  Bar,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  BarChart,
} from "recharts";

import { AXIS_COLOR, FIBER_COLOR, GRID_COLOR, PANEL_CLASS } from "./_constants";
import { type NutritionProgressChartRow, formatChartDate } from "./_shared";
import { cn } from "@/utils";

type FiberChartProps = {
  rows: NutritionProgressChartRow[];
  compareMode: boolean;
};

export function FiberChart({ rows, compareMode }: FiberChartProps) {
  const hasRows = rows.length > 0;

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Fiber Intake</h2>
        {compareMode ? (
          <span className="text-xs text-muted-foreground">
            Dashed line = previous period
          </span>
        ) : null}
      </div>
      {hasRows ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <Bar
              dataKey="fiber_g"
              fill={FIBER_COLOR}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              activeBar={false}
            />
            {compareMode ? (
              <Line
                dataKey="compare_fiber_g"
                stroke="#93d6b6"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                type="monotone"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            <ReferenceLine y={25} stroke={FIBER_COLOR} strokeDasharray="4 2" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
            <ChartTooltip
              formatter={(value: number) => [`${value}g`, "Fiber"]}
              labelFormatter={formatChartDate}
              contentStyle={{
                borderRadius: "14px",
                border: "1px solid rgba(134, 150, 182, 0.35)",
                backgroundColor: "rgba(10, 15, 29, 0.96)",
              }}
              itemStyle={{ color: "#e7edf8" }}
              labelStyle={{ color: "#e7edf8" }}
              cursor={false}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground">
          Fiber trend appears here once logs are added.
        </p>
      )}
    </section>
  );
}
