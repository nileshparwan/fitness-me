"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Flame,
  Info,
  RefreshCcw,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getNutritionProgressAction } from "@/app/actions/nutrition-progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveNutritionSubject } from "@/hooks/use-nutrition-data";
import { progressKeys } from "@/lib/query-keys-progress";
import { useNutritionActiveSubject } from "@/stores/use-nutrition-ui-store";
import type {
  NutritionProgressData,
  NutritionProgressDayRow,
  NutritionProgressRange,
  NutritionProgressTargets,
} from "@/types/nutrition-progress";
import { cn } from "@/utils";
import { NutritionProgressSkeleton } from "./nutrition-progress-skeleton";

const RANGES: NutritionProgressRange[] = [7, 30, 90];
const PANEL_CLASS =
  "glass-surface rounded-[26px] border border-white/10 bg-[#0b1224]/85 p-4 shadow-[0_24px_44px_-30px_rgba(0,0,0,0.92)] md:p-5";
const SUB_PANEL_CLASS =
  "glass-subtle rounded-[10px] border border-white/10 bg-[#101a30]/70";
const GRID_COLOR = "rgba(147, 162, 193, 0.2)";
const AXIS_COLOR = "#7f8ba8";
const CALORIES_BAR_COLOR = "#d15d7c";
const CALORIES_LINE_COLOR = "#4fa2ff";
const FIBER_COLOR = "#51c28b";
const WEEKDAY_BAR_COLOR = "#d15d7c";
const WEEKEND_BAR_COLOR = "#efb241";
const DEFICIT_POSITIVE_COLOR = "#51c28b";
const DEFICIT_NEGATIVE_COLOR = "#d15d7c";
const ZERO_LINE_COLOR = "#4f5f80";
const LOGGING_LEVEL_COLORS = {
  logged_on_target: "#51c28b",
  logged_off_target: "#efb241",
  partial_log: "#cf8b2e",
  logged_no_target: "rgba(142, 160, 198, 0.9)",
  not_logged: "rgba(142, 160, 198, 0.58)",
} as const;
const MEAL_TYPE_PIE_COLORS = [
  "#ea5479",
  "#51c28b",
  "#4f9cff",
  "#efb241",
  "#9f88f0",
  "#7f8ba8",
];
const MACRO_COLORS = {
  protein: "#ea5479",
  carbs: "#4f9cff",
  fat: "#efb241",
} as const;
const MEAL_BREAKDOWN_COLORS: Record<string, string> = {
  breakfast: "#efb241",
  lunch: "#61c98f",
  dinner: "#ea5479",
  snack: "#4f9cff",
  snacks: "#4f9cff",
  other: "#9f88f0",
};

function resolveMealBreakdownColor(mealType: string, index: number) {
  return MEAL_BREAKDOWN_COLORS[mealType.toLowerCase()] ?? MEAL_TYPE_PIE_COLORS[index % MEAL_TYPE_PIE_COLORS.length];
}

function getInsightTone(type: "success" | "warning" | "info") {
  if (type === "success") {
    return {
      label: "Win",
      Icon: CheckCircle2,
      iconClass: "text-chart-2",
      iconBgClass: "bg-chart-2/15",
      badgeClass: "border-chart-2/35 text-chart-2",
      dotClass: "bg-chart-2",
    };
  }
  if (type === "warning") {
    return {
      label: "Attention",
      Icon: AlertCircle,
      iconClass: "text-chart-4",
      iconBgClass: "bg-chart-4/15",
      badgeClass: "border-chart-4/35 text-chart-4",
      dotClass: "bg-chart-4",
    };
  }
  return {
    label: "Observation",
    Icon: Info,
    iconClass: "text-chart-3",
    iconBgClass: "bg-chart-3/15",
    badgeClass: "border-chart-3/35 text-chart-3",
    dotClass: "bg-chart-3",
  };
}

function formatChartDate(value: string) {
  try {
    return format(parseISO(value), "MM-dd");
  } catch {
    return value;
  }
}

function formatTableDate(value: string) {
  try {
    return format(parseISO(value), "MM-dd");
  } catch {
    return value;
  }
}

