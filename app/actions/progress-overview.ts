"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { estimateOneRepMax } from "@/utils/fitness-logic";
import { extractMuscleFocusTag } from "@/lib/exercises/muscle-groups";
import { fetchExecutionRowsForUserScope, getLinkedClientIdsForUser } from "@/lib/training/execution-scope";

export type ProgressRange = "7d" | "30d" | "90d";
export type ProgressTrainingType = "all" | "strength" | "cardio" | "mixed";

export type ProgressSummaryStats = {
  sessions: number;
  completion_pct: number;
  avg_rpe: number | null;
  volume_kg: number;
  cardio_time_minutes: number;
  avg_steps_per_day: number | null;
  latest_weight: number | null;
  weight_delta_kg: number | null;
  vo2max_estimate: number | null;
  vo2max_delta: number | null;
};

export type InsightSeverity = "positive" | "warning" | "info";

export type ProgressInsight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  score: number;
};

export type BodyCompositionPoint = {
  date: string;
  weight: number | null;
  body_fat_pct: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  neck: number | null;
  bicep_left: number | null;
  bicep_right: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  calf: number | null;
};

export type BodyCompositionSeries = BodyCompositionPoint[];

export type StrengthTrendPoint = {
  date: string;
  [exerciseName: string]: number | string | null;
};

export type RecentPR = {
  exercise: string;
  estimated_1rm_kg: number;
  achieved_on: string;
  delta_kg: number;
};

export type StrengthProgressData = {
  top_exercises: string[];
  trend_series: StrengthTrendPoint[];
  recent_prs: RecentPR[];
  focus_distribution: Array<{ focus: "push" | "pull" | "legs" | "core"; score: number; pct: number }>;
  muscle_volume: Array<{ muscle_group: string; volume_kg: number; pct: number }>;
};

export type CardioProgressPoint = {
  date: string;
  distance: number | null;
  pace_min_per_km: number | null;
  avg_hr_bpm: number | null;
};

export type CardioProgressSeries = {
  series: CardioProgressPoint[];
  hr_zones_summary: {
    zone1_pct: number;
    zone2_pct: number;
    zone3_pct: number;
    zone4_pct: number;
    zone5_pct: number;
  } | null;
  activity_breakdown: Array<{ type: string; pct: number; session_count: number }>;
};

export type WeeklyWorkoutBar = {
  week_start: string;
  session_count: number;
};

export type RecoveryReadinessPoint = {
  date: string;
  recovery_score: number | null;
  hrv_ms: number | null;
};

export type ComplianceRecoveryData = {
  day_streak: number;
  task_completion: { completed: number; total: number; pct: number };
  recovery_score: number | null;
  last_sleep_hours: number | null;
  last_hrv_ms: number | null;
  workouts_per_week: WeeklyWorkoutBar[];
  readiness_series: RecoveryReadinessPoint[];
  workout_calendar: Array<{
    date: string;
    has_strength: boolean;
    has_cardio: boolean;
    session_count: number;
  }>;
  rhr_series: Array<{ date: string; rhr_bpm: number }>;
  sleep_score_avg: number | null;
  sleep_stages_last: {
    deep_minutes: number | null;
    rem_minutes: number | null;
    light_minutes: number | null;
    awake_minutes: number | null;
  } | null;
  habits: Array<{
    id: string;
    name: string;
    completed_today: boolean;
    streak_days: number;
    completion_pct_range: number;
  }>;
};

export type TrainingLoadPoint = {
  date: string;
  fitness: number;
  fatigue: number;
  form: number;
};

export type TrainingLoadData = {
  training_status:
    | "Productive"
    | "Maintaining"
    | "Peaking"
    | "Detraining"
    | "Recovery"
    | "Insufficient Data";
  fitness_score: number;
  fatigue_score: number;
  form_score: number;
  load_trend: TrainingLoadPoint[];
};

export type ProgressOverviewBundle = {
  summary: ProgressSummaryStats;
  insights: ProgressInsight[];
  body_composition: {
    current: BodyCompositionSeries;
    compare: BodyCompositionSeries | null;
  };
  strength: {
    current: StrengthProgressData;
    compare: StrengthProgressData | null;
  };
  cardio: {
    current: CardioProgressSeries;
    compare: CardioProgressSeries | null;
  };
  compliance: {
    current: ComplianceRecoveryData;
    compare: ComplianceRecoveryData | null;
  };
  training_load: {
    current: TrainingLoadData;
    compare: TrainingLoadData | null;
  };
};

type SessionRow = {
  id: string;
  performed_on: string;
  template_workout_id: string | null;
  perceived_exertion: number | null;
  duration_minutes: number | null;
  name: string | null;
};

type StrengthSetRow = Pick<
  Database["public"]["Tables"]["strength_sets"]["Row"],
  "id" | "workout_id" | "exercise_name" | "weight" | "reps" | "rpe" | "calculated_1rm" | "created_at"
> & {
  execution_id: string | null;
};

type CardioRow = Pick<
  Database["public"]["Tables"]["cardio_sessions"]["Row"],
  | "id"
  | "workout_id"
  | "date"
  | "distance"
  | "duration_minutes"
  | "average_heart_rate"
  | "activity_type"
  | "vo2max_estimate"
> & {
  execution_id: string | null;
};

type BodyMeasurementRow = Pick<
  Database["public"]["Tables"]["body_measurements"]["Row"],
  | "date"
  | "weight"
  | "body_fat_percent"
  | "waist"
  | "hips"
  | "chest"
  | "neck"
  | "bicep_left"
  | "bicep_right"
  | "thigh_left"
  | "thigh_right"
  | "calf"
  | "arms_cm"
  | "thighs_cm"
  | "calves_cm"
>;

const progressRangeSchema = z.enum(["7d", "30d", "90d"]);
const progressTypeSchema = z.enum(["all", "strength", "cardio", "mixed"]);

const RANGE_DAYS: Record<ProgressRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

function buildWindow(range: ProgressRange, offsetPeriods = 0) {
  const days = RANGE_DAYS[range];
  const endDateBase = toDateInput(new Date());
  const shiftedEndDate = subtractDays(endDateBase, offsetPeriods * days);
  const startDate = subtractDays(shiftedEndDate, days - 1);
  return {
    range,
    days,
    startDate,
    endDate: shiftedEndDate,
  };
}

function safeNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toIsoDay(value: string) {
  return value.slice(0, 10);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function formatPct(value: number) {
  return `${Math.round(value)}%`;
}

function formatWeight(value: number) {
  return `${roundOne(value)}`;
}

function isMissingSchemaDependencyError(error: { code?: string; message?: string } | null | undefined) {
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

function getAgeFromBirthDate(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const now = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = now.getUTCDate() - birth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age > 0 ? age : null;
}

function getMaxHrFromBirthDate(birthDate: string | null | undefined) {
  const age = getAgeFromBirthDate(birthDate);
  if (!age) return 190;
  return Math.max(150, 220 - age);
}

function inferTrainingType(hasStrength: boolean, hasCardio: boolean): ProgressTrainingType | null {
  if (hasStrength && hasCardio) return "mixed";
  if (hasStrength) return "strength";
  if (hasCardio) return "cardio";
  return null;
}

function filterSessionIdsByTrainingType(
  sessions: SessionRow[],
  strengthBySession: Map<string, StrengthSetRow[]>,
  cardioBySession: Map<string, CardioRow[]>,
  trainingType: ProgressTrainingType
) {
  if (trainingType === "all") {
    return new Set(sessions.map((session) => session.id));
  }

  const allowed = new Set<string>();
  for (const session of sessions) {
    const hasStrength = (strengthBySession.get(session.id)?.length || 0) > 0;
    const hasCardio = (cardioBySession.get(session.id)?.length || 0) > 0;
    const sessionType = inferTrainingType(hasStrength, hasCardio);
    if (sessionType === trainingType) {
      allowed.add(session.id);
    }
  }
  return allowed;
}

function mapRowsByExecution<T extends { execution_id: string | null }>(rows: T[]) {
  const bySession = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.execution_id) continue;
    const existing = bySession.get(row.execution_id) ?? [];
    existing.push(row);
    bySession.set(row.execution_id, existing);
  }
  return bySession;
}

async function getProfileBirthDate(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("date_of_birth")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.date_of_birth ?? null;
}

