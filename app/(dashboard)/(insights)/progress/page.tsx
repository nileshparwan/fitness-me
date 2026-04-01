"use client";

import { Suspense, startTransition, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Apple, Download, Share2 } from "lucide-react";

import {
  getProgressOverviewBundle,
  type ProgressRange,
  type ProgressTrainingType,
} from "@/app/actions/progress-overview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NutritionProgressPage } from "@/components/nutrition/progress/nutrition-progress-page";
import { CycleTabContent } from "@/components/cycle/cycle-tab-content";
import { CycleTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";
import { progressOverviewKeys } from "@/lib/query-keys-progress";

const PROGRESS_TABS = ["overview", "body", "strength", "cardio", "nutrition", "health", "cycle"] as const;
type ProgressTab = (typeof PROGRESS_TABS)[number];

export default function ProgressPage() {
  const [range, setRange] = useState<ProgressRange>("30d");
  const [trainingType, setTrainingType] = useState<ProgressTrainingType>("mixed");
  const [compare, setCompare] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedTab = searchParams.get("tab");
  const activeTab: ProgressTab = PROGRESS_TABS.includes(requestedTab as ProgressTab) ? (requestedTab as ProgressTab) : "overview";

  const overviewQuery = useQuery({
    queryKey: progressOverviewKeys.bundle(range, trainingType, compare),
    queryFn: () => getProgressOverviewBundle(range, trainingType, compare),
    staleTime: 1000 * 60 * 5,
  });
  const overview = overviewQuery.data;
  const isLoadingOverview = overviewQuery.isLoading;
  const setTab = (nextTab: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="page-shell section-gap overflow-x-hidden pb-16">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <section className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
          <p className="text-sm text-muted-foreground">Track your training, body, and habits</p>
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/progress/nutrition">
              <Apple className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nutrients</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" disabled className="rounded-[10px]">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={(value) => setTab(value)} className="space-y-6">
        <TabsList variant="line" className="flex w-full flex-wrap gap-1 rounded-none bg-transparent p-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="cardio">Cardio</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="cycle">Cycle</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
          <ProgressStatsBar data={overview?.summary} isLoading={isLoadingOverview} trainingType={trainingType} />
          <ProgressInsights insights={overview?.insights ?? []} isLoading={isLoadingOverview} />
        </TabsContent>

        <TabsContent value="body" className="space-y-6">
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
          <BodyCompositionCard
            series={overview?.body_composition.current ?? []}
            compareSeries={overview?.body_composition.compare ?? []}
            compare={compare}
            isLoading={isLoadingOverview}
          />
        </TabsContent>

        <TabsContent value="strength" className="space-y-6">
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <StrengthProgressCard
              data={overview?.strength.current}
              compareData={overview?.strength.compare ?? undefined}
              compare={compare}
              isLoading={isLoadingOverview}
              latestWeightKg={overview?.summary?.latest_weight ?? null}
            />
            <MuscleFocusCard
              focusDistribution={overview?.strength.current?.focus_distribution ?? []}
              muscleVolume={overview?.strength.current?.muscle_volume ?? []}
              isLoading={isLoadingOverview}
            />
          </section>
        </TabsContent>

        <TabsContent value="cardio" className="space-y-6">
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
          <CardioProgressCard
            data={overview?.cardio.current ?? { series: [], activity_breakdown: [], hr_zones_summary: null }}
            compareData={overview?.cardio.compare ?? undefined}
            compare={compare}
            isLoading={isLoadingOverview}
            vo2maxEstimate={overview?.summary?.vo2max_estimate ?? null}
          />
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-6">
          <NutritionProgressPage embedded={true} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <ProgressFilterBar
            range={range}
            onRangeChange={setRange}
            trainingType={trainingType}
            onTrainingTypeChange={setTrainingType}
            compare={compare}
            onCompareChange={setCompare}
          />
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TrainingLoadCard
              data={overview?.training_load.current}
              compareData={overview?.training_load.compare ?? undefined}
              compare={compare}
              isLoading={isLoadingOverview}
            />
            <ComplianceRecoveryCard
              data={overview?.compliance.current}
              compareData={overview?.compliance.compare ?? undefined}
              compare={compare}
              isLoading={isLoadingOverview}
            />
          </section>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WorkoutCalendarCard rows={overview?.compliance.current?.workout_calendar ?? []} isLoading={isLoadingOverview} />
            <div className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-5">
              <h2 className="text-xl font-semibold">Health Summary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                HRV, resting heart rate, sleep, and readiness data are surfaced in the recovery card until the dedicated
                health charts land.
              </p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="cycle" className="space-y-6">
          <Suspense fallback={<CycleTabSkeleton />}>
            <CycleTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
