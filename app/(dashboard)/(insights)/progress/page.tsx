"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2 } from "lucide-react";

import {
  getProgressOverviewBundle,
  type ProgressRange,
  type ProgressTrainingType,
} from "@/app/actions/progress-overview";
import { Button } from "@/components/ui/button";
import { ProgressFilterBar } from "@/components/progress/overview/progress-filter-bar";
import { ProgressStatsBar } from "@/components/progress/overview/progress-stats-bar";
import { ProgressInsights } from "@/components/progress/overview/progress-insights";
import { BodyCompositionCard } from "@/components/progress/overview/body-composition-card";
import { StrengthProgressCard } from "@/components/progress/overview/strength-progress-card";
import { CardioProgressCard } from "@/components/progress/overview/cardio-progress-card";
import { ComplianceRecoveryCard } from "@/components/progress/overview/compliance-recovery-card";
import { TrainingLoadCard } from "@/components/progress/overview/training-load-card";
import { MuscleFocusCard } from "@/components/progress/overview/muscle-focus-card";
import { WorkoutCalendarCard } from "@/components/progress/overview/workout-calendar-card";
import { progressOverviewKeys } from "@/lib/query-keys-progress";

export default function ProgressPage() {
  const [range, setRange] = useState<ProgressRange>("30d");
  const [trainingType, setTrainingType] = useState<ProgressTrainingType>("mixed");
  const [compare, setCompare] = useState(false);

  const overviewQuery = useQuery({
    queryKey: progressOverviewKeys.bundle(range, trainingType, compare),
    queryFn: () => getProgressOverviewBundle(range, trainingType, compare),
    staleTime: 1000 * 60 * 5,
  });
  const overview = overviewQuery.data;
  const isLoadingOverview = overviewQuery.isLoading;

  return (
    <div className="page-shell section-gap overflow-x-hidden pb-16">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <section className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
          <p className="text-sm text-muted-foreground">Track your training, body, and habits</p>
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/progress/nutrition">Nutrients</Link>
          </Button>
          <Button variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ProgressFilterBar
        range={range}
        onRangeChange={setRange}
        trainingType={trainingType}
        onTrainingTypeChange={setTrainingType}
        compare={compare}
        onCompareChange={setCompare}
      />

      <ProgressStatsBar data={overview?.summary} isLoading={isLoadingOverview} trainingType={trainingType} />

      <TrainingLoadCard
        data={overview?.training_load.current}
        compareData={overview?.training_load.compare ?? undefined}
        compare={compare}
        isLoading={isLoadingOverview}
      />

      <ProgressInsights insights={overview?.insights ?? []} isLoading={isLoadingOverview} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BodyCompositionCard
          series={overview?.body_composition.current ?? []}
          compareSeries={overview?.body_composition.compare ?? []}
          compare={compare}
          isLoading={isLoadingOverview}
        />
        <StrengthProgressCard
          data={overview?.strength.current}
          compareData={overview?.strength.compare ?? undefined}
          compare={compare}
          isLoading={isLoadingOverview}
          latestWeightKg={overview?.summary?.latest_weight_kg ?? null}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardioProgressCard
          data={overview?.cardio.current ?? { series: [], activity_breakdown: [], hr_zones_summary: null }}
          compareData={overview?.cardio.compare ?? undefined}
          compare={compare}
          isLoading={isLoadingOverview}
          vo2maxEstimate={overview?.summary?.vo2max_estimate ?? null}
        />
        <ComplianceRecoveryCard
          data={overview?.compliance.current}
          compareData={overview?.compliance.compare ?? undefined}
          compare={compare}
          isLoading={isLoadingOverview}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <MuscleFocusCard
          focusDistribution={overview?.strength.current?.focus_distribution ?? []}
          muscleVolume={overview?.strength.current?.muscle_volume ?? []}
          isLoading={isLoadingOverview}
        />
        <WorkoutCalendarCard rows={overview?.compliance.current?.workout_calendar ?? []} isLoading={isLoadingOverview} />
      </section>
    </div>
  );
}