async function fetchExecutionWindowData(
  userId: string,
  startDate: string,
  endDate: string,
  trainingType: ProgressTrainingType
) {
  const supabase = await createClient();
  const supabaseAny = supabase as any;

  const linkedClientIds = await getLinkedClientIdsForUser({ supabase, userId });
  const uniqueExecutionRows = (
    await fetchExecutionRowsForUserScope<{
      id: string;
      performed_on: string;
      template_workout_id: string | null;
    }>({
      supabaseAny,
      userId,
      linkedClientIds,
      startDate,
      endDate,
      select: "id, performed_on, template_workout_id",
      orderByPerformedOnAsc: true,
    })
  ).sort((a, b) => a.performed_on.localeCompare(b.performed_on));
  const executionIds = uniqueExecutionRows.map((row) => row.id);
  if (executionIds.length === 0) {
    return {
      sessions: [] as SessionRow[],
      includedSessionIds: new Set<string>(),
      strengthRows: [] as StrengthSetRow[],
      cardioRows: [] as CardioRow[],
      strengthBySession: new Map<string, StrengthSetRow[]>(),
      cardioBySession: new Map<string, CardioRow[]>(),
    };
  }

  const templateIds = Array.from(
    new Set(uniqueExecutionRows.map((row) => row.template_workout_id).filter((id): id is string => Boolean(id)))
  );
  const { data: templatesData, error: templatesError } = templateIds.length
    ? await supabase
        .from("training_sessions")
        .select("id, perceived_exertion, duration_minutes, name")
        .in("id", templateIds)
    : { data: [], error: null };
  if (templatesError) throw new Error(templatesError.message);

  const templateById = new Map(
    ((templatesData || []) as Array<{
      id: string;
      perceived_exertion: number | null;
      duration_minutes: number | null;
      name: string | null;
    }>).map((row) => [row.id, row] as const)
  );
  const sessions: SessionRow[] = uniqueExecutionRows.map((row) => {
    const template = row.template_workout_id ? templateById.get(row.template_workout_id) : null;
    return {
      id: row.id,
      performed_on: row.performed_on,
      template_workout_id: row.template_workout_id,
      perceived_exertion: template?.perceived_exertion ?? null,
      duration_minutes: template?.duration_minutes ?? null,
      name: template?.name ?? null,
    };
  });

  const [{ data: strengthData, error: strengthError }, { data: cardioData, error: cardioError }] =
    await Promise.all([
      supabaseAny
        .from("strength_sets")
        .select("id, execution_id, workout_id, exercise_name, weight, reps, rpe, calculated_1rm, created_at")
        .in("execution_id", executionIds),
      supabaseAny
        .from("cardio_sessions")
        .select("id, execution_id, workout_id, date, distance, duration_minutes, average_heart_rate, activity_type, vo2max_estimate")
        .in("execution_id", executionIds),
    ]);

  if (strengthError) throw new Error(strengthError.message);
  if (cardioError) throw new Error(cardioError.message);

  const strengthRows = (strengthData || []) as StrengthSetRow[];
  const cardioRows = (cardioData || []) as CardioRow[];

  const strengthBySession = mapRowsByExecution(strengthRows);
  const cardioBySession = mapRowsByExecution(cardioRows);
  const includedSessionIds = filterSessionIdsByTrainingType(
    sessions,
    strengthBySession,
    cardioBySession,
    trainingType
  );

  return {
    sessions,
    includedSessionIds,
    strengthRows,
    cardioRows,
    strengthBySession,
    cardioBySession,
  };
}

function computeVo2FromCardioRows(rows: CardioRow[]) {
  const runRows = rows.filter((row) => {
    const distance = safeNumber(row.distance);
    const duration = safeNumber(row.duration_minutes);
    return distance > 1 && duration > 5 && /run/i.test(row.activity_type || "");
  });

  const candidateRows = runRows.length > 0
    ? runRows
    : rows.filter((row) => safeNumber(row.distance) > 1 && safeNumber(row.duration_minutes) > 5);

  if (candidateRows.length === 0) return null;

  const best = [...candidateRows].sort(
    (a, b) => safeNumber(b.distance) - safeNumber(a.distance)
  )[0];

  const distanceKm = safeNumber(best.distance);
  const durationMin = safeNumber(best.duration_minutes);
  const speed = (distanceKm * 1000) / durationMin;

  const numerator = -4.6 + 0.182258 * speed + 0.000104 * speed * speed;
  const denominator =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin);

  const vo2 = numerator / denominator;
  if (!Number.isFinite(vo2)) return null;
  return roundOne(vo2);
}

function getPeriodBounds(range: ProgressRange, offset = 0) {
  return buildWindow(range, offset);
}

async function getAuthUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

export async function getProgressSummaryStats(
  rangeInput: ProgressRange,
  trainingTypeInput: ProgressTrainingType
): Promise<ProgressSummaryStats> {
  return runTrackedAction({
    eventName: "progress.overview.summary.read",
    payload: { range: rangeInput, training_type: trainingTypeInput },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const trainingType = progressTypeSchema.parse(trainingTypeInput);
      const userId = await getAuthUserId();
      const currentWindow = getPeriodBounds(range, 0);
      const priorWindow = getPeriodBounds(range, 1);

      const [currentData, priorData] = await Promise.all([
        fetchExecutionWindowData(userId, currentWindow.startDate, currentWindow.endDate, trainingType),
        fetchExecutionWindowData(userId, priorWindow.startDate, priorWindow.endDate, trainingType),
      ]);

      const includedSessions = currentData.sessions.filter((session) =>
        currentData.includedSessionIds.has(session.id)
      );
      const includedSessionIds = new Set(includedSessions.map((session) => session.id));

      const completedSessions = includedSessions.length;
      const completedDays = new Set(includedSessions.map((session) => session.performed_on)).size;
      const completionPct = currentWindow.days > 0 ? Math.round((completedDays / currentWindow.days) * 100) : 0;

      const scopedStrengthRows =
        trainingType === "cardio"
          ? []
          : currentData.strengthRows.filter(
              (row) => Boolean(row.execution_id && includedSessionIds.has(row.execution_id))
            );

      const scopedCardioRows =
        trainingType === "strength"
          ? []
          : currentData.cardioRows.filter(
              (row) => Boolean(row.execution_id && includedSessionIds.has(row.execution_id))
            );

      const rpeValues = scopedStrengthRows
        .map((row) => row.rpe)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const avgRpe = rpeValues.length > 0 ? roundOne(average(rpeValues)) : null;

      const volumeKg = roundOne(
        scopedStrengthRows.reduce((sum, row) => {
          const weight = safeNumber(row.weight);
          const reps = safeNumber(row.reps);
          return sum + weight * reps;
        }, 0)
      );

      const cardioTime = Math.round(
        scopedCardioRows.reduce((sum, row) => sum + safeNumber(row.duration_minutes), 0)
      );

      const supabase = await createClient();
      const [{ data: weightRows, error: weightError }, { data: priorWeightRows, error: priorWeightError }] =
        await Promise.all([
          supabase
            .from("body_measurements")
            .select("date, weight")
            .eq("user_id", userId)
            .gte("date", currentWindow.startDate)
            .lte("date", currentWindow.endDate)
            .not("weight", "is", null)
            .order("date", { ascending: false })
            .limit(1),
          supabase
            .from("body_measurements")
            .select("date, weight")
            .eq("user_id", userId)
            .gte("date", priorWindow.startDate)
            .lte("date", priorWindow.endDate)
            .not("weight", "is", null)
            .order("date", { ascending: false })
            .limit(1),
        ]);

      if (weightError) throw new Error(weightError.message);
      if (priorWeightError) throw new Error(priorWeightError.message);

      const latestWeight = weightRows?.[0]?.weight ?? null;
      const priorWeight = priorWeightRows?.[0]?.weight ?? null;
      const weightDelta =
        latestWeight !== null && priorWeight !== null ? roundOne(latestWeight - priorWeight) : null;

      const supabaseAny = supabase as any;
      let avgStepsPerDay: number | null = null;
      const stepsResult = await supabaseAny
        .from("daily_activity")
        .select("date, steps")
        .eq("user_id", userId)
        .gte("date", currentWindow.startDate)
        .lte("date", currentWindow.endDate);

      if (!stepsResult.error) {
        const stepValues = (stepsResult.data || [])
          .map((row: { steps: number | null }) => safeNumber(row.steps))
          .filter((value: number) => value > 0);
        avgStepsPerDay = stepValues.length > 0 ? Math.round(average(stepValues)) : null;
      } else if (!isMissingSchemaDependencyError(stepsResult.error)) {
        throw new Error(stepsResult.error.message);
      }

      const vo2Estimate = computeVo2FromCardioRows(scopedCardioRows);

      const priorIncludedSessions = priorData.sessions.filter((session) =>
        priorData.includedSessionIds.has(session.id)
      );
      const priorIds = new Set(priorIncludedSessions.map((session) => session.id));
      const priorCardioRows =
        trainingType === "strength"
          ? []
          : priorData.cardioRows.filter((row) => Boolean(row.execution_id && priorIds.has(row.execution_id)));
      const priorVo2 = computeVo2FromCardioRows(priorCardioRows);
      const vo2Delta =
        vo2Estimate !== null && priorVo2 !== null ? roundOne(vo2Estimate - priorVo2) : null;

      return {
        sessions: completedSessions,
        completion_pct: completionPct,
        avg_rpe: avgRpe,
        volume_kg: volumeKg,
        cardio_time_minutes: cardioTime,
        avg_steps_per_day: avgStepsPerDay,
        latest_weight: latestWeight,
        weight_delta_kg: weightDelta,
        vo2max_estimate: vo2Estimate,
        vo2max_delta: vo2Delta,
      };
    },
  });
}

function compareByScoreDesc<T extends { score: number }>(a: T, b: T) {
  return b.score - a.score;
}

function withInsight(
  insights: ProgressInsight[],
  insight: Omit<ProgressInsight, "id">
) {
  insights.push({
    id: `${insight.severity}-${insights.length + 1}-${insight.title.toLowerCase().replace(/\s+/g, "-")}`,
    ...insight,
  });
}

function toWeekStartIso(dateIso: string) {
  const date = parseDateInput(dateIso);
  const day = date.getUTCDay();
  const mondayShift = day === 0 ? -6 : 1 - day;
  return addDays(dateIso, mondayShift);
}

