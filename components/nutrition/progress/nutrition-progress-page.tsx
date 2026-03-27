"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Flame,
  RefreshCcw,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { getNutritionProgressAction } from "@/app/actions/nutrition-progress";
import { Button } from "@/components/ui/button";
import { resolveNutritionSubject } from "@/hooks/use-nutrition-data";
import { progressKeys } from "@/lib/query-keys-progress";
import { useNutritionActiveSubject } from "@/stores/use-nutrition-ui-store";
import type { NutritionProgressRange } from "@/types/nutrition-progress";
import { cn } from "@/utils";
import { CaloriesChart } from "./calories-chart";
import { ComplianceScoreCard } from "./compliance-score-card";
import { DayOfWeekCard } from "./day-of-week-card";
import { DeficitSurplusChart } from "./deficit-surplus-chart";
import { EmptyNutritionState } from "./empty-nutrition-state";
import { FiberChart } from "./fiber-chart";
import { LoggingCalendar } from "./logging-calendar";
import { MacrosChart } from "./macros-chart";
import { MacroDistributionCard } from "./macro-distribution-card";
import { MealBreakdownCard } from "./meal-breakdown-card";
import { MealTimingCard } from "./meal-timing-card";
import { MicronutrientPlaceholder } from "./micronutrient-placeholder";
import { NutritionInsightsSection } from "./nutrition-insights-section";
import { NutritionOverviewStats } from "./nutrition-overview-stats";
import { NutritionProgressSkeleton } from "./nutrition-progress-skeleton";
import { TopFoodsCard } from "./top-foods-card";
import { DailyDetailTable } from "./daily-detail-table";
import { PANEL_CLASS, RANGES } from "./_constants";
import {
  addDaysToDate,
  computeMacroRatioForTargets,
  dateDiffInDays,
  exportNutritionProgressCSV,
  formatDateRange,
  type NutritionProgressChartRow,
} from "./_shared";

type NutritionProgressPageProps = {
  embedded?: boolean;
};

