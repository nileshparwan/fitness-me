"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { storageCircumference, storageWeight, type UnitSystem } from "@/utils/unit-conversion";

type BodyMeasurementTableRow = Database["public"]["Tables"]["body_measurements"]["Row"];

export type MeasurementSubject = { type: "me" } | { type: "client"; id: string };

export type LogBodyMeasurementInput = {
  date: string;
  weight?: number | null;
  body_fat_percent?: number | null;
  waist?: number | null;
  hips?: number | null;
  chest?: number | null;
  neck?: number | null;
  bicep_left?: number | null;
  bicep_right?: number | null;
  thigh_left?: number | null;
  thigh_right?: number | null;
  calf?: number | null;
  notes?: string | null;
};

export type BodyMeasurementRow = {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percent: number | null;
  waist: number | null;
  hips: number | null;
  chest: number | null;
  neck: number | null;
  bicep_left: number | null;
  bicep_right: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  calf: number | null;
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
  waist: positiveNumberSchema.nullish(),
  hips: positiveNumberSchema.nullish(),
  chest: positiveNumberSchema.nullish(),
  neck: positiveNumberSchema.nullish(),
  bicep_left: positiveNumberSchema.nullish(),
  bicep_right: positiveNumberSchema.nullish(),
  thigh_left: positiveNumberSchema.nullish(),
  thigh_right: positiveNumberSchema.nullish(),
  calf: positiveNumberSchema.nullish(),
  notes: z.string().trim().max(4000).nullish(),
});

const getSingleDateSchema = z.object({
  date: z.string().regex(datePattern, "Invalid date format"),
});

const rangeSchema = z.enum(["30d", "90d", "180d", "1y", "all"]);

const MEASUREMENT_FIELDS: Array<keyof LogBodyMeasurementInput> = [
  "weight",
  "body_fat_percent",
  "waist",
  "hips",
  "chest",
  "neck",
  "bicep_left",
  "bicep_right",
  "thigh_left",
  "thigh_right",
  "calf",
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
    waist: input.waist ?? null,
    hips: input.hips ?? null,
    chest: input.chest ?? null,
    neck: input.neck ?? null,
    bicep_left: input.bicep_left ?? null,
    bicep_right: input.bicep_right ?? null,
    thigh_left: input.thigh_left ?? null,
    thigh_right: input.thigh_right ?? null,
    calf: input.calf ?? null,
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
    waist: row.waist,
    hips: row.hips,
    chest: row.chest,
    neck: row.neck,
    bicep_left: row.bicep_left,
    bicep_right: row.bicep_right,
    thigh_left: row.thigh_left,
    thigh_right: row.thigh_right,
    calf: row.calf,
    notes: row.notes,
  };
}

export async function logBodyMeasurementAction(
  subjectInput: MeasurementSubject,
  input: LogBodyMeasurementInput,
  unitSystem: UnitSystem = "metric"
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
        weight: normalized.weight == null ? null : storageWeight(normalized.weight, unitSystem),
        waist: normalized.waist == null ? null : storageCircumference(normalized.waist, unitSystem),
        hips: normalized.hips == null ? null : storageCircumference(normalized.hips, unitSystem),
        chest: normalized.chest == null ? null : storageCircumference(normalized.chest, unitSystem),
        neck: normalized.neck == null ? null : storageCircumference(normalized.neck, unitSystem),
        bicep_left:
          normalized.bicep_left == null ? null : storageCircumference(normalized.bicep_left, unitSystem),
        bicep_right:
          normalized.bicep_right == null ? null : storageCircumference(normalized.bicep_right, unitSystem),
        thigh_left: normalized.thigh_left == null ? null : storageCircumference(normalized.thigh_left, unitSystem),
        thigh_right:
          normalized.thigh_right == null ? null : storageCircumference(normalized.thigh_right, unitSystem),
        calf: normalized.calf == null ? null : storageCircumference(normalized.calf, unitSystem),
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
          "id, date, weight, body_fat_percent, waist, hips, chest, neck, bicep_left, bicep_right, thigh_left, thigh_right, calf, notes"
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
          "id, date, weight, body_fat_percent, waist, hips, chest, neck, bicep_left, bicep_right, thigh_left, thigh_right, calf, notes"
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

export async function getLatestBodyMeasurementAction(
  subjectInput: MeasurementSubject
): Promise<BodyMeasurementRow | null> {
  const subject = subjectSchema.parse(subjectInput);

  return runTrackedAction({
    eventName: "body_measurements.latest",
    payload: { subject_type: subject.type },
    action: async () => {
      const { supabase, user } = await requireActor();
      const supabaseAny = supabase as any;
      const subjectRef = resolveSubject(subject, user.id);

      let query = supabaseAny
        .from("body_measurements")
        .select(
          "id, date, weight, body_fat_percent, waist, hips, chest, neck, bicep_left, bicep_right, thigh_left, thigh_right, calf, notes"
        )
        .order("date", { ascending: false })
        .limit(1);

      query = applySubjectFilters(query, subjectRef);

      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;

      return mapBodyMeasurementRow(data as BodyMeasurementTableRow);
    },
  });
}
