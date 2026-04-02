"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import { toDateInput } from "@/lib/utils/date";
import type { Database } from "@/types/database";
import type {
  NutritionInsight,
  NutritionProgressData,
  NutritionProgressDayRow,
  NutritionProgressDeltas,
  NutritionProgressRange,
  NutritionProgressTargets,
} from "@/types/nutrition-progress";
import { resolveGoalTargetForDate, type SubjectRef } from "@/app/actions/_lib/resolve-nutrition-targets";

type MealLogRangeRow = Pick<
  Database["public"]["Tables"]["diary_entries"]["Row"],
  | "id"
  | "performed_on"
  | "total_calories"
  | "total_protein_g"
  | "total_carbs_g"
  | "total_fat_g"
  | "total_fiber_g"
  | "meal_type"
>;

type MealLogItemProgressRow = Pick<
  Database["public"]["Tables"]["diary_items"]["Row"],
  "meal_log_id" | "item_name" | "calories" | "consumed_time" | "is_quick_add"
>;

type MealComplianceRow = Pick<
  Database["public"]["Tables"]["diary_compliance"]["Row"],
  | "performed_on"
  | "overall_compliant"
  | "basis"
  | "target_source"
  | "calories_compliant"
  | "protein_compliant"
  | "carbs_compliant"
  | "fat_compliant"
>;