function buildDailySeriesFromValues(
  startDate: string,
  endDate: string,
  values: Map<string, number>
) {
  const rows: Array<{ date: string; value: number }> = [];
  const days = daysBetweenInclusive(startDate, endDate);
  for (let index = 0; index < days; index += 1) {
    const date = addDays(startDate, index);
    rows.push({ date, value: roundTwo(values.get(date) || 0) });
  }
  return rows;
}

function computeEwma(series: Array<{ date: string; value: number }>, period: number) {
  const alpha = 2 / (period + 1);
  let prev = 0;
  return series.map((row, index) => {
    if (index === 0) {
      prev = row.value;
      return { date: row.date, value: roundTwo(prev) };
    }
    prev = row.value * alpha + prev * (1 - alpha);
    return { date: row.date, value: roundTwo(prev) };
  });
}

async function computeTrainingLoadDataInternal(
  userId: string,
  range: ProgressRange,
  offsetPeriods = 0
): Promise<TrainingLoadData> {
  const window = getPeriodBounds(range, offsetPeriods);
  const loadStart = subtractDays(window.endDate, 41);
  const executionData = await fetchExecutionWindowData(userId, loadStart, window.endDate, "all");
  const sessions = executionData.sessions;
  const strengthBySession = executionData.strengthBySession;
  const cardioBySession = executionData.cardioBySession;

  const birthDate = await getProfileBirthDate(userId);
  const maxHr = getMaxHrFromBirthDate(birthDate);

  const dailyTrimp = new Map<string, number>();

  for (const session of sessions) {
    const date = session.performed_on;
    const cardioForSession = cardioBySession.get(session.id) ?? [];
    const strengthForSession = strengthBySession.get(session.id) ?? [];

    let sessionTrimp = 0;

    if (cardioForSession.length > 0) {
      for (const cardio of cardioForSession) {
        const duration = safeNumber(cardio.duration_minutes);
        const avgHr = safeNumber(cardio.average_heart_rate);
        if (duration <= 0 || avgHr <= 0) continue;
        const avgHrRatio = clamp(avgHr / maxHr, 0, 1.1);
        sessionTrimp += duration * avgHrRatio * 0.64 * Math.exp(1.92 * avgHrRatio);
      }
    }

    if (strengthForSession.length > 0) {
      const volume = strengthForSession.reduce(
        (sum, row) => sum + safeNumber(row.weight) * safeNumber(row.reps),
        0
      );
      const exertion = safeNumber(session.perceived_exertion) || 6;
      sessionTrimp += (volume / 1000) * exertion;
    }

    const existing = dailyTrimp.get(date) ?? 0;
    dailyTrimp.set(date, existing + sessionTrimp);
  }

  const dailySeries = buildDailySeriesFromValues(loadStart, window.endDate, dailyTrimp);
  const fitnessSeries = computeEwma(dailySeries, 42);
  const fatigueSeries = computeEwma(dailySeries, 7);

  const loadTrend: TrainingLoadPoint[] = dailySeries.map((row, index) => {
    const fitness = fitnessSeries[index]?.value ?? 0;
    const fatigue = fatigueSeries[index]?.value ?? 0;
    const form = roundTwo(fitness - fatigue);
    return {
      date: row.date,
      fitness,
      fatigue,
      form,
    };
  });

  const latest = loadTrend[loadTrend.length - 1];
  const fitnessScore = latest?.fitness ?? 0;
  const fatigueScore = latest?.fatigue ?? 0;
  const formScore = latest?.form ?? 0;

  const recentLoad = loadTrend.slice(-7);
  const priorLoad = loadTrend.slice(-14, -7);
  const recentFitnessAvg = average(recentLoad.map((row) => row.fitness));
  const priorFitnessAvg = average(priorLoad.map((row) => row.fitness));
  const fitnessDeltaPct =
    priorFitnessAvg > 0 ? ((recentFitnessAvg - priorFitnessAvg) / priorFitnessAvg) * 100 : 0;

  const sessionsLast5Days = sessions.filter(
    (session) => parseDateInput(session.performed_on).getTime() >= parseDateInput(subtractDays(window.endDate, 4)).getTime()
  ).length;

  let trainingStatus: TrainingLoadData["training_status"] = "Insufficient Data";
  if (sessions.length < 7) {
    trainingStatus = "Insufficient Data";
  } else if (sessionsLast5Days === 0 && fitnessScore > 20) {
    trainingStatus = "Recovery";
  } else if (sessionsLast5Days === 0) {
    trainingStatus = "Detraining";
  } else if (fitnessScore > 35 && formScore < -20) {
    trainingStatus = "Peaking";
  } else if (fitnessDeltaPct > 5 && formScore > -10) {
    trainingStatus = "Productive";
  } else if (Math.abs(fitnessDeltaPct) <= 5 && formScore > -10) {
    trainingStatus = "Maintaining";
  } else {
    trainingStatus = "Recovery";
  }

  return {
    training_status: trainingStatus,
    fitness_score: roundOne(fitnessScore),
    fatigue_score: roundOne(fatigueScore),
    form_score: roundOne(formScore),
    load_trend: loadTrend,
  };
}

export async function getTrainingLoad(
  rangeInput: ProgressRange,
  offsetPeriods = 0
): Promise<TrainingLoadData> {
  return runTrackedAction({
    eventName: "progress.overview.training_load.read",
    payload: { range: rangeInput, offset_periods: offsetPeriods },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const userId = await getAuthUserId();
      return computeTrainingLoadDataInternal(userId, range, offsetPeriods);
    },
  });
}

function sortInsights(insights: ProgressInsight[]) {
  const positive = insights
    .filter((insight) => insight.severity === "positive")
    .sort(compareByScoreDesc)
    .slice(0, 2);
  const warning = insights
    .filter((insight) => insight.severity === "warning")
    .sort(compareByScoreDesc)
    .slice(0, 2);
  const info = insights
    .filter((insight) => insight.severity === "info")
    .sort(compareByScoreDesc)
    .slice(0, 1);

  return [...positive, ...warning, ...info].slice(0, 5).map((insight, index) => ({
    ...insight,
    id: `${insight.severity}-${index + 1}-${insight.title.toLowerCase().replace(/\s+/g, "-")}`,
  }));
}

