"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BodyMeasurementTableRow = Database["public"]["Tables"]["body_measurements"]["Row"];

export type MeasurementSubject = { type: "me" } | { type: "client"; id: string };

export type LogBodyMeasurementInput = {
  date: string;
  weight?: number | null;
  body_fat_percent?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  chest_cm?: number | null;
  neck_cm?: number | null;
  bicep_left_cm?: number | null;
  bicep_right_cm?: number | null;
  thigh_left_cm?: number | null;
  thigh_right_cm?: number | null;
  calf_cm?: number | null;
  notes?: string | null;
};

export type BodyMeasurementRow = {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percent: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  neck_cm: number | null;
  bicep_left_cm: number | null;
  bicep_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
};

type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const subjectSchema: z.ZodType<MeasurementSubject> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("me") }),
  z.object({ type: z.literal("client"), id: z.string().uuid() }),
]);

const positiveNumberSchema = z.number().min(0);

const logBodyMeasurementSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
  weight: positiveNumberSchema.nullish(),
  body_fat_percent: positiveNumberSchema.max(100).nullish(),
  waist_cm: positiveNumberSchema.nullish(),
  hips_cm: positiveNumberSchema.nullish(),
  chest_cm: positiveNumberSchema.nullish(),
  neck_cm: positiveNumberSchema.nullish(),
  bicep_left_cm: positiveNumberSchema.nullish(),
  bicep_right_cm: positiveNumberSchema.nullish(),
  thigh_left_cm: positiveNumberSchema.nullish(),
  thigh_right_cm: positiveNumberSchema.nullish(),
  calf_cm: positiveNumberSchema.nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

const getSingleDateSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
});

const rangeSchema = z.enum(["30d", "90d", "180d", "1y", "all"]);

const MEASUREMENT_FIELDS: Array<keyof LogBodyMeasurementInput> = [
  "weight",
  "body_fat_percent",
  "waist_cm",
  "hips_cm",
  "chest_cm",
  "neck_cm",
  "bicep_left_cm",
  "bicep_right_cm",
  "thigh_left_cm",
  "thigh_right_cm",
  "calf_cm",
];

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

function resolveSubject(subject: MeasurementSubject, actorUserId: string): SubjectRef {
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

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function hasAtLeastOneMeasurement(input: z.infer<typeof logBodyMeasurementSchema>) {
  return MEASUREMENT_FIELDS.some((field) => {
    const value = input[field];
    return typeof value === "number" && Number.isFinite(value);
  });
}

function normalizeInputForWrite(input: z.infer<typeof logBodyMeasurementSchema>) {
  return {
    date: input.date,
    weight: input.weight ?? null,
    body_fat_percent: input.body_fat_percent ?? null,
    waist_cm: input.waist_cm ?? null,
    hips_cm: input.hips_cm ?? null,
    chest_cm: input.chest_cm ?? null,
    neck_cm: input.neck_cm ?? null,
    bicep_left_cm: input.bicep_left_cm ?? null,
    bicep_right_cm: input.bicep_right_cm ?? null,
    thigh_left_cm: input.thigh_left_cm ?? null,
    thigh_right_cm: input.thigh_right_cm ?? null,
    calf_cm: input.calf_cm ?? null,
    notes: input.notes?.trim() || null,
  };
}

function rangeToStartDate(range: z.infer<typeof rangeSchema>) {
  if (range === "all") return null;
  const today = toDateInput(new Date());
  if (range === "30d") return subtractDays(today, 29);
  if (range === "90d") return subtractDays(today, 89);
  if (range === "180d") return subtractDays(today, 179);
  return subtractDays(today, 364);
}

function mapBodyMeasurementRow(row: BodyMeasurementTableRow): BodyMeasurementRow {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight,
    body_fat_percent: row.body_fat_percent,
    waist_cm: row.waist_cm,
    hips_cm: row.hips_cm,
    chest_cm: row.chest_cm,
    neck_cm: row.neck_cm,
    bicep_left_cm: row.bicep_left_cm,
    bicep_right_cm: row.bicep_right_cm,
    thigh_left_cm: row.thigh_left_cm,
    thigh_right_cm: row.thigh_right_cm,
    calf_cm: row.calf_cm,
    notes: row.notes,
  };
}

export async function logBodyMeasurementAction(
  subjectInput: MeasurementSubject,
  input: LogBodyMeasurementInput
): Promise<void> {
  const subject = subjectSchema.parse(subjectInput);
  const payload = logBodyMeasurementSchema.parse(input);
  if (!hasAtLeastOneMeasurement(payload)) {
    throw new Error("At least one measurement is required");
  }

  return runTrackedAction({
    eventName: "body_measurements.log",
    payload: { subject_type: subject.type },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);
      const normalized = normalizeInputForWrite(payload);

      const row = {
        ...subjectRef,
        user_id: subjectRef.subject_user_id,
        ...normalized,
      };

      const onConflict =
        subject.type === "me" ? "subject_user_id,date" : "subject_client_id,date";

      const result = await supabaseAny
        .from("body_measurements")
        .upsert(row, {
          onConflict,
          ignoreDuplicates: false,
        });

      if (result.error) throw new Error(result.error.message);
    },
  });
}

export async function getBodyMeasurements(
  subjectInput: MeasurementSubject,
  rangeInput: "30d" | "90d" | "180d" | "1y" | "all"
): Promise<BodyMeasurementRow[]> {
  const subject = subjectSchema.parse(subjectInput);
  const range = rangeSchema.parse(rangeInput);

  return runTrackedAction({
    eventName: "body_measurements.list",
    payload: { subject_type: subject.type, range },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);
      const startDate = rangeToStartDate(range);

      let query = supabaseAny
        .from("body_measurements")
        .select(
          "id, date, weight, body_fat_percent, waist_cm, hips_cm, chest_cm, neck_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_cm, notes"
        )
        .order("date", { ascending: false });

      query = applySubjectFilters(query, subjectRef);

      if (startDate) {
        query = query.gte("date", startDate);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return ((data || []) as BodyMeasurementTableRow[]).map(mapBodyMeasurementRow);
    },
  });
}

export async function getBodyMeasurementForDate(
  subjectInput: MeasurementSubject,
  dateInput: string
): Promise<BodyMeasurementRow | null> {
  const subject = subjectSchema.parse(subjectInput);
  const { date } = getSingleDateSchema.parse({ date: dateInput });

  return runTrackedAction({
    eventName: "body_measurements.detail",
    payload: { subject_type: subject.type, date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);

      let query = supabaseAny
        .from("body_measurements")
        .select(
          "id, date, weight, body_fat_percent, waist_cm, hips_cm, chest_cm, neck_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, calf_cm, notes"
        )
        .eq("date", date)
        .limit(1);

      query = applySubjectFilters(query, subjectRef);

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;

      return mapBodyMeasurementRow(data as BodyMeasurementTableRow);
    },
  });
}
