"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import {
  AXIS_COLOR,
  CALORIES_LINE_COLOR,
  GRID_COLOR,
  PANEL_CLASS,
  SUB_PANEL_CLASS,
  WEEKDAY_BAR_COLOR,
  WEEKEND_BAR_COLOR,
} from "./_constants";
import { cn } from "@/utils";

export function DayOfWeekCard({ data }: { data: NutritionProgressData }) {
  if (data.days_in_range < 14) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className={cn(PANEL_CLASS, "space-y-4")}>
        <h2 className="text-xl font-semibold tracking-tight">Calories by Day of Week</h2>
        <p className="text-sm text-muted-foreground">
          Average calorie intake per day of the week over this period.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.dow_avg_calories} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
            {data.targets.calories > 0 ? (
              <ReferenceLine
                y={data.targets.calories}
                stroke={CALORIES_LINE_COLOR}
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
            ) : null}
            <Bar dataKey="avg" radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={false}>
              {data.dow_avg_calories.map((entry) => (
                <Cell
                  key={entry.dow}
                  fill={entry.dow === 0 || entry.dow === 6 ? WEEKEND_BAR_COLOR : WEEKDAY_BAR_COLOR}
                />
              ))}
            </Bar>
            <ChartTooltip
              formatter={(value: number) => [`${value.toLocaleString()} kcal`, "Avg calories"]}
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
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-chart-1/70" />
            Weekday
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-chart-4/70" />
            Weekend
          </span>
        </div>
      </section>

      <section className={cn(PANEL_CLASS, "space-y-4")}>
        <h2 className="text-xl font-semibold tracking-tight">Weekday vs Weekend</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Mon - Fri avg
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {data.weekday_avg_calories.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">kcal / day</p>
          </div>
          <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Sat - Sun avg
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {data.weekend_avg_calories.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">kcal / day</p>
          </div>
        </div>
        {Math.abs(data.weekday_avg_calories - data.weekend_avg_calories) > 200 ? (
          <p className="text-sm text-muted-foreground">
            Weekend intake is{" "}
            {data.weekend_avg_calories > data.weekday_avg_calories ? "higher" : "lower"} than weekdays by{" "}
            {Math.abs(data.weekday_avg_calories - data.weekend_avg_calories).toLocaleString()} kcal on average.
          </p>
        ) : null}
      </section>
    </div>
  );
}
