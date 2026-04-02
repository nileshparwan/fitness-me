"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import { toDateInput } from "@/lib/utils/date";

export type HealthSubject = { type: "me" } | { type: "client"; id: string };

export type DailyHealthLogInput = {
  date: string;
  sleep_hours?: number | null;
  sleep_score?: number | null;
  hrv_ms?: number | null;
  resting_heart_rate?: number | null;
  steps?: number | null;
  energy_level?: number | null;
};

export type HealthCheckInRow = {
  date: string;
  sleep_hours: number | null;
  sleep_score: number | null;
  hrv_ms: number | null;
  resting_heart_rate: number | null;
  steps: number | null;
  energy_level: number | null;
};

export type DailyActivityQuickLogRow = {
  date: string;
  water_intake_ml: number | null;
};

type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const subjectSchema: z.ZodType<HealthSubject> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("me") }),
  z.object({ type: z.literal("client"), id: z.string().uuid() }),
]);

const logDailyHealthSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
  sleep_hours: z.number().min(0).max(24).nullish(),
  sleep_score: z.number().min(1).max(5).nullish(),
  hrv_ms: z.number().min(0).nullish(),
  resting_heart_rate: z.number().min(0).max(260).nullish(),
  steps: z.number().int().min(0).nullish(),
  energy_level: z.number().int().min(1).max(5).nullish(),
});

const getSingleDateSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
});

const updateDailyActivitySchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
  water_intake_ml: z.number().int().min(0).max(20000).nullish(),
});