function formatDateRange(startDate: string, endDate: string) {
  try {
    return `${format(parseISO(startDate), "MMM dd")} - ${format(parseISO(endDate), "MMM dd")}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

function addDaysToDate(value: string, days: number) {
  const next = parseDateInput(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function dateDiffInDays(fromDate: string, toDate: string) {
  const from = parseDateInput(fromDate).getTime();
  const to = parseDateInput(toDate).getTime();
  return Math.round((to - from) / 86_400_000);
}

function computeMacroRatioForTargets(targets: NutritionProgressTargets) {
  const proteinCalories = targets.protein_g * 4;
  const carbsCalories = targets.carbs_g * 4;
  const fatCalories = targets.fat_g * 9;
  const total = proteinCalories + carbsCalories + fatCalories;

  if (total <= 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round((proteinCalories / total) * 100),
    carbs: Math.round((carbsCalories / total) * 100),
    fat: Math.round((fatCalories / total) * 100),
  };
}

function deltaClassName({
  label,
  delta,
  currentValue,
  targetCalories,
}: {
  label: "calories" | "protein" | "carbs" | "fat" | "compliance";
  delta: number | null;
  currentValue: number;
  targetCalories: number;
}) {
  if (delta === null || delta === 0) return "text-muted-foreground";

  if (label === "calories") {
    if (targetCalories <= 0) return "text-muted-foreground";

    const previousValue = currentValue - delta;
    const previousDistance = Math.abs(previousValue - targetCalories);
    const currentDistance = Math.abs(currentValue - targetCalories);
    const fivePercent = Math.max(1, Math.round(targetCalories * 0.05));
    if (Math.abs(currentDistance - previousDistance) <= fivePercent) {
      return "text-muted-foreground";
    }
    return currentDistance < previousDistance ? "text-chart-2" : "text-chart-1";
  }

  if (label === "compliance") {
    return delta > 0 ? "text-chart-2" : "text-destructive";
  }

  return delta > 0 ? "text-chart-2" : "text-destructive";
}

function MacroDonut({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const rows = [
    { name: "Protein", value: protein, color: MACRO_COLORS.protein },
    { name: "Carbs", value: carbs, color: MACRO_COLORS.carbs },
    { name: "Fat", value: fat, color: MACRO_COLORS.fat },
  ];

  return (
    <div className={cn(SUB_PANEL_CLASS, "w-full p-4")}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                innerRadius={42}
                outerRadius={66}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Pie>
              <ChartTooltip
                formatter={(value: number) => [`${value}%`, "Ratio"]}
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid rgba(134, 150, 182, 0.35)",
                  backgroundColor: "rgba(10, 15, 29, 0.96)",
                }}
                itemStyle={{ color: "#e7edf8" }}
                labelStyle={{ color: "#e7edf8" }}
                cursor={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex w-full flex-col gap-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-muted-foreground">{row.name}</span>
              <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {row.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type NutritionProgressChartRow = {
  date: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  deficit_surplus: number | null;
  rolling_avg_7: number | null;
  compare_calories: number | null;
  compare_protein_g: number | null;
  compare_carbs_g: number | null;
  compare_fat_g: number | null;
  compare_fiber_g: number | null;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: NutritionProgressChartRow }>;
};

function CaloriesTooltip({
  active,
  payload,
  target,
}: ChartTooltipProps & { target: number }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const calories = row.calories ?? 0;
  const deficitSurplus = row.deficit_surplus ?? 0;

  return (
    <div className="rounded-[10px] border border-white/10 bg-[#121b2f]/95 p-3 text-xs shadow-2xl">
      <p className="mb-1 font-medium">{formatTableDate(row.date)}</p>
      <p className="text-sm font-semibold">{calories.toLocaleString()} kcal</p>
      {target > 0 ? (
        <>
          <p className="text-muted-foreground">Target: {target.toLocaleString()} kcal</p>
          <p
            className={cn(
              "font-medium",
              deficitSurplus >= 0 ? "text-chart-2" : "text-destructive"
            )}
          >
            {deficitSurplus >= 0 ? "+" : ""}
            {deficitSurplus.toLocaleString()} kcal
          </p>
        </>
      ) : (
        <p className="text-muted-foreground">Set calorie target to track variance</p>
      )}
    </div>
  );
}

function MacrosTooltip({
  active,
  payload,
  targets,
}: ChartTooltipProps & { targets: NutritionProgressTargets }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const protein = row.protein_g ?? 0;
  const carbs = row.carbs_g ?? 0;
  const fat = row.fat_g ?? 0;

  return (
    <div className="rounded-[10px] border border-white/10 bg-[#121b2f]/95 p-3 text-xs shadow-2xl">
      <p className="mb-1 font-medium">{formatTableDate(row.date)}</p>
      <p style={{ color: MACRO_COLORS.protein }}>
        Protein: {protein}g
        {targets.protein_g > 0 ? ` / ${targets.protein_g}g` : ""}
      </p>
      <p style={{ color: MACRO_COLORS.carbs }}>
        Carbs: {carbs}g
        {targets.carbs_g > 0 ? ` / ${targets.carbs_g}g` : ""}
      </p>
      <p style={{ color: MACRO_COLORS.fat }}>
        Fat: {fat}g
        {targets.fat_g > 0 ? ` / ${targets.fat_g}g` : ""}
      </p>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  unit: string;
  delta: number | null;
  deltaUnit: string;
  deltaClassName: string;
};

function StatCard({
  label,
  value,
  unit,
  delta,
  deltaUnit,
  deltaClassName,
}: StatCardProps) {
  return (
    <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-2 p-3 md:p-4")}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums leading-none md:text-3xl">
        {value}
        <span className="ml-1 text-base text-muted-foreground md:text-lg">{unit}</span>
      </p>
      {delta !== null ? (
        <p className={cn("text-xs font-medium", deltaClassName)}>
          {delta > 0 ? "+" : ""}
          {Math.round(delta)}
          {deltaUnit} vs prior period
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50">No prior data</p>
      )}
    </div>
  );
}

export function exportNutritionProgressCSV(data: NutritionProgressData) {
  const complianceByDate = new Map(
    data.daily_compliance.map((entry) => [entry.date, entry.level] as const)
  );
  const formatComplianceLabel = (
    level: NutritionProgressData["daily_compliance"][number]["level"] | undefined
  ) => {
    if (!level) return "";
    if (level === "logged_on_target") return "On target";
    if (level === "logged_off_target") return "Off target";
    if (level === "partial_log") return "Partial log";
    if (level === "logged_no_target") return "Logged no target";
    return "Not logged";
  };

  const headers = [
    "Date",
    "Calories",
    "Protein (g)",
    "Carbs (g)",
    "Fat (g)",
    "Fiber (g)",
    "Deficit/Surplus",
    "Compliance Status",
  ];
  const rows = data.daily_rows.map((row) => [
    row.date,
    row.calories,
    row.protein_g,
    row.carbs_g,
    row.fat_g,
    row.fiber_g,
    data.targets.calories > 0 ? row.deficit_surplus : "",
    formatComplianceLabel(complianceByDate.get(row.date)),
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nutrition-progress-${data.start_date}-to-${data.end_date}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function NutritionProgressPage() {
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
  const targetRatio = useMemo(
    () => (data ? computeMacroRatioForTargets(data.targets) : null),
    [data]
  );
  const hasRows = Boolean(data && data.daily_rows.length > 0);
  const tableRowsDesc = useMemo(
    () => (data ? [...data.daily_rows].reverse() : []),
    [data]
  );
  const compareWindow = useMemo(() => {
    if (!data) return null;
    const previousEndDate = addDaysToDate(data.start_date, -1);
    const previousStartDate = addDaysToDate(previousEndDate, -(data.days_in_range - 1));
    return {
      start_date: previousStartDate,
      end_date: previousEndDate,
    };
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
    const compareByDate = new Map<string, NutritionProgressDayRow>();

    if (compareMode && compareWindow && compareQuery.data) {
      for (const row of compareQuery.data.daily_rows) {
        const offset = dateDiffInDays(compareWindow.start_date, row.date);
        const mappedDate = addDaysToDate(data.start_date, offset);
        compareByDate.set(mappedDate, row);
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
      } catch {
        // If share is cancelled/fails, fallback to clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Ignore clipboard failures.
    }
  };

  return (
    <div className="section-gap">
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-white/10 bg-[#0f172b]/75 text-muted-foreground hover:bg-[#18223b] hover:text-foreground"
              onClick={() => void handleShare()}
              aria-label="Share progress"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-white/10 bg-[#0f172b]/75 text-muted-foreground hover:bg-[#18223b] hover:text-foreground"
              onClick={() => data && exportNutritionProgressCSV(data)}
              disabled={!data}
              aria-label="Export progress as CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {query.isError && !data ? (
        <section className={PANEL_CLASS}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Unable to load nutrition progress</p>
              <p className="text-sm text-muted-foreground">
                {query.error instanceof Error
                  ? query.error.message
                  : "Something went wrong while loading this page."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-fit rounded-xl border-border/60"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      {!data && query.isPending ? (
        <NutritionProgressSkeleton showHeader={false} />
      ) : null}

      {data ? (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0f172b]/80 p-1">
                {RANGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      range === value
                        ? "bg-[#d15d7c] text-[#170914]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setRange(value)}
                  >
                    {value} Days
                  </button>
                ))}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                  aria-label="Calendar range"
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={compareMode}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
                  compareMode
                    ? "border-[#d15d7c]/65 bg-[#d15d7c]/85"
                    : "border-white/15 bg-[#0f172b]"
                )}
                onClick={() => setCompareMode((current) => !current)}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-[#060b18] transition-transform",
                    compareMode ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
              <span className="text-sm text-muted-foreground">Compare</span>
              {compareMode && compareQuery.data && compareQuery.data.days_logged === 0 ? (
                <span className="text-xs text-muted-foreground">
                  No data in previous period
                </span>
              ) : null}

              {query.isFetching || (compareMode && compareQuery.isFetching) ? (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  Updating
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{formatDateRange(data.start_date, data.end_date)}</span>
              <span>•</span>
              <span>
                {data.days_logged} of {data.days_in_range} days logged
              </span>
              {data.logging_streak > 1 ? (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-chart-1" />
                    {data.logging_streak}-day streak
                  </span>
                </>
              ) : null}
            </div>
          </section>

          <div className="h-px w-full bg-border/35" />

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              label="Avg Cal"
              value={data.avg_calories}
              unit="kcal"
              delta={data.deltas.avg_calories}
              deltaUnit=" kcal"
              deltaClassName={deltaClassName({
                label: "calories",
                delta: data.deltas.avg_calories,
                currentValue: data.avg_calories,
                targetCalories: data.targets.calories,
              })}
            />
            <StatCard
              label="Avg Protein"
              value={data.avg_protein_g}
              unit="g"
              delta={data.deltas.avg_protein_g}
              deltaUnit=" g"
              deltaClassName={deltaClassName({
                label: "protein",
                delta: data.deltas.avg_protein_g,
                currentValue: data.avg_protein_g,
                targetCalories: data.targets.calories,
              })}
            />
            <StatCard
              label="Avg Carbs"
              value={data.avg_carbs_g}
              unit="g"
              delta={data.deltas.avg_carbs_g}
              deltaUnit=" g"
              deltaClassName={deltaClassName({
                label: "carbs",
                delta: data.deltas.avg_carbs_g,
                currentValue: data.avg_carbs_g,
                targetCalories: data.targets.calories,
              })}
            />
            <StatCard
              label="Avg Fat"
              value={data.avg_fat_g}
              unit="g"
              delta={data.deltas.avg_fat_g}
              deltaUnit=" g"
              deltaClassName={deltaClassName({
                label: "fat",
                delta: data.deltas.avg_fat_g,
                currentValue: data.avg_fat_g,
                targetCalories: data.targets.calories,
              })}
            />
            <StatCard
              label="Compliance"
              value={data.compliance_score}
              unit="%"
              delta={data.deltas.compliance_score}
              deltaUnit="%"
              deltaClassName={deltaClassName({
                label: "compliance",
                delta: data.deltas.compliance_score,
                currentValue: data.compliance_score,
                targetCalories: data.targets.calories,
              })}
            />
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Days Logged
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {data.days_logged}
                <span className="text-sm text-muted-foreground">/{data.days_in_range}</span>
              </p>
            </div>
            <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Best Streak
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {data.longest_streak}
                <span className="text-sm text-muted-foreground"> days</span>
              </p>
            </div>
            <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Perfect Days
              </p>
              <p className="text-xl font-semibold tabular-nums">{data.perfect_days}</p>
            </div>
            <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-3")}>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                Avg Fiber
              </p>
              <p className="text-xl font-semibold tabular-nums">
                {data.avg_fiber_g}
                <span className="text-sm text-muted-foreground">g</span>
              </p>
            </div>
          </section>

          {data.insights.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold tracking-tight">Insights</h2>
                <span className="text-xs text-muted-foreground">
                  {data.insights.length} signal{data.insights.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                {(() => {
                  const leadInsight = data.insights[0];
                  const leadTone = getInsightTone(leadInsight.type);
                  return (
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
                  );
                })()}
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
          ) : null}

          <section className={cn(PANEL_CLASS, "space-y-4")}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Daily Calories</h2>
              {compareMode ? (
                <span className="text-xs text-muted-foreground">
                  Comparing with previous {data.days_in_range} days
                </span>
              ) : null}
            </div>
            {hasRows ? (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartRows}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <Bar
                    dataKey="calories"
                    fill={CALORIES_BAR_COLOR}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                    activeBar={false}
                  />
                  {data.targets.calories > 0 ? (
                    <ReferenceLine
                      y={data.targets.calories}
                      stroke={CALORIES_LINE_COLOR}
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Line
                    dataKey="rolling_avg_7"
                    stroke={CALORIES_LINE_COLOR}
                    dot={false}
                    strokeWidth={2}
                    type="monotone"
                    connectNulls
                    isAnimationActive={false}
                  />
                  {compareMode ? (
                    <Line
                      dataKey="compare_calories"
                      stroke="#a3aec9"
                      dot={false}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      type="monotone"
                      connectNulls
                      isAnimationActive={false}
                    />
                  ) : null}
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    content={<CaloriesTooltip target={data.targets.calories} />}
                    cursor={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                No meal logs were found in this period.
              </p>
            )}
          </section>

          <section className={cn(PANEL_CLASS, "space-y-4")}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Macros vs Targets</h2>
              {compareMode ? (
                <span className="text-xs text-muted-foreground">
                  Dashed lines = previous period
                </span>
              ) : null}
            </div>
            {hasRows ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartRows}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <Line
                    dataKey="protein_g"
                    stroke={MACRO_COLORS.protein}
                    dot={{ r: 2.5, fill: MACRO_COLORS.protein, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="carbs_g"
                    stroke={MACRO_COLORS.carbs}
                    dot={{ r: 2.5, fill: MACRO_COLORS.carbs, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="fat_g"
                    stroke={MACRO_COLORS.fat}
                    dot={{ r: 2.5, fill: MACRO_COLORS.fat, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                    strokeWidth={2}
                    type="monotone"
                    isAnimationActive={false}
                  />
                  {compareMode ? (
                    <Line
                      dataKey="compare_protein_g"
                      stroke="#f4a3bb"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      type="monotone"
                      connectNulls
                      isAnimationActive={false}
                    />
                  ) : null}
                  {compareMode ? (
                    <Line
                      dataKey="compare_carbs_g"
                      stroke="#9ac9ff"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      type="monotone"
                      connectNulls
                      isAnimationActive={false}
                    />
                  ) : null}
                  {compareMode ? (
                    <Line
                      dataKey="compare_fat_g"
                      stroke="#f9d383"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      type="monotone"
                      connectNulls
                      isAnimationActive={false}
                    />
                  ) : null}
                  {data.targets.protein_g > 0 ? (
                    <ReferenceLine
                      y={data.targets.protein_g}
                      stroke={MACRO_COLORS.protein}
                      strokeDasharray="6 3"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                  {data.targets.carbs_g > 0 ? (
                    <ReferenceLine
                      y={data.targets.carbs_g}
                      stroke={MACRO_COLORS.carbs}
                      strokeDasharray="6 3"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                  {data.targets.fat_g > 0 ? (
                    <ReferenceLine
                      y={data.targets.fat_g}
                      stroke={MACRO_COLORS.fat}
                      strokeDasharray="6 3"
                      ifOverflow="extendDomain"
                    />
                  ) : null}
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax, data.targets.protein_g, data.targets.carbs_g, data.targets.fat_g) * 1.15 / 10) * 10]}
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={<MacrosTooltip targets={data.targets} />}
                    cursor={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add meal logs to compare daily macros against targets.
              </p>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">Fiber Intake</h2>
                {compareMode ? (
                  <span className="text-xs text-muted-foreground">
                    Dashed line = previous period
                  </span>
                ) : null}
              </div>
              {hasRows ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartRows}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_COLOR}
                      vertical={false}
                    />
                    <Bar
                      dataKey="fiber_g"
                      fill={FIBER_COLOR}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                      activeBar={false}
                    />
                    {compareMode ? (
                      <Line
                        dataKey="compare_fiber_g"
                        stroke="#93d6b6"
                        dot={false}
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        type="monotone"
                        connectNulls
                        isAnimationActive={false}
                      />
                    ) : null}
                    <ReferenceLine
                      y={25}
                      stroke={FIBER_COLOR}
                      strokeDasharray="4 2"
                      strokeWidth={1}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 11, fill: AXIS_COLOR }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      formatter={(value: number) => [`${value}g`, "Fiber"]}
                      labelFormatter={formatChartDate}
                      contentStyle={{
                        borderRadius: "14px",
                        border: "1px solid rgba(134, 150, 182, 0.35)",
                        backgroundColor: "rgba(10, 15, 29, 0.96)",
                      }}
                      itemStyle={{ color: "#e7edf8" }}
                      labelStyle={{ color: "#e7edf8" }}
                      cursor={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fiber trend appears here once logs are added.
                </p>
              )}
            </section>

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
                        className={cn(
                          SUB_PANEL_CLASS,
                          "flex flex-col items-center gap-1 rounded-xl p-2"
                        )}
                      >
                        <p className="text-lg font-semibold tabular-nums">
                          {item.value}%
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <h2 className="text-xl font-semibold tracking-tight">Meal Breakdown</h2>
              {data.meal_breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Meal breakdown will appear after meal logs are added.
                </p>
              ) : (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.meal_breakdown}
                          dataKey="calories"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {data.meal_breakdown.map((entry, index) => (
                            <Cell
                              key={entry.type}
                              fill={resolveMealBreakdownColor(entry.type, index)}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          formatter={(_value: number, _name, props) => [
                            `${props.payload.pct}%`,
                            props.payload.type,
                          ]}
                          contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid rgba(134, 150, 182, 0.35)",
                            backgroundColor: "rgba(10, 15, 29, 0.96)",
                          }}
                          itemStyle={{ color: "#e7edf8" }}
                          labelStyle={{ color: "#e7edf8" }}
                          cursor={false}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    {data.meal_breakdown.map((entry, index) => (
                      <div
                        key={entry.type}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            background: resolveMealBreakdownColor(entry.type, index),
                          }}
                        />
                        <span className="capitalize">{entry.type}</span>
                        <span className="ml-auto pl-4 font-medium">
                          {entry.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <h2 className="text-xl font-semibold tracking-tight">Top Foods</h2>
              {data.top_foods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No food items logged in this period.
                </p>
              ) : (
                <ol className="divide-y divide-border/30">
                  {data.top_foods.map((food, index) => (
                    <li key={food.name} className="flex items-center gap-3 py-3">
                      <span className="w-5 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">
                        {food.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-xs tabular-nums">
                        {food.count}x
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {food.avg_calories} cal
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className={cn(PANEL_CLASS, "space-y-4")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                Calorie Deficit / Surplus
              </h2>
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  data.total_deficit_surplus >= 0
                    ? "text-chart-2"
                    : "text-destructive"
                )}
              >
                {data.total_deficit_surplus >= 0 ? "+" : ""}
                {data.total_deficit_surplus.toLocaleString()} kcal total
              </span>
            </div>
            {hasRows ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.daily_rows} barCategoryGap="20%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    domain={[
                      (dataMin: number) => Math.floor(Math.min(dataMin, 0) * 1.1 / 100) * 100,
                      (dataMax: number) => Math.ceil(Math.max(dataMax, 0) * 1.1 / 100) * 100,
                    ]}
                    tickFormatter={(v: number) =>
                      v === 0 ? "0" : `${v > 0 ? "+" : ""}${v.toLocaleString()}`
                    }
                    tick={{ fontSize: 11, fill: AXIS_COLOR }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* Deficit zone — subtle red tint below zero */}
                  <ReferenceArea
                    yAxisId="left"
                    y1={-99999}
                    y2={0}
                    fill={DEFICIT_NEGATIVE_COLOR}
                    fillOpacity={0.07}
                    ifOverflow="hidden"
                    label={{ value: "Deficit", position: "insideTopRight", fill: DEFICIT_NEGATIVE_COLOR, fontSize: 10, opacity: 0.6 }}
                  />
                  {/* Surplus zone — subtle green tint above zero */}
                  <ReferenceArea
                    yAxisId="left"
                    y1={0}
                    y2={99999}
                    fill={DEFICIT_POSITIVE_COLOR}
                    fillOpacity={0.07}
                    ifOverflow="hidden"
                    label={{ value: "Surplus", position: "insideBottomRight", fill: DEFICIT_POSITIVE_COLOR, fontSize: 10, opacity: 0.6 }}
                  />
                  <ReferenceLine yAxisId="left" y={0} stroke={ZERO_LINE_COLOR} strokeWidth={1.5} />
                  <Bar
                    yAxisId="left"
                    dataKey="deficit_surplus"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                    activeBar={false}
                  >
                    {data.daily_rows.map((row) => (
                      <Cell
                        key={row.date}
                        fill={
                          row.deficit_surplus >= 0
                            ? DEFICIT_POSITIVE_COLOR
                            : DEFICIT_NEGATIVE_COLOR
                        }
                      />
                    ))}
                  </Bar>
                  <ChartTooltip
                    formatter={(value: number) => [
                      `${value > 0 ? "+" : ""}${value} kcal`,
                      "vs target",
                    ]}
                    labelFormatter={formatChartDate}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid rgba(134, 150, 182, 0.35)",
                      backgroundColor: "rgba(10, 15, 29, 0.96)",
                    }}
                    itemStyle={{ color: "#e7edf8" }}
                    labelStyle={{ color: "#e7edf8" }}
                    cursor={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Deficit or surplus trend appears after logs are added.
              </p>
            )}
            {data.targets.source === "none" ? (
              <p className="text-xs text-muted-foreground">
                Set a calorie target in goals to enable deficit/surplus tracking.
              </p>
            ) : null}
          </section>

          {data.days_in_range >= 14 ? (
            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <h2 className="text-xl font-semibold tracking-tight">
                Calories by Day of Week
              </h2>
              <p className="text-sm text-muted-foreground">
                Average calorie intake per day of the week over this period.
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.dow_avg_calories} barCategoryGap="25%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_COLOR}
                    vertical={false}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} />
                  {data.targets.calories > 0 ? (
                    <ReferenceLine
                      y={data.targets.calories}
                      stroke={CALORIES_LINE_COLOR}
                      strokeDasharray="6 3"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Bar
                    dataKey="avg"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    activeBar={false}
                  >
                    {data.dow_avg_calories.map((entry) => (
                      <Cell
                        key={entry.dow}
                        fill={
                          entry.dow === 0 || entry.dow === 6
                            ? WEEKEND_BAR_COLOR
                            : WEEKDAY_BAR_COLOR
                        }
                      />
                    ))}
                  </Bar>
                  <ChartTooltip
                    formatter={(value: number) => [
                      `${value.toLocaleString()} kcal`,
                      "Avg calories",
                    ]}
                    contentStyle={{
                      borderRadius: "14px",
                      border: "1px solid rgba(134, 150, 182, 0.35)",
                      backgroundColor: "rgba(10, 15, 29, 0.96)",
                    }}
                    itemStyle={{ color: "#e7edf8" }}
                    labelStyle={{ color: "#e7edf8" }}
                    cursor={false}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-chart-1/70" />
                  Weekday
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-3 rounded-sm bg-chart-4/70" />
                  Weekend
                </span>
              </div>
            </section>
          ) : null}

          {data.days_in_range >= 14 ? (
            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <h2 className="text-xl font-semibold tracking-tight">
                Weekday vs Weekend
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Mon - Fri avg
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.weekday_avg_calories.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal / day</p>
                </div>
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Sat - Sun avg
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.weekend_avg_calories.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal / day</p>
                </div>
              </div>
              {Math.abs(data.weekday_avg_calories - data.weekend_avg_calories) > 200 ? (
                <p className="text-sm text-muted-foreground">
                  Weekend intake is{" "}
                  {data.weekend_avg_calories > data.weekday_avg_calories
                    ? "higher"
                    : "lower"}{" "}
                  than weekdays by{" "}
                  {Math.abs(
                    data.weekday_avg_calories - data.weekend_avg_calories
                  ).toLocaleString()}{" "}
                  kcal on average.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className={cn(PANEL_CLASS, "space-y-4")}>
            <h2 className="text-xl font-semibold tracking-tight">Daily Detail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Date", "Calories", "Protein", "Carbs", "Fat", "Fiber"].map(
                      (column) => (
                        <th
                          key={column}
                          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground"
                        >
                          {column}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {tableRowsDesc.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-sm text-muted-foreground"
                      >
                        No daily logs found in this period.
                      </td>
                    </tr>
                  ) : (
                    tableRowsDesc.map((row) => (
                      <tr
                        key={row.date}
                        className="transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatTableDate(row.date)}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {row.calories.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.protein }}>
                          {row.protein_g}g
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.carbs }}>
                          {row.carbs_g}g
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.fat }}>
                          {row.fat_g}g
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: FIBER_COLOR }}>
                          {row.fiber_g}g
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {data.days_in_range >= 14 ? (
            <TooltipProvider>
              <section className={cn(PANEL_CLASS, "space-y-4")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Logging Calendar
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_on_target }}
                      />
                      On target
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_off_target }}
                      />
                      Off target
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-[#cf8b2e]"
                        style={{
                          backgroundColor: LOGGING_LEVEL_COLORS.partial_log,
                          backgroundImage:
                            "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 4px)",
                        }}
                      />
                      Partial log
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_no_target }}
                      />
                      Logged no target
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: LOGGING_LEVEL_COLORS.not_logged }}
                      />
                      Not logged
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.daily_compliance.map((day) => (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-sm border transition-opacity hover:opacity-85",
                            day.level === "partial_log" ? "border-[#cf8b2e]" : "border-white/10"
                          )}
                          style={{
                            backgroundColor: LOGGING_LEVEL_COLORS[day.level],
                            backgroundImage:
                              day.level === "partial_log"
                                ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.2) 0 2px, transparent 2px 4px)"
                                : undefined,
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">{formatTableDate(day.date)}</p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {day.level.replace(/_/g, " ")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{data.perfect_days} perfect days</span>
                  <span>·</span>
                  <span>Best streak: {data.longest_streak} days</span>
                </div>
              </section>
            </TooltipProvider>
          ) : null}

          {data.avg_first_meal_time !== null ? (
            <section className={cn(PANEL_CLASS, "space-y-4")}>
              <h2 className="text-xl font-semibold tracking-tight">Meal Timing</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    First meal
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.avg_first_meal_time}
                  </p>
                  <p className="text-xs text-muted-foreground">avg start</p>
                </div>
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Last meal
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.avg_last_meal_time}
                  </p>
                  <p className="text-xs text-muted-foreground">avg end</p>
                </div>
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Eating window
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.avg_eating_window_minutes !== null
                      ? `${Math.floor(data.avg_eating_window_minutes / 60)}h ${
                          data.avg_eating_window_minutes % 60
                        }m`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">avg duration</p>
                </div>
                <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-1 p-4")}>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Late meals
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-semibold tabular-nums",
                      data.late_meal_days > 3 ? "text-chart-1" : "text-foreground"
                    )}
                  >
                    {data.late_meal_days}
                  </p>
                  <p className="text-xs text-muted-foreground">days after 9 PM</p>
                </div>
              </div>
              {data.late_meal_days > data.days_logged * 0.3 ? (
                <p className="text-sm text-muted-foreground">
                  Meals were logged after 9 PM on {data.late_meal_days} days in
                  this period.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className={cn(PANEL_CLASS, "space-y-4")}>
            <h2 className="text-xl font-semibold tracking-tight">
              Macro Distribution
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Actual (this period)</p>
                <MacroDonut
                  protein={data.protein_pct_of_calories}
                  carbs={data.carbs_pct_of_calories}
                  fat={data.fat_pct_of_calories}
                />
              </div>
              {data.targets.source !== "none" && targetRatio ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Target</p>
                  <MacroDonut
                    protein={targetRatio.protein}
                    carbs={targetRatio.carbs}
                    fat={targetRatio.fat}
                  />
                </div>
              ) : null}
            </div>
          </section>

        </>
      ) : null}

      <section className={cn(PANEL_CLASS, "space-y-4")}>
        <h2 className="text-xl font-semibold tracking-tight">Micronutrient Tracking</h2>
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-5">
          <p className="text-sm text-muted-foreground">
            Supplements are handled as informational assignments per workout and nutrition program.
            Manage stacks from supplements to keep this view aligned.
          </p>
          <div className="mt-3">
            <Button asChild className="accent-strong rounded-xl">
              <Link href="/supplements/assigned">Manage supplements</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
