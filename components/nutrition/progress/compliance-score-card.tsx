"use client";

import { Info } from "lucide-react";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { PANEL_CLASS, SUB_PANEL_CLASS } from "./_constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils";

export function ComplianceScoreCard({ data }: { data: NutritionProgressData }) {
  return (
    <div className={cn(PANEL_CLASS, "flex flex-col gap-5")}>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Compliance Score</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Compliance score help"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Based on plus/minus 15% tolerance for all 4 macros. Partial days excluded.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {data.targets.source === "none" ? (
        <p className="text-sm text-muted-foreground">
          Set macro targets in goals to track compliance.
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1">
            <p className="text-6xl font-bold tabular-nums leading-none">
              {data.compliance_score}%
            </p>
            <p className="text-sm text-muted-foreground">
              Average daily macro compliance
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Cal", value: data.cal_compliance },
              { label: "Protein", value: data.protein_compliance },
              { label: "Carbs", value: data.carbs_compliance },
              { label: "Fat", value: data.fat_compliance },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(SUB_PANEL_CLASS, "flex flex-col items-center gap-1 rounded-xl p-2")}
              >
                <p className="text-lg font-semibold tabular-nums">{item.value}%</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