export async function getProgressInsights(
  rangeInput: ProgressRange,
  trainingTypeInput: ProgressTrainingType
): Promise<ProgressInsight[]> {
  return runTrackedAction({
    eventName: "progress.overview.insights.read",
    payload: { range: rangeInput, training_type: trainingTypeInput },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const trainingType = progressTypeSchema.parse(trainingTypeInput);
      const userId = await getAuthUserId();
      const currentWindow = getPeriodBounds(range, 0);
      const priorWindow = getPeriodBounds(range, 1);

      const [currentData, priorData] = await Promise.all([
        fetchExecutionWindowData(userId, currentWindow.startDate, currentWindow.endDate, trainingType),
        fetchExecutionWindowData(userId, priorWindow.startDate, priorWindow.endDate, trainingType),
      ]);

      const currentIncluded = currentData.sessions.filter((session) =>
        currentData.includedSessionIds.has(session.id)
      );
      const priorIncluded = priorData.sessions.filter((session) =>
        priorData.includedSessionIds.has(session.id)
      );

      if (currentIncluded.length < 3) {
        return [];
      }

      const currentIds = new Set(currentIncluded.map((session) => session.id));
      const priorIds = new Set(priorIncluded.map((session) => session.id));

      const currentStrength = currentData.strengthRows.filter(
        (row) => Boolean(row.execution_id && currentIds.has(row.execution_id))
      );
      const priorStrength = priorData.strengthRows.filter(
        (row) => Boolean(row.execution_id && priorIds.has(row.execution_id))
      );

      const currentVolume = currentStrength.reduce(
        (sum, row) => sum + safeNumber(row.weight) * safeNumber(row.reps),
        0
      );
      const priorVolume = priorStrength.reduce(
        (sum, row) => sum + safeNumber(row.weight) * safeNumber(row.reps),
        0
      );

      const insights: ProgressInsight[] = [];

      if (priorVolume > 0) {
        const volumeDeltaPct = ((currentVolume - priorVolume) / priorVolume) * 100;
        if (volumeDeltaPct > 10) {
          withInsight(insights, {
            severity: "positive",
            title: `Volume Up ${Math.round(volumeDeltaPct)}%`,
            body: `Your total training volume increased ${Math.round(
              volumeDeltaPct
            )}% compared to last period. Great progressive overload.`,
            score: Math.abs(volumeDeltaPct),
          });
        } else if (volumeDeltaPct < -15) {
          withInsight(insights, {
            severity: "warning",
            title: `Volume Dropped ${Math.abs(Math.round(volumeDeltaPct))}%`,
            body: `Your training volume dropped ${Math.abs(
              Math.round(volumeDeltaPct)
            )}% vs last period. Check recovery or schedule.`,
            score: Math.abs(volumeDeltaPct),
          });
        }
      }

      // PR detection (max 2)
      const topExerciseNames = Array.from(
        currentStrength.reduce((set, row) => {
          if (row.exercise_name) set.add(row.exercise_name);
          return set;
        }, new Set<string>())
      );

      if (topExerciseNames.length > 0) {
        const priorStrengthWindow = await fetchExecutionWindowData(
          userId,
          subtractDays(currentWindow.startDate, 730),
          subtractDays(currentWindow.startDate, 1),
          "all"
        );
        const topExerciseSet = new Set(topExerciseNames);
        const priorStrengthRows = priorStrengthWindow.strengthRows.filter((row) =>
          topExerciseSet.has(row.exercise_name)
        );
        const currentSessionById = new Map(
          currentData.sessions.map((row) => [row.id, row.performed_on] as const)
        );

        const priorBest = new Map<string, number>();
        for (const row of priorStrengthRows) {
          const estimate = safeNumber(row.calculated_1rm) || estimateOneRepMax(safeNumber(row.weight), safeNumber(row.reps));
          const existing = priorBest.get(row.exercise_name) ?? 0;
          if (estimate > existing) priorBest.set(row.exercise_name, estimate);
        }

        const currentBest = new Map<string, { value: number; date: string }>();
        for (const row of currentStrength) {
          const estimate = safeNumber(row.calculated_1rm) || estimateOneRepMax(safeNumber(row.weight), safeNumber(row.reps));
          const date = row.execution_id
            ? currentSessionById.get(row.execution_id) || toIsoDay(row.created_at || currentWindow.endDate)
            : toIsoDay(row.created_at || currentWindow.endDate);
          const existing = currentBest.get(row.exercise_name);
          if (!existing || estimate > existing.value) {
            currentBest.set(row.exercise_name, { value: estimate, date });
          }
        }

        const prs: Array<{ exercise: string; value: number; delta: number; date: string }> = [];
        for (const [exercise, current] of currentBest.entries()) {
          const previous = priorBest.get(exercise) ?? 0;
          if (current.value > previous && previous > 0) {
            prs.push({
              exercise,
              value: roundOne(current.value),
              delta: roundOne(current.value - previous),
              date: current.date,
            });
          }
        }

        prs
          .sort((a, b) => b.delta - a.delta)
          .slice(0, 2)
          .forEach((pr) => {
            withInsight(insights, {
              severity: "positive",
              title: `${pr.exercise} PR!`,
              body: `New estimated 1RM of ${formatWeight(pr.value)} on ${pr.date}, beating your previous best by ${formatWeight(
                pr.delta
              )}.`,
              score: pr.delta,
            });
          });
      }

      // RPE trend (last 7 vs prior 7)
      const recentWindowStart = subtractDays(currentWindow.endDate, 6);
      const olderWindowStart = subtractDays(recentWindowStart, 7);
      const olderWindowEnd = subtractDays(recentWindowStart, 1);

      const [recentData, olderData] = await Promise.all([
        fetchExecutionWindowData(userId, recentWindowStart, currentWindow.endDate, "all"),
        fetchExecutionWindowData(userId, olderWindowStart, olderWindowEnd, "all"),
      ]);

      const recentIds = new Set(
        recentData.sessions.filter((session) => recentData.includedSessionIds.has(session.id)).map((session) => session.id)
      );
      const olderIds = new Set(
        olderData.sessions.filter((session) => olderData.includedSessionIds.has(session.id)).map((session) => session.id)
      );

      const recentRpeValues = recentData.strengthRows
        .filter((row) => Boolean(row.execution_id && recentIds.has(row.execution_id)))
        .map((row) => row.rpe)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const olderRpeValues = olderData.strengthRows
        .filter((row) => Boolean(row.execution_id && olderIds.has(row.execution_id)))
        .map((row) => row.rpe)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      const recentAvgRpe = recentRpeValues.length ? average(recentRpeValues) : 0;
      const olderAvgRpe = olderRpeValues.length ? average(olderRpeValues) : 0;

      if (recentRpeValues.length > 0 && olderRpeValues.length > 0 && recentAvgRpe - olderAvgRpe >= 0.5) {
        withInsight(insights, {
          severity: "warning",
          title: "RPE Creeping Up",
          body: `Average RPE has increased from ${roundOne(olderAvgRpe)} to ${roundOne(
            recentAvgRpe
          )}. Monitor fatigue and consider a deload soon.`,
          score: recentAvgRpe - olderAvgRpe,
        });
      }

      const sessionsPerWeek = currentIncluded.length / Math.max(1, currentWindow.days / 7);
      if (sessionsPerWeek < 2) {
        withInsight(insights, {
          severity: "warning",
          title: "Training Frequency Low",
          body: "You averaged fewer than 2 sessions per week this period. Consistency is key.",
          score: 2 - sessionsPerWeek,
        });
      }

      const currentCardioRows = currentData.cardioRows.filter((row) => {
        if (!row.execution_id) return trainingType === "all";
        return currentIds.has(row.execution_id);
      });
      const priorCardioRows = priorData.cardioRows.filter((row) => {
        if (!row.execution_id) return trainingType === "all";
        return priorIds.has(row.execution_id);
      });

      const cardioByType = new Map<string, number>();
      for (const row of currentCardioRows) {
        const key = (row.activity_type || "other").toLowerCase();
        cardioByType.set(key, (cardioByType.get(key) || 0) + 1);
      }
      const totalCardio = currentCardioRows.length;
      if (totalCardio > 0) {
        const topType = [...cardioByType.entries()].sort((a, b) => b[1] - a[1])[0];
        if (topType) {
          const pct = (topType[1] / totalCardio) * 100;
          if (pct > 80) {
            withInsight(insights, {
              severity: "info",
              title: "Add Cardio Variety",
              body: `Your cardio is ${Math.round(pct)}% ${topType[0]}. Consider adding another modality for balanced conditioning.`,
              score: pct,
            });
          }
        }
      }

      const currentAvgDistance = average(
        currentCardioRows.map((row) => safeNumber(row.distance)).filter((distance) => distance > 0)
      );
      const priorAvgDistance = average(
        priorCardioRows.map((row) => safeNumber(row.distance)).filter((distance) => distance > 0)
      );

      if (priorAvgDistance > 0) {
        const distanceDeltaPct = ((currentAvgDistance - priorAvgDistance) / priorAvgDistance) * 100;
        if (distanceDeltaPct > 10) {
          withInsight(insights, {
            severity: "positive",
            title: `Cardio Distance Up ${Math.round(distanceDeltaPct)}%`,
            body: `Your average distance increased ${Math.round(distanceDeltaPct)}% this period. Strong aerobic progression.`,
            score: distanceDeltaPct,
          });
        }
      }

      // Sleep/vitals optional tables.
      const supabase = await createClient();
      const supabaseAny = supabase as any;
      const [sleepResult, vitalsResult] = await Promise.all([
        supabaseAny
          .from("sleep_log")
          .select("date, total_duration_minutes, sleep_score")
          .eq("user_id", userId)
          .gte("date", currentWindow.startDate)
          .lte("date", currentWindow.endDate),
        supabaseAny
          .from("vitals_log")
          .select("recorded_at, resting_heart_rate")
          .eq("user_id", userId)
          .gte("recorded_at", `${subtractDays(currentWindow.endDate, 89)}T00:00:00.000Z`)
          .lte("recorded_at", `${currentWindow.endDate}T23:59:59.999Z`),
      ]);

      const hasSleepError = sleepResult.error && !isMissingSchemaDependencyError(sleepResult.error);
      const hasVitalsError = vitalsResult.error && !isMissingSchemaDependencyError(vitalsResult.error);
      if (hasSleepError) throw new Error(sleepResult.error.message);
      if (hasVitalsError) throw new Error(vitalsResult.error.message);

      const sleepRows = (sleepResult.data || []) as Array<{
        date: string;
        total_duration_minutes: number | null;
      }>;
      const avgSleepHours =
        sleepRows.length > 0
          ? average(
              sleepRows
                .map((row) => safeNumber(row.total_duration_minutes) / 60)
                .filter((value) => value > 0)
            )
          : 0;

      if (sleepRows.length === 0) {
        withInsight(insights, {
          severity: "info",
          title: "Log Your Sleep",
          body: "No sleep data found. Tracking sleep helps monitor recovery and readiness.",
          score: 1,
        });
      } else if (avgSleepHours > 0 && avgSleepHours < 6.5) {
        withInsight(insights, {
          severity: "warning",
          title: "Sleep Debt Accumulating",
          body: `Averaging ${roundOne(avgSleepHours)}h sleep this period. Aim for 7–9h to support recovery and adaptation.`,
          score: 6.5 - avgSleepHours,
        });
      }

      const vitalsRows = (vitalsResult.data || []) as Array<{
        recorded_at: string;
        resting_heart_rate: number | null;
      }>;
      const currentRhrRows = vitalsRows.filter((row) => toIsoDay(row.recorded_at) >= subtractDays(currentWindow.endDate, 6));
      const baselineRhrRows = vitalsRows;
      const currentRhr = average(
        currentRhrRows
          .map((row) => safeNumber(row.resting_heart_rate))
          .filter((value) => value > 0)
      );
      const baselineRhr = average(
        baselineRhrRows
          .map((row) => safeNumber(row.resting_heart_rate))
          .filter((value) => value > 0)
      );

      if (currentRhr > 0 && baselineRhr > 0 && currentRhr - baselineRhr >= 5) {
        withInsight(insights, {
          severity: "warning",
          title: "Resting HR Elevated",
          body: `Your resting HR is ${roundOne(currentRhr - baselineRhr)} bpm above baseline. Consider prioritising recovery.`,
          score: currentRhr - baselineRhr,
        });
      }

      // Muscle imbalance from current range
      const exerciseNames = Array.from(new Set(currentStrength.map((row) => row.exercise_name))).filter(Boolean);
      if (exerciseNames.length > 0) {
        const { data: exerciseRows, error: exerciseError } = await supabase
          .from("exercise_catalog")
          .select("name, muscle_groups")
          .in("name", exerciseNames);

        if (exerciseError) throw new Error(exerciseError.message);

        const groupsByName = new Map(
          ((exerciseRows || []) as Array<{ name: string; muscle_groups: string[] | null }>).map((row) => [
            row.name,
            row.muscle_groups || [],
          ])
        );

        let pushVolume = 0;
        let pullVolume = 0;
        let totalVolume = 0;
        for (const set of currentStrength) {
          const volume = safeNumber(set.weight) * safeNumber(set.reps);
          if (volume <= 0) continue;
          totalVolume += volume;
          const groups = (groupsByName.get(set.exercise_name) || []).map((group) => group.toLowerCase());
          if (groups.some((group) => /chest|tricep|shoulder|push/.test(group))) {
            pushVolume += volume;
          }
          if (groups.some((group) => /back|bicep|lat|trap|pull/.test(group))) {
            pullVolume += volume;
          }
        }

        if (totalVolume > 0) {
          const pushPct = (pushVolume / totalVolume) * 100;
          const pullPct = (pullVolume / totalVolume) * 100;
          if (pushPct < 15 || pullPct < 15) {
            withInsight(insights, {
              severity: "warning",
              title: "Muscle Imbalance Detected",
              body: `Your training is ${Math.round(pushPct)}% Push vs ${Math.round(
                pullPct
              )}% Pull. Balance push and pull movements to reduce injury risk.`,
              score: Math.abs(pushPct - pullPct),
            });
          }
        }
      }

      // Detraining gap
      const latestCompleted = currentIncluded[currentIncluded.length - 1];
      if (latestCompleted) {
        const daysSince = daysBetweenInclusive(latestCompleted.performed_on, currentWindow.endDate) - 1;
        if (daysSince >= 5) {
          withInsight(insights, {
            severity: "warning",
            title: "Training Gap Detected",
            body: "No sessions in the last 5 days. Consistency drives long-term progress.",
            score: daysSince,
          });
        }
      }

      // Weight progress (30-day delta)
      const { data: weightRows, error: weightError } = await supabase
        .from("body_measurements")
        .select("date, weight")
        .eq("user_id", userId)
        .gte("date", subtractDays(currentWindow.endDate, 30))
        .lte("date", currentWindow.endDate)
        .not("weight", "is", null)
        .order("date", { ascending: true });
      if (weightError) throw new Error(weightError.message);
      if ((weightRows || []).length >= 2) {
        const first = safeNumber(weightRows?.[0]?.weight);
        const last = safeNumber(weightRows?.[weightRows.length - 1]?.weight);
        const delta = first - last;
        if (delta >= 2) {
          withInsight(insights, {
            severity: "positive",
            title: "Weight Goal Progress",
            body: `You've dropped ${roundOne(delta)} in the last 30 days. Strong progress.`,
            score: delta,
          });
        }
      }

      // Pace improving
      const currentPaces = currentCardioRows
        .map((row) => {
          const distance = safeNumber(row.distance);
          const duration = safeNumber(row.duration_minutes);
          if (distance <= 0 || duration <= 0) return null;
          return duration / distance;
        })
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const priorPaces = priorCardioRows
        .map((row) => {
          const distance = safeNumber(row.distance);
          const duration = safeNumber(row.duration_minutes);
          if (distance <= 0 || duration <= 0) return null;
          return duration / distance;
        })
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      if (currentPaces.length > 0 && priorPaces.length > 0) {
        const currentPace = average(currentPaces);
        const priorPace = average(priorPaces);
        if (priorPace > 0) {
          const improvementPct = ((priorPace - currentPace) / priorPace) * 100;
          if (improvementPct > 5) {
            withInsight(insights, {
              severity: "positive",
              title: "Pace Improving",
              body: `Average pace improved ${Math.round(improvementPct)}% this period. Your aerobic base is building.`,
              score: improvementPct,
            });
          }
        }
      }

      // VO2 improving
      const currentVo2Rows = currentCardioRows
        .map((row) => safeNumber(row.vo2max_estimate))
        .filter((value) => value > 0);
      const priorVo2Rows = priorCardioRows
        .map((row) => safeNumber(row.vo2max_estimate))
        .filter((value) => value > 0);
      if (currentVo2Rows.length > 0 && priorVo2Rows.length > 0) {
        const currentVo2 = average(currentVo2Rows);
        const priorVo2 = average(priorVo2Rows);
        if (currentVo2 > priorVo2) {
          withInsight(insights, {
            severity: "positive",
            title: "Cardio Fitness Improving",
            body: "Your estimated VO2 max is trending up — a strong sign of aerobic adaptation.",
            score: currentVo2 - priorVo2,
          });
        }
      }

      return sortInsights(insights);
    },
  });
}

