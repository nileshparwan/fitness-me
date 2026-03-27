"use client";

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

import type { NutritionProgressTargets } from "@/types/nutrition-progress";
import { AXIS_COLOR, GRID_COLOR, MACRO_COLORS, PANEL_CLASS } from "./_constants";
import {
  MacrosTooltip,
  type NutritionProgressChartRow,
  formatChartDate,
} from "./_shared";
import { cn } from "@/utils";

type MacrosChartProps = {
  rows: NutritionProgressChartRow[];
  compareMode: boolean;
  targets: NutritionProgressTargets;
};

export function MacrosChart({ rows, compareMode, targets }: MacrosChartProps) {
  const hasRows = rows.length > 0;

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Macros vs Targets</h2>
        {compareMode ? (
          <span className="text-xs text-muted-foreground">
            Dashed lines = previous period
          </span>
        ) : null}
      </div>
      {hasRows ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <Line
              dataKey="protein_g"
              stroke={MACRO_COLORS.protein}
              dot={{ r: 2.5, fill: MACRO_COLORS.protein, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              strokeWidth={2}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              dataKey="carbs_g"
              stroke={MACRO_COLORS.carbs}
              dot={{ r: 2.5, fill: MACRO_COLORS.carbs, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              strokeWidth={2}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              dataKey="fat_g"
              stroke={MACRO_COLORS.fat}
              dot={{ r: 2.5, fill: MACRO_COLORS.fat, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              strokeWidth={2}
              type="monotone"
              isAnimationActive={false}
            />
            {compareMode ? (
              <Line
                dataKey="compare_protein_g"
                stroke="#f4a3bb"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                type="monotone"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {compareMode ? (
              <Line
                dataKey="compare_carbs_g"
                stroke="#9ac9ff"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                type="monotone"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {compareMode ? (
              <Line
                dataKey="compare_fat_g"
                stroke="#f9d383"
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                type="monotone"
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
            {targets.protein_g > 0 ? (
              <ReferenceLine
                y={targets.protein_g}
                stroke={MACRO_COLORS.protein}
                strokeDasharray="6 3"
                ifOverflow="extendDomain"
              />
            ) : null}
            {targets.carbs_g > 0 ? (
              <ReferenceLine
                y={targets.carbs_g}
                stroke={MACRO_COLORS.carbs}
                strokeDasharray="6 3"
                ifOverflow="extendDomain"
              />
            ) : null}
            {targets.fat_g > 0 ? (
              <ReferenceLine
                y={targets.fat_g}
                stroke={MACRO_COLORS.fat}
                strokeDasharray="6 3"
                ifOverflow="extendDomain"
              />
            ) : null}
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[
                0,
                (dataMax: number) =>
                  Math.ceil(
                    Math.max(
                      dataMax,
                      targets.protein_g,
                      targets.carbs_g,
                      targets.fat_g
                    ) *
                      1.15 /
                      10
                  ) * 10,
              ]}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<MacrosTooltip targets={targets} />} cursor={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add meal logs to compare daily macros against targets.
        </p>
      )}
    </section>
  );
}