const nutritionProgressSchema = z.object({
  range: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  subject_user_id: z.string().uuid().nullable().optional(),
  subject_client_id: z.string().uuid().nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

function addDays(value: string, days: number) {
  const next = parseDateInput(value);
  next.setUTCDate(next.getUTCDate() + days);
  return toDateInput(next);
}

function subtractDays(value: string, days: number) {
  return addDays(value, -days);
}

function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = parseDateInput(startDate).getTime();
  const end = parseDateInput(endDate).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

function buildDateRange(input: z.infer<typeof nutritionProgressSchema>) {
  const today = toDateInput(new Date());
  const endDate = input.end_date ?? today;
  const startDate = input.start_date ?? subtractDays(endDate, input.range - 1);
  if (parseDateInput(startDate).getTime() > parseDateInput(endDate).getTime()) {
    throw new Error("start_date must be before end_date");
  }
  return { startDate, endDate };
}

function safeNumber(input: number | null | undefined) {
  return Number(input ?? 0);
}

function isMissingSchemaDependencyError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST200" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

function roundAverage(sum: number, count: number) {
  if (count <= 0) return 0;
  return Math.round(sum / count);
}

function isWithinThreshold(actual: number, target: number) {
  return Math.abs(actual - target) / Math.max(target, 1) <= 0.15;
}

function isRowFullyCompliant(row: NutritionProgressDayRow, targets: NutritionProgressTargets) {
  if (targets.source === "none") return false;
  return (
    isWithinThreshold(row.calories, targets.calories) &&
    isWithinThreshold(row.protein_g, targets.protein_g) &&
    isWithinThreshold(row.carbs_g, targets.carbs_g) &&
    isWithinThreshold(row.fat_g, targets.fat_g)
  );
}

function computeMacroCompliancePercent(
  rows: NutritionProgressDayRow[],
  target: number,
  selector: (row: NutritionProgressDayRow) => number
) {
  if (rows.length === 0 || target <= 0) return 0;
  const compliant = rows.filter((row) => isWithinThreshold(selector(row), target)).length;
  return Math.round((compliant / rows.length) * 100);
}

function computeComplianceScore(
  rows: NutritionProgressDayRow[],
  targets: NutritionProgressTargets
) {
  if (rows.length === 0 || targets.source === "none") {
    return {
      compliance: 0,
      calCompliance: 0,
      proteinCompliance: 0,
      carbsCompliance: 0,
      fatCompliance: 0,
    };
  }

  const calCompliance = computeMacroCompliancePercent(rows, targets.calories, (row) => row.calories);
  const proteinCompliance = computeMacroCompliancePercent(rows, targets.protein_g, (row) => row.protein_g);
  const carbsCompliance = computeMacroCompliancePercent(rows, targets.carbs_g, (row) => row.carbs_g);
  const fatCompliance = computeMacroCompliancePercent(rows, targets.fat_g, (row) => row.fat_g);
  const compliance =
    Math.round((calCompliance + proteinCompliance + carbsCompliance + fatCompliance) / 4);

  return {
    compliance,
    calCompliance,
    proteinCompliance,
    carbsCompliance,
    fatCompliance,
  };
}

function computeComplianceScoreForRows(rows: NutritionProgressDayRow[], targets: NutritionProgressTargets) {
  return computeComplianceScore(rows, targets).compliance;
}

function computeComplianceFromFactRows(rows: MealComplianceRow[]) {
  const completeRows = rows.filter(
    (row) => row.basis === "complete_log" && row.target_source !== "none"
  );
  const denominator = completeRows.length;
  if (denominator === 0) {
    return {
      compliance: 0,
      calCompliance: 0,
      proteinCompliance: 0,
      carbsCompliance: 0,
      fatCompliance: 0,
      perfectDays: 0,
    };
  }

  const calCompliance = Math.round(
    (completeRows.filter((row) => row.calories_compliant === true).length / denominator) * 100
  );
  const proteinCompliance = Math.round(
    (completeRows.filter((row) => row.protein_compliant === true).length / denominator) * 100
  );
  const carbsCompliance = Math.round(
    (completeRows.filter((row) => row.carbs_compliant === true).length / denominator) * 100
  );
  const fatCompliance = Math.round(
    (completeRows.filter((row) => row.fat_compliant === true).length / denominator) * 100
  );
  const compliance = Math.round((calCompliance + proteinCompliance + carbsCompliance + fatCompliance) / 4);
  const perfectDays = completeRows.filter((row) => row.overall_compliant === true).length;

  return {
    compliance,
    calCompliance,
    proteinCompliance,
    carbsCompliance,
    fatCompliance,
    perfectDays,
  };
}

function buildDailyComplianceFromFactRows(
  rows: MealComplianceRow[],
  startDate: string,
  daysInRange: number
): NutritionProgressData["daily_compliance"] {
  const byDate = new Map(rows.map((row) => [row.performed_on, row] as const));

  return Array.from({ length: daysInRange }, (_, index) => {
    const date = addDays(startDate, index);
    const row = byDate.get(date);
    if (!row) {
      return {
        date,
        level: "not_logged" as const,
      };
    }

    if (row.basis === "no_log") {
      return {
        date,
        level: "not_logged" as const,
      };
    }

    if (row.basis === "partial_log") {
      return {
        date,
        level: "partial_log" as const,
      };
    }

    if (row.basis === "missing_target" || row.target_source === "none") {
      return {
        date,
        level: "logged_no_target" as const,
      };
    }

    return {
      date,
      level: row.overall_compliant ? ("logged_on_target" as const) : ("logged_off_target" as const),
    };
  });
}

function computeLoggingStreak(rows: NutritionProgressDayRow[], today: string) {
  const loggedDates = new Set(rows.map((row) => row.date));
  let streak = 0;
  let checkDate = today;
  while (loggedDates.has(checkDate)) {
    streak += 1;
    checkDate = subtractDays(checkDate, 1);
  }
  return streak;
}

function computeLongestStreak(rows: NutritionProgressDayRow[], startDate: string, daysInRange: number) {
  const loggedSet = new Set(rows.map((row) => row.date));
  let longest = 0;
  let current = 0;

  for (let index = 0; index < daysInRange; index += 1) {
    const date = addDays(startDate, index);
    if (loggedSet.has(date)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function computeMacroCaloriesRatio(
  proteinG: number,
  carbsG: number,
  fatG: number
) {
  const proteinCalories = proteinG * 4;
  const carbsCalories = carbsG * 4;
  const fatCalories = fatG * 9;
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

function parseConsumedTimeToMinutes(value: string): number | null {
  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return Number.parseInt(isoMatch[1], 10) * 60 + Number.parseInt(isoMatch[2], 10);
  }

  const exactMatch = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (exactMatch) {
    const hours = Number.parseInt(exactMatch[1], 10);
    const minutes = Number.parseInt(exactMatch[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
}

function minutesToHHMM(value: number) {
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function resolveSubject(input: z.infer<typeof nutritionProgressSchema>, actorUserId: string): SubjectRef {
  const subjectUserId = input.subject_user_id ?? null;
  const subjectClientId = input.subject_client_id ?? null;

  if (subjectUserId && subjectClientId) {
    throw new Error("A nutrition progress request can target only one subject.");
  }

  if (!subjectUserId && !subjectClientId) {
    return {
      subject_user_id: actorUserId,
      subject_client_id: null,
    };
  }

  return {
    subject_user_id: subjectUserId,
    subject_client_id: subjectClientId,
  };
}

function applySubjectFilters<T>(query: T, subject: SubjectRef): T {
  const builder = query as unknown as {
    eq: (
      column: string,
      value: unknown
    ) => {
      is: (column: string, value: null) => unknown;
    };
  };

  if (subject.subject_user_id) {
    return builder
      .eq("subject_user_id", subject.subject_user_id)
      .is("subject_client_id", null) as T;
  }

  return builder
    .eq("subject_client_id", subject.subject_client_id)
    .is("subject_user_id", null) as T;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function listMealLogItemsByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealLogIds: string[]
) {
  if (mealLogIds.length === 0) return [] as MealLogItemProgressRow[];

  const chunks = chunkArray(mealLogIds, 200);
  const results = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("diary_items")
        .select("meal_log_id, item_name, calories, consumed_time, is_quick_add")
        .in("meal_log_id", chunk)
    )
  );

  const rows: MealLogItemProgressRow[] = [];
  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
    rows.push(...((result.data || []) as MealLogItemProgressRow[]));
  }
  return rows;
}

function aggregateDailyRows(logs: MealLogRangeRow[], targets: NutritionProgressTargets) {
  const byDate = new Map<string, NutritionProgressDayRow>();

  for (const log of logs) {
    const current = byDate.get(log.performed_on) || {
      date: log.performed_on,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      deficit_surplus: 0,
      rolling_avg_7: null,
    };

    current.calories += Math.round(safeNumber(log.total_calories));
    current.protein_g += Math.round(safeNumber(log.total_protein_g));
    current.carbs_g += Math.round(safeNumber(log.total_carbs_g));
    current.fat_g += Math.round(safeNumber(log.total_fat_g));
    current.fiber_g += Math.round(safeNumber(log.total_fiber_g));

    byDate.set(log.performed_on, current);
  }

  const dailyRows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  for (const row of dailyRows) {
    row.deficit_surplus = targets.calories > 0 ? row.calories - targets.calories : 0;
  }

  return { dailyRows, byDate };
}

function computeAverages(rows: NutritionProgressDayRow[]) {
  const daysLogged = rows.length;
  if (daysLogged === 0) {
    return {
      avgCalories: 0,
      avgProteinG: 0,
      avgCarbsG: 0,
      avgFatG: 0,
      avgFiberG: 0,
    };
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.calories += row.calories;
      acc.protein += row.protein_g;
      acc.carbs += row.carbs_g;
      acc.fat += row.fat_g;
      acc.fiber += row.fiber_g;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    avgCalories: roundAverage(totals.calories, daysLogged),
    avgProteinG: roundAverage(totals.protein, daysLogged),
    avgCarbsG: roundAverage(totals.carbs, daysLogged),
    avgFatG: roundAverage(totals.fat, daysLogged),
    avgFiberG: roundAverage(totals.fiber, daysLogged),
  };
}

function computeWeekdayWeekendAverages(rows: NutritionProgressDayRow[]) {
  const weekdayRows = rows.filter((row) => {
    const day = parseDateInput(row.date).getUTCDay();
    return day >= 1 && day <= 5;
  });
  const weekendRows = rows.filter((row) => {
    const day = parseDateInput(row.date).getUTCDay();
    return day === 0 || day === 6;
  });

  return {
    weekday: weekdayRows.length
      ? roundAverage(
          weekdayRows.reduce((sum, row) => sum + row.calories, 0),
          weekdayRows.length
        )
      : 0,
    weekend: weekendRows.length
      ? roundAverage(
          weekendRows.reduce((sum, row) => sum + row.calories, 0),
          weekendRows.length
        )
      : 0,
  };
}

function computeDowAverages(rows: NutritionProgressDayRow[]) {
  const dowBuckets = new Map<number, number[]>();
  for (const row of rows) {
    const dayOfWeek = parseDateInput(row.date).getUTCDay();
    const bucket = dowBuckets.get(dayOfWeek) || [];
    bucket.push(row.calories);
    dowBuckets.set(dayOfWeek, bucket);
  }

  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const order = [1, 2, 3, 4, 5, 6, 0];

  return order.map((dow) => {
    const bucket = dowBuckets.get(dow) || [];
    return {
      dow,
      label: labels[dow],
      avg: bucket.length
        ? roundAverage(bucket.reduce((sum, value) => sum + value, 0), bucket.length)
        : 0,
    };
  });
}

function computeMealBreakdown(logs: MealLogRangeRow[]) {
  const caloriesByType = new Map<string, number>();

  for (const log of logs) {
    const type = (log.meal_type || "other").toString().toLowerCase();
    const nextCalories = (caloriesByType.get(type) || 0) + Math.round(safeNumber(log.total_calories));
    caloriesByType.set(type, nextCalories);
  }

  const totalCalories = Array.from(caloriesByType.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(caloriesByType.entries())
    .map(([type, calories]) => ({
      type,
      calories,
      pct: totalCalories > 0 ? Math.round((calories / totalCalories) * 100) : 0,
    }))
    .sort((a, b) => b.calories - a.calories);
}

function computeTopFoods(items: MealLogItemProgressRow[]) {
  const foods = new Map<string, { name: string; count: number; totalCalories: number }>();
  for (const item of items) {
    if (item.is_quick_add) continue;

    const name = `${item.item_name || ""}`.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    const existing = foods.get(key) || { name, count: 0, totalCalories: 0 };
    existing.count += 1;
    existing.totalCalories += safeNumber(item.calories);
    foods.set(key, existing);
  }

  return Array.from(foods.values())
    .map((item) => ({
      name: item.name,
      count: item.count,
      avg_calories: item.count > 0 ? Math.round(item.totalCalories / item.count) : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.avg_calories - a.avg_calories;
    })
    .slice(0, 10);
}

function computeMealTiming(
  items: MealLogItemProgressRow[],
  logsById: Map<string, MealLogRangeRow>
) {
  const timesByDate = new Map<string, number[]>();

  for (const item of items) {
    if (!item.consumed_time) continue;
    const minutes = parseConsumedTimeToMinutes(item.consumed_time);
    if (minutes === null) continue;

    const log = logsById.get(item.meal_log_id);
    if (!log) continue;

    const bucket = timesByDate.get(log.performed_on) || [];
    bucket.push(minutes);
    timesByDate.set(log.performed_on, bucket);
  }

  const firstMealTimes: number[] = [];
  const lastMealTimes: number[] = [];
  let lateMealDays = 0;

  for (const times of timesByDate.values()) {
    if (times.length === 0) continue;
    const first = Math.min(...times);
    const last = Math.max(...times);
    firstMealTimes.push(first);
    lastMealTimes.push(last);
    if (last >= 21 * 60) lateMealDays += 1;
  }

  if (firstMealTimes.length === 0 || lastMealTimes.length === 0) {
    return {
      avg_first_meal_time: null,
      avg_last_meal_time: null,
      avg_eating_window_minutes: null,
      late_meal_days: 0,
    };
  }

  const avgFirst = Math.round(firstMealTimes.reduce((sum, value) => sum + value, 0) / firstMealTimes.length);
  const avgLast = Math.round(lastMealTimes.reduce((sum, value) => sum + value, 0) / lastMealTimes.length);

  return {
    avg_first_meal_time: minutesToHHMM(avgFirst),
    avg_last_meal_time: minutesToHHMM(avgLast),
    avg_eating_window_minutes: avgLast - avgFirst,
    late_meal_days: lateMealDays,
  };
}

function computeInsights(input: {
  range: NutritionProgressRange;
  daysLogged: number;
  daysInRange: number;
  targets: NutritionProgressTargets;
  avgProteinG: number;
  proteinCompliance: number;
  weekdayAvgCalories: number;
  weekendAvgCalories: number;
  avgFiberG: number;
  dailyRows: NutritionProgressDayRow[];
  perfectDays: number;
}) {
  const insights: NutritionInsight[] = [];

  const loggingPct = input.daysInRange > 0 ? Math.round((input.daysLogged / input.daysInRange) * 100) : 0;
  if (loggingPct === 100) {
    insights.push({
      id: "log_perfect",
      type: "success",
      text: `You logged every day in this ${input.range}-day period. Excellent consistency.`,
    });
  } else if (loggingPct < 50) {
    insights.push({
      id: "log_low",
      type: "warning",
      text: `You logged on ${input.daysLogged} of ${input.daysInRange} days (${loggingPct}%). More consistent logging will improve insight quality.`,
    });
  }

  if (input.targets.protein_g > 0 && input.avgProteinG < input.targets.protein_g * 0.85) {
    const gap = Math.round(input.targets.protein_g - input.avgProteinG);
    insights.push({
      id: "protein_low",
      type: "warning",
      text: `Average protein (${input.avgProteinG}g) is ${gap}g below your ${input.targets.protein_g}g target. Protein compliance is ${input.proteinCompliance}%.`,
    });
  }

  if (
    input.daysInRange >= 14 &&
    Math.abs(input.weekdayAvgCalories - input.weekendAvgCalories) > 250
  ) {
    const direction = input.weekendAvgCalories > input.weekdayAvgCalories ? "higher" : "lower";
    const diff = Math.abs(input.weekdayAvgCalories - input.weekendAvgCalories);
    insights.push({
      id: "weekend_pattern",
      type: "info",
      text: `Weekend calories are ${diff} kcal ${direction} than weekdays on average.`,
    });
  }

  if (input.avgFiberG < 18) {
    insights.push({
      id: "fiber_low",
      type: "warning",
      text: `Average fiber (${input.avgFiberG}g/day) is below the 25g recommendation.`,
    });
  }

  if (input.daysInRange >= 14 && input.targets.source !== "none" && input.dailyRows.length >= 6) {
    const mid = Math.floor(input.dailyRows.length / 2);
    const firstHalf = input.dailyRows.slice(0, mid);
    const secondHalf = input.dailyRows.slice(mid);
    const firstHalfScore = computeComplianceScoreForRows(firstHalf, input.targets);
    const secondHalfScore = computeComplianceScoreForRows(secondHalf, input.targets);
    const delta = secondHalfScore - firstHalfScore;

    if (delta >= 8) {
      insights.push({
        id: "compliance_up",
        type: "success",
        text: "Macro adherence improved in the second half of this period.",
      });
    } else if (delta <= -8) {
      insights.push({
        id: "compliance_down",
        type: "warning",
        text: "Macro adherence dropped in the second half of this period.",
      });
    }
  }

  if (input.perfectDays >= 7) {
    insights.push({
      id: "perfect_days",
      type: "success",
      text: `You hit all macro targets on ${input.perfectDays} days this period.`,
    });
  }

  return insights.slice(0, 4);
}

function computeDeltas(
  current: {
    avgCalories: number;
    avgProteinG: number;
    avgCarbsG: number;
    avgFatG: number;
    compliance: number;
  },
  previous: {
    avgCalories: number;
    avgProteinG: number;
    avgCarbsG: number;
    avgFatG: number;
    compliance: number;
  } | null
): NutritionProgressDeltas {
  if (!previous) {
    return {
      avg_calories: null,
      avg_protein_g: null,
      avg_carbs_g: null,
      avg_fat_g: null,
      compliance_score: null,
    };
  }

  return {
    avg_calories: current.avgCalories - previous.avgCalories,
    avg_protein_g: current.avgProteinG - previous.avgProteinG,
    avg_carbs_g: current.avgCarbsG - previous.avgCarbsG,
    avg_fat_g: current.avgFatG - previous.avgFatG,
    compliance_score: current.compliance - previous.compliance,
  };
}

async function resolveTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subject: SubjectRef,
  performedOn: string
): Promise<NutritionProgressTargets> {
  const goalTarget = await resolveGoalTargetForDate(supabase, subject, performedOn);

  if (goalTarget.source === "none") {
    return {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      source: "none",
      plan_name: null,
    };
  }

  return {
    calories: Math.round(safeNumber(goalTarget.calories)),
    protein_g: Math.round(safeNumber(goalTarget.protein_g)),
    carbs_g: Math.round(safeNumber(goalTarget.carbs_g)),
    fat_g: Math.round(safeNumber(goalTarget.fat_g)),
    source: "fitness_goal",
    plan_name: null,
  };
}

export async function getNutritionProgressAction(
  input: z.input<typeof nutritionProgressSchema>
): Promise<NutritionProgressData> {
  const payload = nutritionProgressSchema.parse(input);

  return runTrackedAction({
    eventName: "nutrition.progress.read",
    payload: {
      range: payload.range,
      subject_user_id: payload.subject_user_id ?? null,
      subject_client_id: payload.subject_client_id ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload, user.id);
      const { startDate, endDate } = buildDateRange(payload);
      const daysInRange = Math.max(1, daysBetweenInclusive(startDate, endDate));

      let logsQuery = supabase
        .from("diary_entries")
        .select(
          "id, performed_on, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, meal_type"
        )
        .gte("performed_on", startDate)
        .lte("performed_on", endDate)
        .order("performed_on", { ascending: true });
      logsQuery = applySubjectFilters(logsQuery, subject);

      const [{ data: logsData, error: logsError }, targets] = await Promise.all([
        logsQuery,
        resolveTargets(supabase, subject, endDate),
      ]);
      if (logsError) throw new Error(logsError.message);

      let complianceRows: MealComplianceRow[] = [];
      let complianceFactsAvailable = false;

      let complianceQuery = supabase
        .from("diary_compliance")
        .select(
          "performed_on, overall_compliant, basis, target_source, calories_compliant, protein_compliant, carbs_compliant, fat_compliant"
        )
        .gte("performed_on", startDate)
        .lte("performed_on", endDate)
        .order("performed_on", { ascending: true });
      complianceQuery = applySubjectFilters(complianceQuery, subject);

      const { data: complianceData, error: complianceError } = await complianceQuery;
      if (complianceError) {
        if (!isMissingSchemaDependencyError(complianceError)) {
          throw new Error(complianceError.message);
        }
      } else {
        complianceRows = (complianceData || []) as MealComplianceRow[];
        complianceFactsAvailable = complianceRows.length > 0;
      }

      const logs = (logsData || []) as MealLogRangeRow[];
      const logIds = logs.map((row) => row.id);
      const logsById = new Map(logs.map((row) => [row.id, row] as const));
      const items = await listMealLogItemsByIds(supabase, logIds);

      const { dailyRows, byDate } = aggregateDailyRows(logs, targets);
      const daysLogged = dailyRows.length;
      const averages = computeAverages(dailyRows);
      const inlineCompliance = computeComplianceScore(dailyRows, targets);
      const factCompliance = complianceFactsAvailable ? computeComplianceFromFactRows(complianceRows) : null;
      const compliance = factCompliance
        ? {
            compliance: factCompliance.compliance,
            calCompliance: factCompliance.calCompliance,
            proteinCompliance: factCompliance.proteinCompliance,
            carbsCompliance: factCompliance.carbsCompliance,
            fatCompliance: factCompliance.fatCompliance,
          }
        : inlineCompliance;
      const totalCalories = dailyRows.reduce((sum, row) => sum + row.calories, 0);

      if (daysInRange >= 14) {
        dailyRows.forEach((row, index) => {
          if (index < 6) {
            row.rolling_avg_7 = null;
            return;
          }
          const slice = dailyRows.slice(index - 6, index + 1);
          row.rolling_avg_7 = roundAverage(
            slice.reduce((sum, entry) => sum + entry.calories, 0),
            slice.length
          );
        });
      }

      const totalDeficitSurplus = dailyRows.reduce(
        (sum, row) => sum + row.deficit_surplus,
        0
      );

      const macroRatio = computeMacroCaloriesRatio(
        averages.avgProteinG,
        averages.avgCarbsG,
        averages.avgFatG
      );

      const weekAverages = computeWeekdayWeekendAverages(dailyRows);
      const mealBreakdown = computeMealBreakdown(logs);
      const topFoods = computeTopFoods(items);
      const mealTiming = computeMealTiming(items, logsById);

      const inlineDailyCompliance = Array.from({ length: daysInRange }, (_, index) => {
        const date = addDays(startDate, index);
        const row = byDate.get(date);
        if (!row) {
          return {
            date,
            level: "not_logged" as const,
          };
        }
        if (targets.source === "none") {
          return {
            date,
            level: "logged_no_target" as const,
          };
        }
        return {
          date,
          level: isRowFullyCompliant(row, targets)
            ? ("logged_on_target" as const)
            : ("logged_off_target" as const),
        };
      });
      const dailyCompliance = complianceFactsAvailable
        ? buildDailyComplianceFromFactRows(complianceRows, startDate, daysInRange)
        : inlineDailyCompliance;

      const perfectDays = factCompliance
        ? factCompliance.perfectDays
        : targets.source === "none"
        ? 0
        : dailyRows.filter((row) => isRowFullyCompliant(row, targets)).length;

      const longestStreak = computeLongestStreak(dailyRows, startDate, daysInRange);
      const dowAvgCalories = computeDowAverages(dailyRows);

      let cumulative = 0;
      const cumulativeRows = dailyRows.map((row) => {
        cumulative += row.deficit_surplus;
        return {
          date: row.date,
          cumulative,
        };
      });

      let priorSnapshot: {
        avgCalories: number;
        avgProteinG: number;
        avgCarbsG: number;
        avgFatG: number;
        compliance: number;
      } | null = null;

      if (daysInRange >= 14) {
        const priorEndDate = subtractDays(startDate, 1);
        const priorStartDate = subtractDays(startDate, daysInRange);

        let priorLogsQuery = supabase
          .from("diary_entries")
          .select(
            "id, performed_on, total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, meal_type"
          )
          .gte("performed_on", priorStartDate)
          .lte("performed_on", priorEndDate)
          .order("performed_on", { ascending: true });
        priorLogsQuery = applySubjectFilters(priorLogsQuery, subject);

        const { data: priorLogsData, error: priorLogsError } = await priorLogsQuery;
        if (priorLogsError) throw new Error(priorLogsError.message);

        const priorLogs = (priorLogsData || []) as MealLogRangeRow[];
        const { dailyRows: priorRows } = aggregateDailyRows(priorLogs, targets);
        let priorComplianceRows: MealComplianceRow[] = [];
        if (complianceFactsAvailable) {
          let priorComplianceQuery = supabase
            .from("diary_compliance")
            .select(
              "performed_on, overall_compliant, basis, target_source, calories_compliant, protein_compliant, carbs_compliant, fat_compliant"
            )
            .gte("performed_on", priorStartDate)
            .lte("performed_on", priorEndDate)
            .order("performed_on", { ascending: true });
          priorComplianceQuery = applySubjectFilters(priorComplianceQuery, subject);
          const { data: priorComplianceData, error: priorComplianceError } = await priorComplianceQuery;
          if (priorComplianceError) {
            if (!isMissingSchemaDependencyError(priorComplianceError)) {
              throw new Error(priorComplianceError.message);
            }
          } else {
            priorComplianceRows = (priorComplianceData || []) as MealComplianceRow[];
          }
        }

        if (priorRows.length > 0) {
          const priorAverages = computeAverages(priorRows);
          const priorComplianceScore =
            priorComplianceRows.length > 0
              ? computeComplianceFromFactRows(priorComplianceRows).compliance
              : computeComplianceScoreForRows(priorRows, targets);
          priorSnapshot = {
            avgCalories: priorAverages.avgCalories,
            avgProteinG: priorAverages.avgProteinG,
            avgCarbsG: priorAverages.avgCarbsG,
            avgFatG: priorAverages.avgFatG,
            compliance: priorComplianceScore,
          };
        }
      }

      const deltas = computeDeltas(
        {
          avgCalories: averages.avgCalories,
          avgProteinG: averages.avgProteinG,
          avgCarbsG: averages.avgCarbsG,
          avgFatG: averages.avgFatG,
          compliance: compliance.compliance,
        },
        priorSnapshot
      );

      const insights = computeInsights({
        range: payload.range,
        daysLogged,
        daysInRange,
        targets,
        avgProteinG: averages.avgProteinG,
        proteinCompliance: compliance.proteinCompliance,
        weekdayAvgCalories: weekAverages.weekday,
        weekendAvgCalories: weekAverages.weekend,
        avgFiberG: averages.avgFiberG,
        dailyRows,
        perfectDays,
      });

      return {
        range: payload.range,
        start_date: startDate,
        end_date: endDate,
        days_in_range: daysInRange,
        days_logged: daysLogged,
        logging_streak: computeLoggingStreak(dailyRows, toDateInput(new Date())),

        targets,

        avg_calories: averages.avgCalories,
        avg_protein_g: averages.avgProteinG,
        avg_carbs_g: averages.avgCarbsG,
        avg_fat_g: averages.avgFatG,
        avg_fiber_g: averages.avgFiberG,

        compliance_score: compliance.compliance,
        cal_compliance: compliance.calCompliance,
        protein_compliance: compliance.proteinCompliance,
        carbs_compliance: compliance.carbsCompliance,
        fat_compliance: compliance.fatCompliance,

        total_calories: totalCalories,
        total_deficit_surplus: totalDeficitSurplus,

        protein_pct_of_calories: macroRatio.protein,
        carbs_pct_of_calories: macroRatio.carbs,
        fat_pct_of_calories: macroRatio.fat,

        weekday_avg_calories: weekAverages.weekday,
        weekend_avg_calories: weekAverages.weekend,

        daily_rows: dailyRows,
        meal_breakdown: mealBreakdown,
        top_foods: topFoods,
        deltas,

        daily_compliance: dailyCompliance,
        dow_avg_calories: dowAvgCalories,
        cumulative_rows: cumulativeRows,
        avg_first_meal_time: mealTiming.avg_first_meal_time,
        avg_last_meal_time: mealTiming.avg_last_meal_time,
        avg_eating_window_minutes: mealTiming.avg_eating_window_minutes,
        late_meal_days: mealTiming.late_meal_days,
        perfect_days: perfectDays,
        longest_streak: longestStreak,
        insights,
      };
    },
  });
}
