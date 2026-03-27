"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { NutritionProgressTargets } from "@/types/nutrition-progress";
import {
  AXIS_COLOR,
  CALORIES_BAR_COLOR,
  CALORIES_LINE_COLOR,
  GRID_COLOR,
  PANEL_CLASS,
} from "./_constants";
import {
  CaloriesTooltip,
  type NutritionProgressChartRow,
  formatChartDate,
} from "./_shared";
import { cn } from "@/utils";

type CaloriesChartProps = {
  rows: NutritionProgressChartRow[];
  compareMode: boolean;
  targets: NutritionProgressTargets;
};

export function CaloriesChart({
  rows,
  compareMode,
  targets,
}: CaloriesChartProps) {
  const hasRows = rows.length > 0;

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Daily Calories</h2>
        {compareMode ? (
          <span className="text-xs text-muted-foreground">
            Comparing with previous period
          </span>
        ) : null}
      </div>
      {hasRows ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <Bar
              dataKey="calories"
              fill={CALORIES_BAR_COLOR}
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              activeBar={false}
            />
            {targets.calories > 0 ? (
              <ReferenceLine
                y={targets.calories}
                stroke={CALORIES_LINE_COLOR}
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
            ) : null}
            <Line
              dataKey="rolling_avg_7"
              stroke={CALORIES_LINE_COLOR}
              dot={false}
              strokeWidth={2}
              type="monotone"
              connectNulls
              isAnimationActive={false}
            />
            {compareMode ? (
              <Line
                dataKey="compare_calories"
                stroke="#a3aec9"
                dot={false}
                strokeWidth={2}
                strokeDasharray="6 4"
                type="monotone"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<CaloriesTooltip target={targets.calories} />} cursor={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground">
          No meal logs were found in this period.
        </p>
      )}
    </section>
  );
}
