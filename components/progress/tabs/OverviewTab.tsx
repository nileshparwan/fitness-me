"use client";

import { Calendar, Dumbbell, Trophy } from "lucide-react";

import type { ProgressOverviewBundle, ProgressTrainingType } from "@/app/actions/progress-overview";
import { ComplianceSection } from "@/components/progress/ComplianceSection";
import { HumanBodyMap } from "@/components/progress/HumanBodyMap";
import { InsightPanel } from "@/components/progress/InsightPanel";
import { KPICards } from "@/components/progress/KPICards";
import { ConsistencyStreaks } from "@/components/progress/overview/consistency-streaks";
import { WellnessSnapshot } from "@/components/progress/overview/wellness-snapshot";
import { OverviewTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type OverviewTabProps = {
  bundle: ProgressOverviewBundle | undefined;
  isLoading: boolean;
  compare: boolean;
  trainingType: ProgressTrainingType;
};

export function OverviewTab({
  bundle,
  isLoading,
  compare,
  trainingType,
}: OverviewTabProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (isLoading && !bundle) {
    return <OverviewTabSkeleton />;
  }

  const recentPrs = bundle?.strength.current.recent_prs ?? [];
  const weeklyRows = bundle?.compliance.current.workouts_per_week ?? [];

  return (
    <div className="space-y-6">
      <KPICards
        data={bundle?.summary}
        compareData={bundle?.summary_compare}
        comparePrevious={compare}
        trainingType={trainingType}
      />

      <InsightPanel insights={bundle?.insights ?? []} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <HumanBodyMap
            muscles={bundle?.muscleActivation ?? []}
            title="Muscle Activation Snapshot"
            description="A live view of the muscle groups you emphasized in the selected period."
            posteriorMuscles={bundle?.posteriorMuscles}
            mapping={bundle?.muscleMapping}
          />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-4">
            <h3 className="text-sm font-semibold text-foreground">Wellness Snapshot</h3>
            <div className="mt-4">
              <WellnessSnapshot
                summary={bundle?.summary}
                compliance={bundle?.compliance.current}
                isLoading={isLoading}
              />
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-4">
            <h3 className="text-sm font-semibold text-foreground">Consistency</h3>
            <div className="mt-4">
              <ConsistencyStreaks data={bundle?.compliance.current} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>

      {recentPrs.length > 0 ? (
        <section className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#efb241]" />
            <h3 className="text-lg font-semibold text-foreground">Recent Personal Records</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {recentPrs.slice(0, 3).map((pr) => (
              <div key={`${pr.exercise}-${pr.achieved_on}`} className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-[#131b2f]/60 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efb2411a] text-[#efb241]">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{pr.exercise}</p>
                  <p className="text-xs text-muted-foreground">{pr.achieved_on}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-foreground">
                    {displayWeight(pr.estimated_1rm_kg, system)?.toFixed(1)} {labels.weight}
                  </p>
                  <p className="text-xs text-[#5ed28f]">
                    +{displayWeight(pr.delta_kg, system)?.toFixed(1)} {labels.weight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#5b9cff]" />
          <h3 className="text-lg font-semibold text-foreground">Weekly Training Summary</h3>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-2">Week</th>
                <th className="py-2 text-center">Days</th>
                <th className="py-2 text-center">Target</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {weeklyRows.length > 0 ? (
                weeklyRows.map((row, index) => {
                  const target = 5;
                  const hit = row.session_count >= target;
                  return (
                    <tr key={row.week_start} className="border-b border-white/5 last:border-0">
                      <td className="py-3 font-medium text-foreground">Week {index + 1}</td>
                      <td className="py-3 text-center text-foreground">{row.session_count}</td>
                      <td className="py-3 text-center text-muted-foreground">{target}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${
                            hit ? "bg-[#5ed28f]/12 text-[#5ed28f]" : "bg-[#efb241]/12 text-[#efb241]"
                          }`}
                        >
                          {hit ? "Hit" : "Missed"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No weekly training data in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ComplianceSection
        data={bundle?.compliance.current}
        compareData={bundle?.compliance.compare}
        compare={compare}
        isLoading={isLoading}
      />
    </div>
  );
}