export async function getBodyCompositionSeries(
  rangeInput: ProgressRange,
  offsetPeriods = 0
): Promise<BodyCompositionSeries> {
  return runTrackedAction({
    eventName: "progress.overview.body_composition.read",
    payload: { range: rangeInput, offset_periods: offsetPeriods },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const userId = await getAuthUserId();
      const window = getPeriodBounds(range, offsetPeriods);
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("body_measurements")
        .select(
          "date, weight, body_fat_percent, waist, hips, chest, neck, bicep_left, bicep_right, thigh_left, thigh_right, calf, arms_cm, thighs_cm, calves_cm"
        )
        .eq("user_id", userId)
        .gte("date", window.startDate)
        .lte("date", window.endDate)
        .order("date", { ascending: true });

      if (error) throw new Error(error.message);

      return ((data || []) as BodyMeasurementRow[]).map((row) => ({
        date: row.date,
        weight: row.weight,
        body_fat_pct: row.body_fat_percent,
        waist: row.waist,
        hips: row.hips,
        chest: row.chest,
        neck: row.neck,
        bicep_left: row.bicep_left ?? row.arms_cm,
        bicep_right: row.bicep_right ?? row.arms_cm,
        thigh_left: row.thigh_left ?? row.thighs_cm,
        thigh_right: row.thigh_right ?? row.thighs_cm,
        calf: row.calf ?? row.calves_cm,
      }));
    },
  });
}

