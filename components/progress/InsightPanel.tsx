"use client";

import { AlertTriangle, Lightbulb, TrendingUp } from "lucide-react";

import type { ProgressInsight } from "@/app/actions/progress-overview";

type InsightPanelProps = {
  insights: ProgressInsight[];
};

const STYLE_MAP = {
  positive: {
    Icon: TrendingUp,
    card: "border-[#5ed28f]/20 bg-[#123227]/40",
    icon: "text-[#5ed28f]",
  },
  warning: {
    Icon: AlertTriangle,
    card: "border-[#efb241]/20 bg-[#352a17]/35",
    icon: "text-[#efb241]",
  },
  info: {
    Icon: Lightbulb,
    card: "border-[#5b9cff]/20 bg-[#142946]/40",
    icon: "text-[#5b9cff]",
  },
} as const;

export function InsightPanel({ insights }: InsightPanelProps) {
  if (insights.length === 0) return null;

  return (
    <section className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-5">
      <h2 className="text-lg font-semibold text-foreground">Insights</h2>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
          const tone = STYLE_MAP[insight.severity];
          return (
            <article key={insight.id} className={`rounded-[14px] border p-3 ${tone.card}`}>
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <tone.Icon className={`h-4 w-4 ${tone.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

