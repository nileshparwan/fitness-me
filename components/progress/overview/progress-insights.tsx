"use client";

import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ProgressInsight } from "@/app/actions/progress-overview";

type Props = {
  insights: ProgressInsight[];
  isLoading: boolean;
};

function toneForInsight(severity: ProgressInsight["severity"]) {
  if (severity === "positive") {
    return {
      Icon: CheckCircle2,
      iconClass: "text-[#5ed28f]",
      borderClass: "border-l-[#5ed28f]",
      panelClass: "bg-[#123227]/45",
    };
  }
  if (severity === "warning") {
    return {
      Icon: AlertTriangle,
      iconClass: "text-[#efb241]",
      borderClass: "border-l-[#efb241]",
      panelClass: "bg-[#352a17]/35",
    };
  }
  return {
    Icon: Lightbulb,
    iconClass: "text-[#5b9cff]",
    borderClass: "border-l-[#5b9cff]",
    panelClass: "bg-[#142946]/45",
  };
}

export function ProgressInsights({ insights, isLoading }: Props) {
  if (isLoading) {
    return (
      <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
        <h2 className="text-xl font-semibold">Insights</h2>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-[12px]" />
          ))}
        </div>
      </section>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h2 className="text-xl font-semibold">Insights</h2>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
          const tone = toneForInsight(insight.severity);
          return (
            <article
              key={insight.id}
              className={`rounded-[12px] border border-white/10 border-l-4 p-3 ${tone.panelClass} ${tone.borderClass}`}
            >
              <div className="flex items-start gap-3">
                <tone.Icon className={`mt-0.5 h-4 w-4 ${tone.iconClass}`} />
                <div>
                  <p className="font-semibold text-foreground">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.body}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