export async function getStrengthProgressSeries(
  rangeInput: ProgressRange,
  offsetPeriods = 0
): Promise<StrengthProgressData> {
  return runTrackedAction({
    eventName: "progress.overview.strength.read",
    payload: { range: rangeInput, offset_periods: offsetPeriods },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const userId = await getAuthUserId();
      const window = getPeriodBounds(range, offsetPeriods);
      const topWindowStart = subtractDays(window.endDate, 89);
      const supabase = await createClient();

      const [{ data: topSessions, error: topSessionsError }, { data: rangeSessions, error: rangeSessionsError }] =
        await Promise.all([
          supabase
            .from("training_sessions")
            .select("id, performed_on")
            .eq("user_id", userId)
            .gte("performed_on", topWindowStart)
            .lte("performed_on", window.endDate),
          supabase
            .from("training_sessions")
            .select("id, performed_on")
            .eq("user_id", userId)
            .gte("performed_on", window.startDate)
            .lte("performed_on", window.endDate),
        ]);

      if (topSessionsError) throw new Error(topSessionsError.message);
      if (rangeSessionsError) throw new Error(rangeSessionsError.message);

      const topSessionIds = (topSessions || []).map((row) => row.id);
      const rangeSessionIds = (rangeSessions || []).map((row) => row.id);
      const rangeSessionDateById = new Map((rangeSessions || []).map((row) => [row.id, row.performed_on] as const));

      if (topSessionIds.length === 0 || rangeSessionIds.length === 0) {
        return {
          top_exercises: [],
          trend_series: [],
          recent_prs: [],
          focus_distribution: [],
          muscle_volume: [],
        };
      }

      const [{ data: topStrengthRows, error: topStrengthError }, { data: rangeStrengthRows, error: rangeStrengthError }] =
        await Promise.all([
          supabase
            .from("strength_sets")
            .select("workout_id, exercise_name")
            .in("workout_id", topSessionIds),
          supabase
            .from("strength_sets")
            .select("workout_id, exercise_name, weight, reps, calculated_1rm, created_at")
            .in("workout_id", rangeSessionIds),
        ]);

      if (topStrengthError) throw new Error(topStrengthError.message);
      if (rangeStrengthError) throw new Error(rangeStrengthError.message);

      const countByExercise = new Map<string, number>();
      for (const row of (topStrengthRows || []) as Array<
        Pick<Database["public"]["Tables"]["strength_sets"]["Row"], "exercise_name">
      >) {
        const key = row.exercise_name;
        countByExercise.set(key, (countByExercise.get(key) || 0) + 1);
      }

      const topExercises = [...countByExercise.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([exercise]) => exercise);

      if (topExercises.length === 0) {
        return {
          top_exercises: [],
          trend_series: [],
          recent_prs: [],
          focus_distribution: [],
          muscle_volume: [],
        };
      }

      const trendByDate = new Map<string, Record<string, number>>();

      for (const row of (rangeStrengthRows || []) as Array<
        Pick<
          Database["public"]["Tables"]["strength_sets"]["Row"],
          "workout_id" | "exercise_name" | "weight" | "reps" | "calculated_1rm" | "created_at"
        >
      >) {
        if (!topExercises.includes(row.exercise_name)) continue;
        const date = rangeSessionDateById.get(row.workout_id) || toIsoDay(row.created_at || window.endDate);
        const oneRm = safeNumber(row.calculated_1rm) || estimateOneRepMax(safeNumber(row.weight), safeNumber(row.reps));
        const existingByExercise = trendByDate.get(date) || {};
        existingByExercise[row.exercise_name] = Math.max(existingByExercise[row.exercise_name] || 0, oneRm);
        trendByDate.set(date, existingByExercise);
      }

      const trendSeries: StrengthTrendPoint[] = [...trendByDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, values]) => {
          const row: StrengthTrendPoint = { date };
          for (const exercise of topExercises) {
            const value = values[exercise];
            row[exercise] = value ? roundOne(value) : null;
          }
          return row;
        });

      // Recent PRs
      const { data: priorSessions, error: priorSessionsError } = await supabase
        .from("training_sessions")
        .select("id")
        .eq("user_id", userId)
        .lt("performed_on", window.startDate);
      if (priorSessionsError) throw new Error(priorSessionsError.message);

      const priorSessionIds = (priorSessions || []).map((row) => row.id);
      const { data: priorStrengthRows, error: priorStrengthError } = priorSessionIds.length
        ? await supabase
            .from("strength_sets")
            .select("exercise_name, weight, reps, calculated_1rm")
            .in("workout_id", priorSessionIds)
            .in("exercise_name", topExercises)
        : { data: [], error: null };

      if (priorStrengthError) throw new Error(priorStrengthError.message);

      const priorBest = new Map<string, number>();
      for (const row of (priorStrengthRows || []) as Array<
        Pick<Database["public"]["Tables"]["strength_sets"]["Row"], "exercise_name" | "weight" | "reps" | "calculated_1rm">
      >) {
        const estimate = safeNumber(row.calculated_1rm) || estimateOneRepMax(safeNumber(row.weight), safeNumber(row.reps));
        const existing = priorBest.get(row.exercise_name) || 0;
        if (estimate > existing) priorBest.set(row.exercise_name, estimate);
      }

      const currentBest = new Map<string, { value: number; date: string }>();
      for (const row of (rangeStrengthRows || []) as Array<
        Pick<
          Database["public"]["Tables"]["strength_sets"]["Row"],
          "exercise_name" | "weight" | "reps" | "calculated_1rm" | "workout_id" | "created_at"
        >
      >) {
        if (!topExercises.includes(row.exercise_name)) continue;
        const estimate = safeNumber(row.calculated_1rm) || estimateOneRepMax(safeNumber(row.weight), safeNumber(row.reps));
        const date = rangeSessionDateById.get(row.workout_id) || toIsoDay(row.created_at || window.endDate);
        const existing = currentBest.get(row.exercise_name);
        if (!existing || estimate > existing.value) {
          currentBest.set(row.exercise_name, { value: estimate, date });
        }
      }

      const recentPrs: RecentPR[] = [];
      for (const exercise of topExercises) {
        const current = currentBest.get(exercise);
        const previous = priorBest.get(exercise) || 0;
        if (!current || current.value <= previous || previous <= 0) continue;
        recentPrs.push({
          exercise,
          estimated_1rm_kg: roundOne(current.value),
          achieved_on: current.date,
          delta_kg: roundOne(current.value - previous),
        });
      }

      recentPrs.sort((a, b) => b.achieved_on.localeCompare(a.achieved_on));

      // Muscle volume
      const rangeRows = (rangeStrengthRows || []) as Array<
        Pick<Database["public"]["Tables"]["strength_sets"]["Row"], "exercise_name" | "weight" | "reps">
      >;
      const exerciseNames = Array.from(
        new Set(rangeRows.map((row) => row.exercise_name).filter(Boolean))
      );

      const { data: exerciseRows, error: exerciseError } = exerciseNames.length
        ? await supabase
            .from("exercise_catalog")
            .select("name, muscle_groups")
            .in("name", exerciseNames)
        : { data: [], error: null };

      if (exerciseError) throw new Error(exerciseError.message);

      const exerciseMetaByName = new Map(
        (
          (exerciseRows || []) as Array<{
            name: string;
            muscle_groups: string[] | null;
          }>
        ).map((row) => [
          row.name,
          {
            muscle_groups: row.muscle_groups || [],
          },
        ])
      );

      const volumeByGroup = new Map<string, number>();
      const focusScoreByGroup = new Map<"push" | "pull" | "legs" | "core", number>([
        ["push", 0],
        ["pull", 0],
        ["legs", 0],
        ["core", 0],
      ]);
      let totalVolume = 0;
      let totalFocusScore = 0;
      for (const row of rangeRows) {
        const volume = safeNumber(row.weight) * safeNumber(row.reps);
        if (volume <= 0 && safeNumber(row.reps) <= 0) continue;
        const exerciseMeta = exerciseMetaByName.get(row.exercise_name);
        const groups = (exerciseMeta?.muscle_groups || []).map((group) => group.toLowerCase());
        const distinctGroups = groups.length > 0 ? [...new Set(groups)] : ["other"];
        const sharedVolume = volume > 0 ? volume / distinctGroups.length : 0;
        for (const group of distinctGroups) {
          volumeByGroup.set(group, (volumeByGroup.get(group) || 0) + sharedVolume);
        }
        totalVolume += Math.max(volume, 0);

        const focus = extractMuscleFocusTag({ muscleGroups: exerciseMeta?.muscle_groups ?? [] });
        if (focus) {
          const focusScore = volume > 0 ? volume : Math.max(safeNumber(row.reps), 1);
          focusScoreByGroup.set(focus, (focusScoreByGroup.get(focus) || 0) + focusScore);
          totalFocusScore += focusScore;
        }
      }

      const focusDistribution = (["push", "pull", "legs", "core"] as const).map((focus) => {
        const score = focusScoreByGroup.get(focus) || 0;
        return {
          focus,
          score: roundOne(score),
          pct: totalFocusScore > 0 ? Math.round((score / totalFocusScore) * 100) : 0,
        };
      });

      const muscleVolume = [...volumeByGroup.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([muscle_group, volume]) => ({
          muscle_group,
          volume_kg: roundOne(volume),
          pct: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0,
        }));

      return {
        top_exercises: topExercises,
        trend_series: trendSeries,
        recent_prs: recentPrs.slice(0, 5),
        focus_distribution: focusDistribution,
        muscle_volume: muscleVolume,
      };
    },
  });
}

export async function getCardioProgressSeries(
  rangeInput: ProgressRange,
  trainingTypeInput: ProgressTrainingType,
  offsetPeriods = 0
): Promise<CardioProgressSeries> {
  return runTrackedAction({
    eventName: "progress.overview.cardio.read",
    payload: { range: rangeInput, training_type: trainingTypeInput, offset_periods: offsetPeriods },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const trainingType = progressTypeSchema.parse(trainingTypeInput);
      const userId = await getAuthUserId();
      const window = getPeriodBounds(range, offsetPeriods);

      const sessionData = await fetchExecutionWindowData(userId, window.startDate, window.endDate, trainingType);
      const includedIds = sessionData.includedSessionIds;
      const cardioRows = [...sessionData.cardioRows].sort((a, b) => a.date.localeCompare(b.date));

      const scopedRows = cardioRows.filter((row) => {
        if (trainingType === "all") return true;
        if (!row.execution_id) return false;
        return includedIds.has(row.execution_id);
      });

      const byDate = new Map<
        string,
        {
          distanceTotal: number;
          durationTotal: number;
          hrDurationWeightedSum: number;
          hrDurationWeight: number;
          hrFallbackSum: number;
          hrFallbackCount: number;
          sessionCount: number;
        }
      >();

      for (const row of scopedRows) {
        const date = toIsoDay(row.date);
        const distance = safeNumber(row.distance);
        const duration = safeNumber(row.duration_minutes);
        const hr = safeNumber(row.average_heart_rate);
        const entry = byDate.get(date) || {
          distanceTotal: 0,
          durationTotal: 0,
          hrDurationWeightedSum: 0,
          hrDurationWeight: 0,
          hrFallbackSum: 0,
          hrFallbackCount: 0,
          sessionCount: 0,
        };

        if (distance > 0) entry.distanceTotal += distance;
        if (duration > 0) entry.durationTotal += duration;
        if (hr > 0) {
          if (duration > 0) {
            entry.hrDurationWeightedSum += hr * duration;
            entry.hrDurationWeight += duration;
          } else {
            entry.hrFallbackSum += hr;
            entry.hrFallbackCount += 1;
          }
        }
        entry.sessionCount += 1;
        byDate.set(date, entry);
      }

      const dateWindow =
        byDate.size > 0
          ? Array.from(
              { length: daysBetweenInclusive(window.startDate, window.endDate) },
              (_, offset) => addDays(window.startDate, offset)
            )
          : [];

      const series: CardioProgressPoint[] = dateWindow.map((date) => {
        const value = byDate.get(date);
        if (!value) {
          return {
            date,
            distance: null,
            pace_min_per_km: null,
            avg_hr_bpm: null,
          };
        }
        return {
          date,
          distance: value.distanceTotal > 0 ? roundOne(value.distanceTotal) : null,
          pace_min_per_km:
            value.distanceTotal > 0 && value.durationTotal > 0 ? roundTwo(value.durationTotal / value.distanceTotal) : null,
          avg_hr_bpm:
            value.hrDurationWeight > 0
              ? roundOne(value.hrDurationWeightedSum / value.hrDurationWeight)
              : value.hrFallbackCount > 0
                ? roundOne(value.hrFallbackSum / value.hrFallbackCount)
                : null,
        };
      });

      const activityCounts = new Map<string, number>();
      for (const row of scopedRows) {
        const key = row.activity_type || "Other";
        activityCounts.set(key, (activityCounts.get(key) || 0) + 1);
      }
      const totalActivitySessions = scopedRows.length;
      const activityBreakdown = [...activityCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, session_count]) => ({
          type,
          session_count,
          pct: totalActivitySessions > 0 ? Math.round((session_count / totalActivitySessions) * 100) : 0,
        }));

      const birthDate = await getProfileBirthDate(userId);
      const maxHr = getMaxHrFromBirthDate(birthDate);
      const hrRows = scopedRows
        .map((row) => safeNumber(row.average_heart_rate))
        .filter((value) => value > 0);

      let hrZonesSummary: CardioProgressSeries["hr_zones_summary"] = null;
      if (hrRows.length > 0) {
        let zone1 = 0;
        let zone2 = 0;
        let zone3 = 0;
        let zone4 = 0;
        let zone5 = 0;

        for (const hr of hrRows) {
          const ratio = hr / maxHr;
          if (ratio < 0.5) zone1 += 1;
          else if (ratio < 0.6) zone2 += 1;
          else if (ratio < 0.7) zone3 += 1;
          else if (ratio < 0.85) zone4 += 1;
          else zone5 += 1;
        }

        const total = hrRows.length;
        hrZonesSummary = {
          zone1_pct: Math.round((zone1 / total) * 100),
          zone2_pct: Math.round((zone2 / total) * 100),
          zone3_pct: Math.round((zone3 / total) * 100),
          zone4_pct: Math.round((zone4 / total) * 100),
          zone5_pct: Math.round((zone5 / total) * 100),
        };
      }

      return {
        series,
        hr_zones_summary: hrZonesSummary,
        activity_breakdown: activityBreakdown,
      };
    },
  });
}

