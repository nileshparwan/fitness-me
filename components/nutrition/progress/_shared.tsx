"use client";

import { format, parseISO } from "date-fns";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";

import { cn } from "@/utils";
import type {
  NutritionProgressData,
  NutritionProgressTargets,
} from "@/types/nutrition-progress";
import {
  MACRO_COLORS,
  MEAL_BREAKDOWN_COLORS,
  MEAL_TYPE_PIE_COLORS,
  SUB_PANEL_CLASS,
} from "./_constants";

export type NutritionProgressChartRow = {
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

type StatCardProps = {
  label: string;
  value: number;
  unit: string;
  delta: number | null;
  deltaUnit: string;
  deltaClassName: string;
};

export function resolveMealBreakdownColor(mealType: string, index: number) {
  return (
    MEAL_BREAKDOWN_COLORS[mealType.toLowerCase()] ??
    MEAL_TYPE_PIE_COLORS[index % MEAL_TYPE_PIE_COLORS.length]
  );
}

export function getInsightTone(type: "success" | "warning" | "info") {
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

export function formatChartDate(value: string) {
  try {
    return format(parseISO(value), "MM-dd");
  } catch {
    return value;
  }
}

export function formatTableDate(value: string) {
  try {
    return format(parseISO(value), "MM-dd");
  } catch {
    return value;
  }
}

export function formatDateRange(startDate: string, endDate: string) {
  try {
    return `${format(parseISO(startDate), "MMM dd")} - ${format(
      parseISO(endDate),
      "MMM dd"
    )}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

export function addDaysToDate(value: string, days: number) {
  const next = parseDateInput(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function dateDiffInDays(fromDate: string, toDate: string) {
  const from = parseDateInput(fromDate).getTime();
  const to = parseDateInput(toDate).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function computeMacroRatioForTargets(targets: NutritionProgressTargets) {
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

export function deltaClassName({
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

export function MacroDonut({
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

export function CaloriesTooltip({
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
          <p className="text-muted-foreground">
            Target: {target.toLocaleString()} kcal
          </p>
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
        <p className="text-muted-foreground">
          Set calorie target to track variance
        </p>
      )}
    </div>
  );
}

export function MacrosTooltip({
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

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaUnit,
  deltaClassName: deltaTone,
}: StatCardProps) {
  return (
    <div className={cn(SUB_PANEL_CLASS, "flex flex-col gap-2 p-3 md:p-4")}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums leading-none md:text-3xl">
        {value}
        <span className="ml-1 text-base text-muted-foreground md:text-lg">
          {unit}
        </span>
      </p>
      {delta !== null ? (
        <p className={cn("text-xs font-medium", deltaTone)}>
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