const rangeSchema = z.enum(["7d", "30d", "90d", "all"]);

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

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function resolveSubject(subject: HealthSubject, actorUserId: string): SubjectRef {
  if (subject.type === "me") {
    return {
      subject_user_id: actorUserId,
      subject_client_id: null,
    };
  }
  return {
    subject_user_id: null,
    subject_client_id: subject.id,
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
    return builder.eq("subject_user_id", subject.subject_user_id).is("subject_client_id", null) as T;
  }

  return builder.eq("subject_client_id", subject.subject_client_id).is("subject_user_id", null) as T;
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

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function createEmptyHealthRow(date: string): HealthCheckInRow {
  return {
    date,
    sleep_hours: null,
    sleep_score: null,
    hrv_ms: null,
    resting_heart_rate: null,
    steps: null,
    energy_level: null,
  };
}

function resolveRangeStartDate(range: z.infer<typeof rangeSchema>) {
  if (range === "all") return null;
  const today = toDateInput(new Date());
  if (range === "7d") return subtractDays(today, 6);
  if (range === "30d") return subtractDays(today, 29);
  return subtractDays(today, 89);
}

export async function logDailyHealthAction(
  subjectInput: HealthSubject,
  input: DailyHealthLogInput
): Promise<void> {
  const subject = subjectSchema.parse(subjectInput);
  const payload = logDailyHealthSchema.parse(input);

  const hasAnyField =
    payload.sleep_hours != null ||
    payload.sleep_score != null ||
    payload.hrv_ms != null ||
    payload.resting_heart_rate != null ||
    payload.steps != null ||
    payload.energy_level != null;

  if (!hasAnyField) {
    throw new Error("At least one health field is required");
  }

  return runTrackedAction({
    eventName: "daily_health.log",
    payload: { subject_type: subject.type, date: payload.date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);
      const commonRef = {
        subject_user_id: subjectRef.subject_user_id,
        subject_client_id: subjectRef.subject_client_id,
      };
      const upsertConflict =
        subject.type === "me" ? "subject_user_id,date" : "subject_client_id,date";

      const sleepTask =
        payload.sleep_hours != null || payload.sleep_score != null
          ? (async () => {
              const sleepResult = await supabaseAny.from("checkin_sleep").upsert(
                {
                  ...commonRef,
                  date: payload.date,
                  total_duration_minutes:
                    payload.sleep_hours != null ? Math.round(payload.sleep_hours * 60) : null,
                  sleep_score:
                    payload.sleep_score != null ? Math.round(payload.sleep_score * 20) : null,
                  source: "manual",
                },
                {
                  onConflict: upsertConflict,
                  ignoreDuplicates: false,
                }
              );
              if (sleepResult.error && !isMissingSchemaDependencyError(sleepResult.error)) {
                throw new Error(sleepResult.error.message);
              }
            })()
          : Promise.resolve();

      const vitalsTask =
        payload.hrv_ms != null || payload.resting_heart_rate != null
          ? (async () => {
              let existingVitalsQuery = supabaseAny
                .from("checkin_vitals")
                .select("id, recorded_at")
                .gte("recorded_at", `${payload.date}T00:00:00.000Z`)
                .lte("recorded_at", `${payload.date}T23:59:59.999Z`);
              existingVitalsQuery = applySubjectFilters(existingVitalsQuery, subjectRef);
              existingVitalsQuery = existingVitalsQuery
                .order("recorded_at", { ascending: false })
                .limit(1);

              const existingResult = await existingVitalsQuery;
              if (existingResult.error && !isMissingSchemaDependencyError(existingResult.error)) {
                throw new Error(existingResult.error.message);
              }
              if (existingResult.error) return;

              const existingRow = (existingResult.data || [])[0] as { id: string } | undefined;

              if (existingRow) {
                const vitalsUpdate: Record<string, unknown> = {
                  updated_at: new Date().toISOString(),
                };
                if (payload.hrv_ms !== undefined) vitalsUpdate.hrv_ms = payload.hrv_ms;
                if (payload.resting_heart_rate !== undefined)
                  vitalsUpdate.resting_heart_rate = payload.resting_heart_rate;

                const updateResult = await supabaseAny
                  .from("checkin_vitals")
                  .update(vitalsUpdate)
                  .eq("id", existingRow.id);
                if (updateResult.error && !isMissingSchemaDependencyError(updateResult.error)) {
                  throw new Error(updateResult.error.message);
                }
                return;
              }

              const insertResult = await supabaseAny.from("checkin_vitals").insert({
                ...commonRef,
                recorded_at: `${payload.date}T07:00:00.000Z`,
                hrv_ms: payload.hrv_ms ?? null,
                resting_heart_rate: payload.resting_heart_rate ?? null,
                source: "manual",
              });
              if (insertResult.error && !isMissingSchemaDependencyError(insertResult.error)) {
                throw new Error(insertResult.error.message);
              }
            })()
          : Promise.resolve();

      const dailyActivityTask =
        payload.steps != null || payload.energy_level != null || payload.sleep_hours != null
          ? (async () => {
              const dailyResult = await supabaseAny.from("checkins").upsert(
                {
                  ...commonRef,
                  date: payload.date,
                  steps: payload.steps ?? null,
                  energy_level: payload.energy_level ?? null,
                  sleep_hours: payload.sleep_hours ?? null,
                  source: "manual",
                },
                {
                  onConflict: upsertConflict,
                  ignoreDuplicates: false,
                }
              );
              if (dailyResult.error && !isMissingSchemaDependencyError(dailyResult.error)) {
                throw new Error(dailyResult.error.message);
              }
            })()
          : Promise.resolve();

      await Promise.all([sleepTask, vitalsTask, dailyActivityTask]);
    },
  });
}