async function getDailyBiofeedbackRows(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; energy_level: number | null }>> {
  const supabase = await createClient();
  const supabaseAny = supabase as any;
  const result = await supabaseAny
    .from("daily_biofeedback")
    .select("date, energy_level")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (result.error && !isMissingSchemaDependencyError(result.error)) {
    throw new Error(result.error.message);
  }

  return (result.data || []) as Array<{ date: string; energy_level: number | null }>;
}

function computeRecoveryScore(
  hrvMs: number | null,
  sleepHours: number | null,
  energyLevel: number | null
) {
  const hrvComponent = hrvMs !== null ? clamp((hrvMs / 80) * 100, 0, 100) * 0.45 : 0;
  const sleepComponent = sleepHours !== null ? clamp((sleepHours / 8) * 100, 0, 100) * 0.4 : 0;
  const energyComponent = energyLevel !== null ? clamp((energyLevel / 5) * 100, 0, 100) * 0.15 : 0;
  const totalWeight =
    (hrvMs !== null ? 0.45 : 0) + (sleepHours !== null ? 0.4 : 0) + (energyLevel !== null ? 0.15 : 0);

  if (totalWeight === 0) return null;
  return Math.round((hrvComponent + sleepComponent + energyComponent) / totalWeight);
}

function buildGoalHabitCompletionMap(
  historyRows: Array<{ goal_id: string; snapshot_at: string }>
) {
  const completionMap = new Map<string, Set<string>>();
  for (const row of historyRows) {
    const day = toIsoDay(row.snapshot_at);
    const set = completionMap.get(row.goal_id) ?? new Set<string>();
    set.add(day);
    completionMap.set(row.goal_id, set);
  }
  return completionMap;
}