export function NutritionProgressPage({
  embedded = false,
}: NutritionProgressPageProps) {
  const [range, setRange] = useState<NutritionProgressRange>(90);
  const [compareMode, setCompareMode] = useState(false);

  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const subject = useMemo(
    () => resolveNutritionSubject(activeSubjectType, activeSubjectId),
    [activeSubjectId, activeSubjectType]
  );
  const subjectKey = useMemo(() => {
    if (subject?.subject_client_id) return `client:${subject.subject_client_id}`;
    if (subject?.subject_user_id) return `user:${subject.subject_user_id}`;
    return "self";
  }, [subject]);

  const query = useQuery({
    queryKey: progressKeys.nutrition({ range, subjectKey }),
    queryFn: () => getNutritionProgressAction({ range, ...(subject || {}) }),
    staleTime: 300_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  const compareWindow = useMemo(() => {
    if (!data) return null;
    const previousEndDate = addDaysToDate(data.start_date, -1);
    const previousStartDate = addDaysToDate(previousEndDate, -(data.days_in_range - 1));
    return { start_date: previousStartDate, end_date: previousEndDate };
  }, [data]);

  const compareQuery = useQuery({
    queryKey: [
      ...progressKeys.nutrition({ range, subjectKey }),
      "compare",
      compareWindow?.start_date ?? null,
      compareWindow?.end_date ?? null,
    ],
    queryFn: () =>
      getNutritionProgressAction({
        range,
        ...(subject || {}),
        start_date: compareWindow?.start_date,
        end_date: compareWindow?.end_date,
      }),
    staleTime: 300_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    enabled: compareMode && Boolean(compareWindow),
    placeholderData: keepPreviousData,
  });

  const chartRows = useMemo<NutritionProgressChartRow[]>(() => {
    if (!data) return [];
    const currentByDate = new Map(data.daily_rows.map((row) => [row.date, row] as const));
    const compareByDate = new Map<string, (typeof data.daily_rows)[number]>();

    if (compareMode && compareWindow && compareQuery.data) {
      for (const row of compareQuery.data.daily_rows) {
        const offset = dateDiffInDays(compareWindow.start_date, row.date);
        compareByDate.set(addDaysToDate(data.start_date, offset), row);
      }
    }

    return Array.from({ length: data.days_in_range }, (_, index) => {
      const date = addDaysToDate(data.start_date, index);
      const current = currentByDate.get(date);
      const previous = compareByDate.get(date);
      return {
        date,
        calories: current?.calories ?? null,
        protein_g: current?.protein_g ?? null,
        carbs_g: current?.carbs_g ?? null,
        fat_g: current?.fat_g ?? null,
        fiber_g: current?.fiber_g ?? null,
        deficit_surplus: current?.deficit_surplus ?? null,
        rolling_avg_7: current?.rolling_avg_7 ?? null,
        compare_calories: previous?.calories ?? null,
        compare_protein_g: previous?.protein_g ?? null,
        compare_carbs_g: previous?.carbs_g ?? null,
        compare_fat_g: previous?.fat_g ?? null,
        compare_fiber_g: previous?.fiber_g ?? null,
      };
    });
  }, [compareMode, compareQuery.data, compareWindow, data]);

  const targetRatio = useMemo(
    () => (data ? computeMacroRatioForTargets(data.targets) : null),
    [data]
  );

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const payload = {
      title: "Nutrition Progress",
      text: "Nutrition progress snapshot",
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  return (
    <div className="section-gap">
      {!embedded ? (
        <section className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Link
                  href="/progress"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back to progress</span>
                </Link>
                <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  Nutrition Progress
                </h1>
              </div>
              <p className="pl-10 text-sm text-muted-foreground">
                Calories, macros, and dietary insights
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-white/10 bg-[#0f172b]/75 text-muted-foreground hover:bg-[#18223b] hover:text-foreground" onClick={() => void handleShare()} aria-label="Share progress"><Share2 className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-white/10 bg-[#0f172b]/75 text-muted-foreground hover:bg-[#18223b] hover:text-foreground" onClick={() => data && exportNutritionProgressCSV(data)} disabled={!data} aria-label="Export progress as CSV"><Download className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>
      ) : null}

      {query.isError && !data ? (
        <section className={PANEL_CLASS}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Unable to load nutrition progress</p>
              <p className="text-sm text-muted-foreground">
                {query.error instanceof Error ? query.error.message : "Something went wrong while loading this page."}
              </p>
            </div>
            <Button type="button" variant="outline" className="w-fit rounded-xl border-border/60" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      {!data && query.isPending ? <NutritionProgressSkeleton showHeader={false} /> : null}

      {data ? (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0f172b]/80 p-1">
                {RANGES.map((value) => (
                  <button key={value} type="button" className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", range === value ? "bg-[#d15d7c] text-[#170914]" : "text-muted-foreground hover:text-foreground")} onClick={() => setRange(value)}>{value} Days</button>
                ))}
                <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground" aria-label="Calendar range"><CalendarDays className="h-4 w-4" /></button>
              </div>
              <button type="button" role="switch" aria-checked={compareMode} className={cn("relative inline-flex h-7 w-12 items-center rounded-full border transition-colors", compareMode ? "border-[#d15d7c]/65 bg-[#d15d7c]/85" : "border-white/15 bg-[#0f172b]")} onClick={() => setCompareMode((current) => !current)}><span className={cn("inline-block h-5 w-5 transform rounded-full bg-[#060b18] transition-transform", compareMode ? "translate-x-6" : "translate-x-1")} /></button>
              <span className="text-sm text-muted-foreground">Compare</span>
              {compareMode && compareQuery.data && compareQuery.data.days_logged === 0 ? <span className="text-xs text-muted-foreground">No data in previous period</span> : null}
              {query.isFetching || (compareMode && compareQuery.isFetching) ? <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><RefreshCcw className="h-3.5 w-3.5 animate-spin" />Updating</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDateRange(data.start_date, data.end_date)}</span>
              <span>•</span>
              <span>{data.days_logged} of {data.days_in_range} days logged</span>
              {data.logging_streak > 1 ? <><span>•</span><span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-chart-1" />{data.logging_streak}-day streak</span></> : null}
            </div>
          </section>

          {data.days_logged === 0 ? <EmptyNutritionState range={range} /> : null}

          {data.days_logged > 0 ? (
            <>
              <div className="h-px w-full bg-border/35" />
              <NutritionOverviewStats data={data} />
              <NutritionInsightsSection data={data} />
              <CaloriesChart rows={chartRows} compareMode={compareMode} targets={data.targets} />
              <MacrosChart rows={chartRows} compareMode={compareMode} targets={data.targets} />
              <div className="grid gap-4 xl:grid-cols-2">
                <FiberChart rows={chartRows} compareMode={compareMode} />
                <ComplianceScoreCard data={data} />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <MealBreakdownCard data={data} />
                <TopFoodsCard data={data} />
              </div>
              <DeficitSurplusChart data={data} />
              <DayOfWeekCard data={data} />
              <DailyDetailTable rows={data.daily_rows} />
              <LoggingCalendar data={data} />
              <MealTimingCard data={data} />
              <MacroDistributionCard data={data} targetRatio={targetRatio} />
            </>
          ) : null}
        </>
      ) : null}

      <MicronutrientPlaceholder />
    </div>
  );
}
