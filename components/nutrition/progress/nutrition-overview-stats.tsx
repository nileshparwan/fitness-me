"use client";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { SUB_PANEL_CLASS } from "./_constants";
import { StatCard, deltaClassName } from "./_shared";
import { cn } from "@/utils";

export function NutritionOverviewStats({ data }: { data: NutritionProgressData }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Avg Cal"
          value={data.avg_calories}
          unit="kcal"
          delta={data.deltas.avg_calories}
          deltaUnit=" kcal"
          deltaClassName={deltaClassName({
            label: "calories",
            delta: data.deltas.avg_calories,
            currentValue: data.avg_calories,
            targetCalories: data.targets.calories,
          })}
        />
        <StatCard
          label="Avg Protein"
          value={data.avg_protein_g}
          unit="g"
          delta={data.deltas.avg_protein_g}
          deltaUnit=" g"
          deltaClassName={deltaClassName({
            label: "protein",
            delta: data.deltas.avg_protein_g,
            currentValue: data.avg_protein_g,
            targetCalories: data.targets.calories,
          })}
        />
        <StatCard
          label="Avg Carbs"
          value={data.avg_carbs_g}
          unit="g"
          delta={data.deltas.avg_carbs_g}
          deltaUnit=" g"
          deltaClassName={deltaClassName({
            label: "carbs",
            delta: data.deltas.avg_carbs_g,
            currentValue: data.avg_carbs_g,
            targetCalories: data.targets.calories,
          })}
        />
        <StatCard
          label="Avg Fat"
          value={data.avg_fat_g}
          unit="g"
          delta={data.deltas.avg_fat_g}
          deltaUnit=" g"
          deltaClassName={deltaClassName({
            label: "fat",
            delta: data.deltas.avg_fat_g,
            currentValue: data.avg_fat_g,
            targetCalories: data.targets.calories,
          })}
        />
        <StatCard
          label="Compliance"
          value={data.compliance_score}
          unit="%"
          delta={data.deltas.compliance_score}
          deltaUnit="%"
          deltaClassName={deltaClassName({
            label: "compliance",
            delta: data.deltas.compliance_score,
            currentValue: data.compliance_score,
            targetCalories: data.targets.calories,
          })}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Days Logged
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {data.days_logged}
            <span className="text-sm text-muted-foreground">/{data.days_in_range}</span>
          </p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Best Streak
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {data.longest_streak}
            <span className="text-sm text-muted-foreground"> days</span>
          </p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Perfect Days
          </p>
          <p className="text-xl font-semibold tabular-nums">{data.perfect_days}</p>
        </div>
        <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            Avg Fiber
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {data.avg_fiber_g}
            <span className="text-sm text-muted-foreground">g</span>
          </p>
        </div>
      </section>
    </>
  );
}