export async function getComplianceRecovery(
  rangeInput: ProgressRange,
  offsetPeriods = 0
): Promise<ComplianceRecoveryData> {
  return runTrackedAction({
    eventName: "progress.overview.compliance.read",
    payload: { range: rangeInput, offset_periods: offsetPeriods },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const userId = await getAuthUserId();
      const window = getPeriodBounds(range, offsetPeriods);
      const supabase = await createClient();
      const supabaseAny = supabase as any;

      const [goalsRes, historyRes, sleepRes, vitalsRes, dailyActivityRes, biofeedbackRows] =
        await Promise.all([
          supabase
          .from("fitness_goals")
          .select("id, goal_type, custom_description, notes, status, is_personal_goal")
          .eq("user_id", userId)
          .eq("is_personal_goal", true),
          supabase
          .from("goal_progress_history")
          .select("goal_id, snapshot_at")
          .eq("user_id", userId)
          .gte("snapshot_at", `${window.startDate}T00:00:00.000Z`)
          .lte("snapshot_at", `${window.endDate}T23:59:59.999Z`),
          supabaseAny
          .from("sleep_log")
          .select("date, total_duration_minutes, sleep_score, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes")
          .eq("user_id", userId)
          .gte("date", subtractDays(window.endDate, 13))
          .lte("date", window.endDate),
          supabaseAny
          .from("vitals_log")
          .select("recorded_at, hrv_ms, resting_heart_rate")
          .eq("user_id", userId)
          .gte("recorded_at", `${subtractDays(window.endDate, 13)}T00:00:00.000Z`)
          .lte("recorded_at", `${window.endDate}T23:59:59.999Z`),
          supabaseAny
          .from("daily_activity")
          .select("date, sleep_hours")
          .eq("user_id", userId)
          .gte("date", subtractDays(window.endDate, 13))
          .lte("date", window.endDate),
          getDailyBiofeedbackRows(userId, subtractDays(window.endDate, 13), window.endDate),
        ]);

      if (goalsRes.error) throw new Error(goalsRes.error.message);
      if (historyRes.error) throw new Error(historyRes.error.message);
      if (sleepRes.error && !isMissingSchemaDependencyError(sleepRes.error)) {
        throw new Error(sleepRes.error.message);
      }
      if (vitalsRes.error && !isMissingSchemaDependencyError(vitalsRes.error)) {
        throw new Error(vitalsRes.error.message);
      }
      if (dailyActivityRes.error && !isMissingSchemaDependencyError(dailyActivityRes.error)) {
        throw new Error(dailyActivityRes.error.message);
      }
      const linkedClientIds = await getLinkedClientIdsForUser({ supabase, userId });
      const uniqueExecutionRows = await fetchExecutionRowsForUserScope<{
        id: string;
        performed_on: string;
      }>({
        supabaseAny,
        userId,
        linkedClientIds,
        startDate: subtractDays(window.endDate, 120),
        endDate: window.endDate,
        select: "id, performed_on",
      });
      const completedSessionDays = new Set(uniqueExecutionRows.map((row) => row.performed_on));

      // Day streak ending today.
      let dayStreak = 0;
      let cursor = window.endDate;
      while (completedSessionDays.has(cursor)) {
        dayStreak += 1;
        cursor = subtractDays(cursor, 1);
      }

      const goals = (goalsRes.data || []) as Array<
        Pick<
          Database["public"]["Tables"]["fitness_goals"]["Row"],
          "id" | "goal_type" | "custom_description" | "notes" | "status" | "is_personal_goal"
        >
      >;

      const activeGoals = goals.filter((goal) => (goal.status || "").toLowerCase() === "active");
      const completionMap = buildGoalHabitCompletionMap(
        (historyRes.data || []) as Array<{ goal_id: string; snapshot_at: string }>
      );

      const completedGoals = activeGoals.filter((goal) => (completionMap.get(goal.id)?.size || 0) > 0).length;
      const taskTotal = activeGoals.length;
      const taskPct = taskTotal > 0 ? Math.round((completedGoals / taskTotal) * 100) : 0;

      const sleepRows = (sleepRes.data || []) as Array<{
        date: string;
        total_duration_minutes: number | null;
        sleep_score: number | null;
        deep_sleep_minutes: number | null;
        rem_sleep_minutes: number | null;
        light_sleep_minutes: number | null;
        awake_minutes: number | null;
      }>;

      const vitalsRows = (vitalsRes.data || []) as Array<{
        recorded_at: string;
        hrv_ms: number | null;
        resting_heart_rate: number | null;
      }>;

      const dailyActivityRows = (dailyActivityRes.data || []) as Array<{
        date: string;
        sleep_hours: number | null;
      }>;

      const sleepByDate = new Map(
        sleepRows.map((row) => [row.date, safeNumber(row.total_duration_minutes) / 60] as const)
      );
      const hrvByDate = new Map<string, number>();
      const rhrByDate = new Map<string, number>();
      for (const row of vitalsRows) {
        const date = toIsoDay(row.recorded_at);
        const hrv = safeNumber(row.hrv_ms);
        const rhr = safeNumber(row.resting_heart_rate);
        if (hrv > 0) {
          const current = hrvByDate.get(date);
          if (!current || hrv > current) hrvByDate.set(date, hrv);
        }
        if (rhr > 0) {
          const current = rhrByDate.get(date);
          if (!current || rhr < current) rhrByDate.set(date, rhr);
        }
      }

      const activitySleepByDate = new Map(
        dailyActivityRows
          .filter((row) => safeNumber(row.sleep_hours) > 0)
          .map((row) => [row.date, safeNumber(row.sleep_hours)] as const)
      );

      const energyByDate = new Map(
        biofeedbackRows
          .filter((row) => safeNumber(row.energy_level) > 0)
          .map((row) => [row.date, safeNumber(row.energy_level)] as const)
      );

      const readinessSeries: RecoveryReadinessPoint[] = [];
      const rhrSeries: Array<{ date: string; rhr_bpm: number }> = [];
      const recoveryValues: number[] = [];

      for (let index = 13; index >= 0; index -= 1) {
        const date = subtractDays(window.endDate, index);
        const hrv = hrvByDate.has(date) ? hrvByDate.get(date) ?? null : null;
        const sleepHours = sleepByDate.get(date) ?? activitySleepByDate.get(date) ?? null;
        const energy = energyByDate.get(date) ?? null;
        const score = computeRecoveryScore(hrv, sleepHours, energy);
        if (score !== null) recoveryValues.push(score);
        readinessSeries.push({
          date,
          recovery_score: score,
          hrv_ms: hrv,
        });

        const rhr = rhrByDate.get(date);
        if (rhr && rhr > 0) {
          rhrSeries.push({ date, rhr_bpm: roundOne(rhr) });
        }
      }

      const latestRecovery = [...readinessSeries].reverse().find((row) => row.recovery_score !== null)?.recovery_score ?? null;
      const latestSleep = [...sleepRows].sort((a, b) => b.date.localeCompare(a.date))[0];
      const latestSleepHours = latestSleep ? roundOne(safeNumber(latestSleep.total_duration_minutes) / 60) : null;
      const latestHrv = [...readinessSeries].reverse().find((row) => row.hrv_ms !== null)?.hrv_ms ?? null;
      const sleepScoreValues = sleepRows
        .map((row) => safeNumber(row.sleep_score))
        .filter((value) => value > 0);
      const sleepScoreAvg = sleepScoreValues.length > 0 ? Math.round(average(sleepScoreValues)) : null;

      const sleepStagesLast = latestSleep
        ? {
            deep_minutes: latestSleep.deep_sleep_minutes,
            rem_minutes: latestSleep.rem_sleep_minutes,
            light_minutes: latestSleep.light_sleep_minutes,
            awake_minutes: latestSleep.awake_minutes,
          }
        : null;

      // Last 8 complete weeks
      const currentWeekStart = toWeekStartIso(window.endDate);
      const lastCompleteWeekEnd = subtractDays(currentWeekStart, 1);
      const firstWeekStart = subtractDays(currentWeekStart, 56);

      const workoutPerWeekMap = new Map<string, number>();
      const weeklySourceDates = uniqueExecutionRows.map((row) => row.performed_on);
      for (const performedOn of weeklySourceDates) {
        if (performedOn < firstWeekStart || performedOn > lastCompleteWeekEnd) continue;
        const weekStart = toWeekStartIso(performedOn);
        workoutPerWeekMap.set(weekStart, (workoutPerWeekMap.get(weekStart) || 0) + 1);
      }

      const workoutsPerWeek: WeeklyWorkoutBar[] = [];
      for (let index = 0; index < 8; index += 1) {
        const weekStart = addDays(firstWeekStart, index * 7);
        workoutsPerWeek.push({
          week_start: weekStart,
          session_count: workoutPerWeekMap.get(weekStart) || 0,
        });
      }

      // Workout calendar (last 2 months)
      const calendarStart = toDateInput(
        new Date(Date.UTC(parseDateInput(window.endDate).getUTCFullYear(), parseDateInput(window.endDate).getUTCMonth() - 1, 1, 12, 0, 0))
      );
      const calendarEnd = window.endDate;
      const workoutCalendar: Array<{
        date: string;
        has_strength: boolean;
        has_cardio: boolean;
        session_count: number;
      }> = [];
      const calendarExecutions = uniqueExecutionRows.filter(
        (row) => row.performed_on >= calendarStart && row.performed_on <= calendarEnd
      );
      const executionIds = calendarExecutions.map((row) => row.id);
      const { data: executionExerciseData, error: executionExerciseError } = executionIds.length
        ? await supabaseAny
            .from("workout_execution_exercises")
            .select("execution_id, exercise_type")
            .in("execution_id", executionIds)
        : { data: [], error: null };
      if (executionExerciseError) throw new Error(executionExerciseError.message);

      const executionExerciseRows = (executionExerciseData || []) as Array<{
        execution_id: string;
        exercise_type: "strength" | "cardio";
      }>;
      const typeByExecution = new Map<string, { has_strength: boolean; has_cardio: boolean }>();
      for (const row of executionExerciseRows) {
        const current = typeByExecution.get(row.execution_id) || { has_strength: false, has_cardio: false };
        if (row.exercise_type === "strength") current.has_strength = true;
        if (row.exercise_type === "cardio") current.has_cardio = true;
        typeByExecution.set(row.execution_id, current);
      }

      const calendarMap = new Map<string, { has_strength: boolean; has_cardio: boolean; session_count: number }>();
      for (const execution of calendarExecutions) {
        const current = calendarMap.get(execution.performed_on) || {
          has_strength: false,
          has_cardio: false,
          session_count: 0,
        };
        current.session_count += 1;
        const typed = typeByExecution.get(execution.id);
        if (typed?.has_strength) current.has_strength = true;
        if (typed?.has_cardio) current.has_cardio = true;
        calendarMap.set(execution.performed_on, current);
      }

      workoutCalendar.push(
        ...[...calendarMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, value]) => ({ date, ...value }))
      );

      // Habits
      const habitGoals = activeGoals.filter((goal) => (goal.goal_type || "").toLowerCase() === "habit");
      const today = window.endDate;
      const habits = habitGoals.map((goal) => {
        const completedDates = completionMap.get(goal.id) || new Set<string>();
        const completedToday = completedDates.has(today);

        let streak = 0;
        let streakCursor = today;
        while (completedDates.has(streakCursor)) {
          streak += 1;
          streakCursor = subtractDays(streakCursor, 1);
        }

        let rangeCompleted = 0;
        for (let index = 0; index < window.days; index += 1) {
          const date = addDays(window.startDate, index);
          if (completedDates.has(date)) rangeCompleted += 1;
        }

        const completionPctRange = Math.round((rangeCompleted / Math.max(window.days, 1)) * 100);
        return {
          id: goal.id,
          name: goal.custom_description || goal.notes || "Habit",
          completed_today: completedToday,
          streak_days: streak,
          completion_pct_range: completionPctRange,
        };
      });

      return {
        day_streak: dayStreak,
        task_completion: {
          completed: completedGoals,
          total: taskTotal,
          pct: taskPct,
        },
        recovery_score: latestRecovery,
        last_sleep_hours: latestSleepHours,
        last_hrv_ms: latestHrv !== null ? roundOne(latestHrv) : null,
        workouts_per_week: workoutsPerWeek,
        readiness_series: readinessSeries,
        workout_calendar: workoutCalendar,
        rhr_series: rhrSeries,
        sleep_score_avg: sleepScoreAvg,
        sleep_stages_last: sleepStagesLast,
        habits,
      };
    },
  });
}

export async function getProgressOverviewBundle(
  rangeInput: ProgressRange,
  trainingTypeInput: ProgressTrainingType,
  compare = false
): Promise<ProgressOverviewBundle> {
  return runTrackedAction({
    eventName: "progress.overview.bundle.read",
    payload: {
      range: rangeInput,
      training_type: trainingTypeInput,
      compare,
    },
    action: async () => {
      const range = progressRangeSchema.parse(rangeInput);
      const trainingType = progressTypeSchema.parse(trainingTypeInput);

      const [
        summary,
        insights,
        bodyCurrent,
        strengthCurrent,
        cardioCurrent,
        complianceCurrent,
        trainingLoadCurrent,
        bodyCompare,
        strengthCompare,
        cardioCompare,
        complianceCompare,
        trainingLoadCompare,
      ] = await Promise.all([
        getProgressSummaryStats(range, trainingType),
        getProgressInsights(range, trainingType),
        getBodyCompositionSeries(range, 0),
        getStrengthProgressSeries(range, 0),
        getCardioProgressSeries(range, trainingType, 0),
        getComplianceRecovery(range, 0),
        getTrainingLoad(range, 0),
        compare ? getBodyCompositionSeries(range, 1) : Promise.resolve(null),
        compare ? getStrengthProgressSeries(range, 1) : Promise.resolve(null),
        compare ? getCardioProgressSeries(range, trainingType, 1) : Promise.resolve(null),
        compare ? getComplianceRecovery(range, 1) : Promise.resolve(null),
        compare ? getTrainingLoad(range, 1) : Promise.resolve(null),
      ]);

      return {
        summary,
        insights,
        body_composition: {
          current: bodyCurrent,
          compare: bodyCompare,
        },
        strength: {
          current: strengthCurrent,
          compare: strengthCompare,
        },
        cardio: {
          current: cardioCurrent,
          compare: cardioCompare,
        },
        compliance: {
          current: complianceCurrent,
          compare: complianceCompare,
        },
        training_load: {
          current: trainingLoadCurrent,
          compare: trainingLoadCompare,
        },
      };
    },
  });
}
