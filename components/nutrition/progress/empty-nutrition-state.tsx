"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PANEL_CLASS } from "./_constants";
import { cn } from "@/utils";
import type { NutritionProgressRange } from "@/types/nutrition-progress";

export function EmptyNutritionState({ range }: { range: NutritionProgressRange }) {
  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            No nutrition data for this period
          </h2>
          <p className="text-sm text-muted-foreground">
            Start logging your meals to see calories, macros, and compliance trends here.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Looking at the last {range} days. Try a shorter range if you&apos;ve only just started logging.
      </p>
      <Button asChild className="accent-strong rounded-xl text-black">
        <Link href="/nutrition">Go to Nutrition Log</Link>
      </Button>
    </section>
  );
}
