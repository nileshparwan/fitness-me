"use client";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { PANEL_CLASS } from "./_constants";
import { MacroDonut } from "./_shared";
import { cn } from "@/utils";

export function MacroDistributionCard({
  data,
  targetRatio,
}: {
  data: NutritionProgressData;
  targetRatio: { protein: number; carbs: number; fat: number } | null;
}) {
  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Macro Distribution</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Actual (this period)</p>
          <MacroDonut
            protein={data.protein_pct_of_calories}
            carbs={data.carbs_pct_of_calories}
            fat={data.fat_pct_of_calories}
          />
        </div>
        {data.targets.source !== "none" && targetRatio ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Target</p>
            <MacroDonut
              protein={targetRatio.protein}
              carbs={targetRatio.carbs}
              fat={targetRatio.fat}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
