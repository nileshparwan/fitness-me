"use client";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { PANEL_CLASS } from "./_constants";
import { cn } from "@/utils";

export function TopFoodsCard({ data }: { data: NutritionProgressData }) {
  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Top Foods</h2>
      {data.top_foods.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No food items logged in this period.
        </p>
      ) : (
        <ol className="divide-y divide-border/30">
          {data.top_foods.map((food, index) => (
            <li key={food.name} className="flex items-center gap-3 py-3">
              <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                {index + 1}.
              </span>
              <span className="flex-1 truncate text-sm font-medium">{food.name}</span>
              <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-xs tabular-nums">
                {food.count}x
              </span>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {food.avg_calories} cal
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
