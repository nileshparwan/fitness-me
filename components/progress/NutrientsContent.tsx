"use client";

import { NutritionProgressPage } from "@/components/nutrition/progress/nutrition-progress-page";

type NutrientsContentProps = {
  embedded?: boolean;
};

export function NutrientsContent({ embedded = true }: NutrientsContentProps) {
  return (
    <div className="space-y-6">
      <NutritionProgressPage embedded={embedded} />
    </div>
  );
}

