"use client";

import type { NutritionProgressData } from "@/types/nutrition-progress";
import { getInsightTone } from "./_shared";
import { cn } from "@/utils";

export function NutritionInsightsSection({ data }: { data: NutritionProgressData }) {
  if (data.insights.length === 0) return null;

  const leadInsight = data.insights[0];
  const leadTone = getInsightTone(leadInsight.type);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Insights</h2>
        <span className="text-xs text-muted-foreground">
          {data.insights.length} signal{data.insights.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[10px] border border-white/10 bg-[#101a30]/55 p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className={cn("rounded-lg p-1.5", leadTone.iconBgClass)}>
              <leadTone.Icon className={cn("h-4 w-4", leadTone.iconClass)} />
            </div>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                leadTone.badgeClass
              )}
            >
              Lead insight
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/95">
            {leadInsight.text}
          </p>
        </div>
        <ol className="rounded-[10px] border border-white/10 bg-[#0f172b]/35">
          {data.insights.map((insight, index) => {
            const tone = getInsightTone(insight.type);
            return (
              <li
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  index !== data.insights.length - 1 && "border-b border-white/10"
                )}
              >
                <span className={cn("mt-[7px] inline-block h-2 w-2 rounded-full", tone.dotClass)} />
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {tone.label}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {insight.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
