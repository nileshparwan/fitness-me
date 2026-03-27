"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { PANEL_CLASS } from "./_constants";
import { resolveMealBreakdownColor } from "./_shared";
import { cn } from "@/utils";

export function MealBreakdownCard({ data }: { data: NutritionProgressData }) {
  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Meal Breakdown</h2>
      {data.meal_breakdown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Meal breakdown will appear after meal logs are added.
        </p>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.meal_breakdown}
                  dataKey="calories"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {data.meal_breakdown.map((entry, index) => (
                    <Cell
                      key={entry.type}
                      fill={resolveMealBreakdownColor(entry.type, index)}
                    />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(_value: number, _name, props) => [
                    `${props.payload.pct}%`,
                    props.payload.type,
                  ]}
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid rgba(134, 150, 182, 0.35)",
                    backgroundColor: "rgba(10, 15, 29, 0.96)",
                  }}
                  itemStyle={{ color: "#e7edf8" }}
                  labelStyle={{ color: "#e7edf8" }}
                  cursor={false}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex w-full flex-col gap-2">
            {data.meal_breakdown.map((entry, index) => (
              <div key={entry.type} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: resolveMealBreakdownColor(entry.type, index) }}
                />
                <span className="capitalize">{entry.type}</span>
                <span className="ml-auto pl-4 font-medium">{entry.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
