"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import {
  AXIS_COLOR,
  DEFICIT_NEGATIVE_COLOR,
  DEFICIT_POSITIVE_COLOR,
  GRID_COLOR,
  PANEL_CLASS,
  ZERO_LINE_COLOR,
} from "./_constants";
import { formatChartDate } from "./_shared";
import { cn } from "@/utils";

export function DeficitSurplusChart({ data }: { data: NutritionProgressData }) {
  const hasRows = data.daily_rows.length > 0;

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Calorie Deficit / Surplus
        </h2>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            data.total_deficit_surplus >= 0 ? "text-chart-2" : "text-destructive"
          )}
        >
          {data.total_deficit_surplus >= 0 ? "+" : ""}
          {data.total_deficit_surplus.toLocaleString()} kcal total
        </span>
      </div>
      {hasRows ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.daily_rows} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[
                (dataMin: number) => Math.floor(Math.min(dataMin, 0) * 1.1 / 100) * 100,
                (dataMax: number) => Math.ceil(Math.max(dataMax, 0) * 1.1 / 100) * 100,
              ]}
              tickFormatter={(value: number) =>
                value === 0 ? "0" : `${value > 0 ? "+" : ""}${value.toLocaleString()}`
              }
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceArea
              yAxisId="left"
              y1={-99999}
              y2={0}
              fill={DEFICIT_NEGATIVE_COLOR}
              fillOpacity={0.07}
              ifOverflow="hidden"
              label={{
                value: "Deficit",
                position: "insideTopRight",
                fill: DEFICIT_NEGATIVE_COLOR,
                fontSize: 10,
                opacity: 0.6,
              }}
            />
            <ReferenceArea
              yAxisId="left"
              y1={0}
              y2={99999}
              fill={DEFICIT_POSITIVE_COLOR}
              fillOpacity={0.07}
              ifOverflow="hidden"
              label={{
                value: "Surplus",
                position: "insideBottomRight",
                fill: DEFICIT_POSITIVE_COLOR,
                fontSize: 10,
                opacity: 0.6,
              }}
            />
            <ReferenceLine yAxisId="left" y={0} stroke={ZERO_LINE_COLOR} strokeWidth={1.5} />
            <Bar
              yAxisId="left"
              dataKey="deficit_surplus"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
              activeBar={false}
            >
              {data.daily_rows.map((row) => (
                <Cell
                  key={row.date}
                  fill={row.deficit_surplus >= 0 ? DEFICIT_POSITIVE_COLOR : DEFICIT_NEGATIVE_COLOR}
                />
              ))}
            </Bar>
            <ChartTooltip
              formatter={(value: number) => [`${value > 0 ? "+" : ""}${value} kcal`, "vs target"]}
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
          Deficit or surplus trend appears after logs are added.
        </p>
      )}
      {data.targets.source === "none" ? (
        <p className="text-xs text-muted-foreground">
          Set a calorie target in goals to enable deficit/surplus tracking.
        </p>
      ) : null}
    </section>
  );
}
