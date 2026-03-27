"use client";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { PANEL_CLASS, SUB_PANEL_CLASS } from "./_constants";
import { cn } from "@/utils";

export function MealTimingCard({ data }: { data: NutritionProgressData }) {
  if (data.avg_first_meal_time === null) return null;

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Meal Timing</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            First meal
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {data.avg_first_meal_time}
          </p>
          <p className="text-xs text-muted-foreground">avg start</p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Last meal
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {data.avg_last_meal_time}
          </p>
          <p className="text-xs text-muted-foreground">avg end</p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Eating window
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {data.avg_eating_window_minutes !== null
              ? `${Math.floor(data.avg_eating_window_minutes / 60)}h ${data.avg_eating_window_minutes % 60}m`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">avg duration</p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Late meals
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              data.late_meal_days > 3 ? "text-chart-1" : "text-foreground"
            )}
          >
            {data.late_meal_days}
          </p>
          <p className="text-xs text-muted-foreground">days after 9 PM</p>
        </div>
      </div>
      {data.late_meal_days > data.days_logged * 0.3 ? (
        <p className="text-sm text-muted-foreground">
          Meals were logged after 9 PM on {data.late_meal_days} days in this period.
        </p>
      ) : null}
    </section>
  );
}