export async function getHealthCheckIns(
  subjectInput: HealthSubject,
  rangeInput: "7d" | "30d" | "90d" | "all"
): Promise<HealthCheckInRow[]> {
  const subject = subjectSchema.parse(subjectInput);
  const range = rangeSchema.parse(rangeInput);

  return runTrackedAction({
    eventName: "daily_health.list",
    payload: { subject_type: subject.type, range },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);
      const startDate = resolveRangeStartDate(range);
      const today = toDateInput(new Date());

      let sleepQuery = supabaseAny
        .from("checkin_sleep")
        .select("date, total_duration_minutes, sleep_score")
        .order("date", { ascending: false });
      sleepQuery = applySubjectFilters(sleepQuery, subjectRef);
      if (startDate) {
        sleepQuery = sleepQuery.gte("date", startDate).lte("date", today);
      }

      let vitalsQuery = supabaseAny
        .from("checkin_vitals")
        .select("recorded_at, hrv_ms, resting_heart_rate")
        .order("recorded_at", { ascending: false });
      vitalsQuery = applySubjectFilters(vitalsQuery, subjectRef);
      if (startDate) {
        vitalsQuery = vitalsQuery
          .gte("recorded_at", `${startDate}T00:00:00.000Z`)
          .lte("recorded_at", `${today}T23:59:59.999Z`);
      }

      let dailyActivityQuery = supabaseAny
        .from("checkins")
        .select("date, steps, energy_level, sleep_hours")
        .order("date", { ascending: false });
      dailyActivityQuery = applySubjectFilters(dailyActivityQuery, subjectRef);
      if (startDate) {
        dailyActivityQuery = dailyActivityQuery.gte("date", startDate).lte("date", today);
      }

      const [sleepResult, vitalsResult, dailyActivityResult] = await Promise.all([
        sleepQuery,
        vitalsQuery,
        dailyActivityQuery,
      ]);

      if (sleepResult.error && !isMissingSchemaDependencyError(sleepResult.error)) {
        throw new Error(sleepResult.error.message);
      }
      if (vitalsResult.error && !isMissingSchemaDependencyError(vitalsResult.error)) {
        throw new Error(vitalsResult.error.message);
      }
      if (dailyActivityResult.error && !isMissingSchemaDependencyError(dailyActivityResult.error)) {
        throw new Error(dailyActivityResult.error.message);
      }

      const byDate = new Map<string, HealthCheckInRow>();

      const sleepRows = (sleepResult.data || []) as Array<{
        date: string;
        total_duration_minutes: number | null;
        sleep_score: number | null;
      }>;
      for (const row of sleepRows) {
        const existing = byDate.get(row.date) || createEmptyHealthRow(row.date);
        existing.sleep_hours =
          row.total_duration_minutes != null ? roundOne(row.total_duration_minutes / 60) : null;
        existing.sleep_score = row.sleep_score ?? null;
        byDate.set(row.date, existing);
      }

      const dailyRows = (dailyActivityResult.data || []) as Array<{
        date: string;
        steps: number | null;
        energy_level: number | null;
        sleep_hours: number | null;
      }>;
      for (const row of dailyRows) {
        const existing = byDate.get(row.date) || createEmptyHealthRow(row.date);
        existing.steps = row.steps ?? null;
        existing.energy_level = row.energy_level ?? null;
        if (existing.sleep_hours == null) {
          existing.sleep_hours = row.sleep_hours != null ? roundOne(row.sleep_hours) : null;
        }
        byDate.set(row.date, existing);
      }

      const latestVitalsByDate = new Map<
        string,
        { hrv_ms: number | null; resting_heart_rate: number | null }
      >();
      const vitalsRows = (vitalsResult.data || []) as Array<{
        recorded_at: string;
        hrv_ms: number | null;
        resting_heart_rate: number | null;
      }>;
      for (const row of vitalsRows) {
        const date = row.recorded_at.slice(0, 10);
        if (!latestVitalsByDate.has(date)) {
          latestVitalsByDate.set(date, {
            hrv_ms: row.hrv_ms ?? null,
            resting_heart_rate: row.resting_heart_rate ?? null,
          });
        }
      }
      for (const [date, row] of latestVitalsByDate.entries()) {
        const existing = byDate.get(date) || createEmptyHealthRow(date);
        existing.hrv_ms = row.hrv_ms;
        existing.resting_heart_rate = row.resting_heart_rate;
        byDate.set(date, existing);
      }

      return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export async function getHealthCheckInForDate(
  subjectInput: HealthSubject,
  dateInput: string
): Promise<HealthCheckInRow | null> {
  const subject = subjectSchema.parse(subjectInput);
  const { date } = getSingleDateSchema.parse({ date: dateInput });

  return runTrackedAction({
    eventName: "daily_health.detail",
    payload: { subject_type: subject.type, date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);

      let sleepQuery = supabaseAny
        .from("checkin_sleep")
        .select("date, total_duration_minutes, sleep_score")
        .eq("date", date);
      sleepQuery = applySubjectFilters(sleepQuery, subjectRef);
      sleepQuery = sleepQuery.limit(1);

      let dailyActivityQuery = supabaseAny
        .from("checkins")
        .select("date, steps, energy_level, sleep_hours")
        .eq("date", date);
      dailyActivityQuery = applySubjectFilters(dailyActivityQuery, subjectRef);
      dailyActivityQuery = dailyActivityQuery.limit(1);

      let vitalsQuery = supabaseAny
        .from("checkin_vitals")
        .select("recorded_at, hrv_ms, resting_heart_rate")
        .gte("recorded_at", `${date}T00:00:00.000Z`)
        .lte("recorded_at", `${date}T23:59:59.999Z`);
      vitalsQuery = applySubjectFilters(vitalsQuery, subjectRef);
      vitalsQuery = vitalsQuery.order("recorded_at", { ascending: false }).limit(1);

      const [sleepResult, dailyActivityResult, vitalsResult] = await Promise.all([
        sleepQuery,
        dailyActivityQuery,
        vitalsQuery,
      ]);

      if (sleepResult.error && !isMissingSchemaDependencyError(sleepResult.error)) {
        throw new Error(sleepResult.error.message);
      }
      if (dailyActivityResult.error && !isMissingSchemaDependencyError(dailyActivityResult.error)) {
        throw new Error(dailyActivityResult.error.message);
      }
      if (vitalsResult.error && !isMissingSchemaDependencyError(vitalsResult.error)) {
        throw new Error(vitalsResult.error.message);
      }

      const row = createEmptyHealthRow(date);
      let hasValue = false;

      const sleepRow = (sleepResult.data || [])[0] as
        | { total_duration_minutes: number | null; sleep_score: number | null }
        | undefined;
      if (sleepRow) {
        row.sleep_hours =
          sleepRow.total_duration_minutes != null
            ? roundOne(sleepRow.total_duration_minutes / 60)
            : null;
        row.sleep_score = sleepRow.sleep_score ?? null;
        hasValue = true;
      }

      const dailyRow = (dailyActivityResult.data || [])[0] as
        | { steps: number | null; energy_level: number | null; sleep_hours: number | null }
        | undefined;
      if (dailyRow) {
        row.steps = dailyRow.steps ?? null;
        row.energy_level = dailyRow.energy_level ?? null;
        if (row.sleep_hours == null) {
          row.sleep_hours = dailyRow.sleep_hours != null ? roundOne(dailyRow.sleep_hours) : null;
        }
        hasValue = true;
      }

      const vitalsRow = (vitalsResult.data || [])[0] as
        | { hrv_ms: number | null; resting_heart_rate: number | null }
        | undefined;
      if (vitalsRow) {
        row.hrv_ms = vitalsRow.hrv_ms ?? null;
        row.resting_heart_rate = vitalsRow.resting_heart_rate ?? null;
        hasValue = true;
      }

      return hasValue ? row : null;
    },
  });
}

export async function getDailyActivityForDateAction(
  subjectInput: HealthSubject,
  dateInput: string
): Promise<DailyActivityQuickLogRow | null> {
  const subject = subjectSchema.parse(subjectInput);
  const { date } = getSingleDateSchema.parse({ date: dateInput });

  return runTrackedAction({
    eventName: "checkins.detail",
    payload: { subject_type: subject.type, date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);

      let query = supabaseAny
        .from("checkins")
        .select("date, water_intake_ml")
        .eq("date", date);
      query = applySubjectFilters(query, subjectRef);
      query = query.limit(1);

      const { data, error } = await query.maybeSingle();
      if (error && !isMissingSchemaDependencyError(error)) {
        throw new Error(error.message);
      }
      if (!data || error) return null;

      return {
        date: data.date,
        water_intake_ml: data.water_intake_ml ?? null,
      };
    },
  });
}

export type UpdateDailyActivityInput = z.infer<typeof updateDailyActivitySchema>;

export async function updateDailyActivityAction(
  subjectInput: HealthSubject,
  input: UpdateDailyActivityInput
): Promise<void> {
  const subject = subjectSchema.parse(subjectInput);
  const payload = updateDailyActivitySchema.parse(input);

  return runTrackedAction({
    eventName: "checkins.upsert",
    payload: { subject_type: subject.type, date: payload.date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);
      const commonRef = {
        subject_user_id: subjectRef.subject_user_id,
        subject_client_id: subjectRef.subject_client_id,
      };
      const upsertConflict =
        subject.type === "me" ? "subject_user_id,date" : "subject_client_id,date";

      const result = await supabaseAny.from("checkins").upsert(
        {
          ...commonRef,
          date: payload.date,
          water_intake_ml: payload.water_intake_ml ?? null,
          source: "manual",
        },
        {
          onConflict: upsertConflict,
          ignoreDuplicates: false,
        }
      );

      if (result.error && !isMissingSchemaDependencyError(result.error)) {
        throw new Error(result.error.message);
      }
    },
  });
}
