"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { inngest } from "@/lib/inngest/client";
import {
  computeDaysBetween,
  computeGoalProgressPercent,
  computeGoalTrendFromHistory,
  computePaceDelta,
  computeReviewDue,
  daysUntilDate,
  formatGoalSubtitle,
  normalizeClientGoalStatus,
  type ClientGoalStatus,
  type ClientGoalTrend,
} from "@/lib/clients/dashboard";
import {
  emitTrainingWorkoutCompleted,
  insertWorkoutExerciseRows,
  revalidateTrainingWorkoutPaths,
} from "@/lib/training/workout-mutation-helpers";
import { decodeCursor, encodeCursor } from "@/lib/utils/pagination";
import { escapeLikePattern } from "@/lib/utils/search";
import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["client_plan_assignments"]["Row"];
type AssignmentSessionRow = Database["public"]["Tables"]["client_plan_assignment_sessions"]["Row"];
type TemplateRow = Database["public"]["Tables"]["coach_plan_templates"]["Row"];
type TemplateSessionRow = Database["public"]["Tables"]["coach_plan_template_sessions"]["Row"];
type WorkoutInsert = Database["public"]["Tables"]["training_sessions"]["Insert"];
type WorkoutSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type StrengthSetInsert = Database["public"]["Tables"]["strength_sets"]["Insert"];
type CardioSessionInsert = Database["public"]["Tables"]["cardio_sessions"]["Insert"];
type CheckinInsert = Database["public"]["Tables"]["client_checkins"]["Insert"];
type CheckinRow = Database["public"]["Tables"]["client_checkins"]["Row"];
type CheckinUpdate = Database["public"]["Tables"]["client_checkins"]["Update"];
type CoachNoteInsert = Database["public"]["Tables"]["coach_notes"]["Insert"];
type CoachNoteRow = Database["public"]["Tables"]["coach_notes"]["Row"];
type CoachNoteUpdate = Database["public"]["Tables"]["coach_notes"]["Update"];
type PaymentInsert = Database["public"]["Tables"]["client_payments"]["Insert"];
type PaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];
type PaymentUpdate = Database["public"]["Tables"]["client_payments"]["Update"];
type BillingPlanInsert = Database["public"]["Tables"]["client_billing_plans"]["Insert"];
type BillingPlanUpdate = Database["public"]["Tables"]["client_billing_plans"]["Update"];
type PaymentLogInsert = Database["public"]["Tables"]["payment_logs"]["Insert"];
type GoalInsert = Database["public"]["Tables"]["fitness_goals"]["Insert"];
type GoalUpdate = Database["public"]["Tables"]["fitness_goals"]["Update"];
type GoalProgressHistoryInsert = Database["public"]["Tables"]["goal_progress_history"]["Insert"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type SessionSlot = Database["public"]["Enums"]["session_slot"];
export type SessionLocationType = Database["public"]["Enums"]["session_location_type"];
export type ClientCheckinStatus = Database["public"]["Enums"]["client_checkin_status"];
export type CoachNoteTag = Database["public"]["Enums"]["coach_note_tag"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
type DbPaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentStatus = "pending" | "paid";
export type BillingType = Database["public"]["Enums"]["billing_type"];
export type GoalStatus = ClientGoalStatus;
export type GoalTrend = ClientGoalTrend;

const GOAL_STATUS_VALUES = [
  "active",
  "on_track",
  "at_risk",
  "completed",
  "paused",
  "archived",
] as const;

const GOAL_CATEGORY_VALUES = [
  "weight",
  "muscle_gain",
  "strength",
  "performance",
  "nutrition",
  "custom",
] as const;

const COACH_NOTE_TAG_INPUTS = [
  "general",
  "injury",
  "nutrition",
  "psychology",
  "milestone",
  // Legacy tags kept for backward-compatible input handling.
  "form",
  "programming",
] as const;

function normalizeCoachNoteTag(tag: (typeof COACH_NOTE_TAG_INPUTS)[number]): CoachNoteTag {
  if (tag === "form" || tag === "programming") return "general";
  return tag as CoachNoteTag;
}

const listClientsSchema = z.object({
  cursor: z.string().nullish(),
  page_size: z.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "paused", "blocked", "archived"]).optional(),
  sort_by: z.enum(["updated_at", "created_at", "first_name", "status", "email"]).default("updated_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
});

const listCoachPaymentsSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "paid", "pending", "overdue"]).default("all"),
  limit: z.number().int().min(1).max(2000).default(1000),
  cursor: z.string().nullish(),
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(5).max(100).default(10),
  sort_by: z.enum(["payment_date", "amount", "status", "updated_at", "created_at"]).default("created_at"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
});

const upsertClientSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().max(120).nullable().optional(),
  display_name: z.string().trim().max(180).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  status: z.enum(["active", "paused", "blocked", "archived"]).default("active"),
  linked_user_id: z.string().uuid().nullable().optional(),
  goals: z.string().trim().max(3000).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  medical_flags: z.string().trim().max(3000).nullable().optional(),
});

const removeClientSchema = z.object({
  client_id: z.string().uuid(),
});

const templateSessionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  session_type: z.string().trim().min(1).max(64).default("mixed"),
  notes: z.string().trim().max(5000).nullable().optional(),
  default_slot: z.enum(["morning", "afternoon", "evening", "other"]).default("other"),
  estimated_duration_minutes: z.number().int().min(0).max(600).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
  sessions: z.array(templateSessionSchema).min(1),
});

const assignTemplateSchema = z.object({
  client_id: z.string().uuid(),
  template_id: z.string().uuid(),
  name: z.string().trim().min(2).max(180).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const logWorkoutSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().trim().min(1).max(180),
  performed_on: z.string().date(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  session_slot: z.enum(["morning", "afternoon", "evening", "other"]).default("other"),
  session_label: z.string().trim().max(120).nullable().optional(),
  location_type: z.enum(["gym", "home", "outdoor", "travel", "other"]).nullable().optional(),
  location_label: z.string().trim().max(180).nullable().optional(),
  location_address: z.string().trim().max(500).nullable().optional(),
  location_notes: z.string().trim().max(1000).nullable().optional(),
  status: z.string().trim().max(30).default("active"),
  notes: z.string().trim().max(5000).nullable().optional(),
  plan_assignment_id: z.string().uuid().nullable().optional(),
  plan_session_id: z.string().uuid().nullable().optional(),
  mark_plan_session_resolved: z.boolean().default(false),
  strength_sets: z
    .array(
      z.object({
        exercise_name: z.string().trim().min(1).max(180),
        set_number: z.number().int().min(1),
        reps: z.number().int().min(0).nullable().optional(),
        weight: z.number().min(0).nullable().optional(),
        rest_seconds: z.number().int().min(0).nullable().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        entry_sequence: z.number().int().min(0).nullable().optional(),
      })
    )
    .optional(),
  cardio_sessions: z
    .array(
      z.object({
        activity_type: z.string().trim().min(1).max(120),
        duration_minutes: z.number().min(0),
        distance_km: z.number().min(0).nullable().optional(),
        calories_burned: z.number().min(0).nullable().optional(),
        average_heart_rate: z.number().min(0).nullable().optional(),
        reps: z.number().int().min(0).nullable().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        entry_sequence: z.number().int().min(0).nullable().optional(),
      })
    )
    .optional(),
});

const listSessionsByRangeSchema = z.object({
  client_id: z.string().uuid(),
  start_date: z.string().date(),
  end_date: z.string().date(),
});

const createCheckinSchema = z.object({
  subject_client_id: z.string().uuid().nullable().optional(),
  subject_user_id: z.string().uuid().nullable().optional(),
  urgent: z.boolean().default(false),
  notes: z.string().trim().max(5000).nullable().optional(),
  checkin_data: z.record(z.string(), z.unknown()).default({}),
});

const updateCheckinSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "reviewed", "actioned"]),
  urgent: z.boolean().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const createNoteSchema = z.object({
  client_id: z.string().uuid(),
  tag: z.enum(COACH_NOTE_TAG_INPUTS).default("general"),
  title: z.string().trim().max(180).nullable().optional(),
  content: z.string().trim().min(1).max(5000),
  is_shared_with_linked_user: z.boolean().default(false),
  visibility: z.enum(["private", "visible_to_client"]).optional(),
});

const updateNoteSchema = z
  .object({
    note_id: z.string().uuid(),
    client_id: z.string().uuid(),
    tag: z.enum(COACH_NOTE_TAG_INPUTS).optional(),
    title: z.string().trim().max(180).nullable().optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    visibility: z.enum(["private", "visible_to_client"]).optional(),
  })
  .refine(
    (value) =>
      value.tag !== undefined ||
      value.title !== undefined ||
      value.content !== undefined ||
      value.visibility !== undefined,
    "At least one field must be provided."
  );

function assertCheckinSubjectTarget(input: {
  subjectClientId?: string | null;
  subjectUserId?: string | null;
}) {
  if (!input.subjectClientId && !input.subjectUserId) {
    throw new Error("A check-in must target a client or user.");
  }
  if (input.subjectClientId && input.subjectUserId) {
    throw new Error("A check-in can target only one subject.");
  }
}

function buildCheckinInsertPayload(input: {
  payload: z.output<typeof createCheckinSchema>;
  actorUserId: string;
}): CheckinInsert {
  return {
    subject_client_id: input.payload.subject_client_id || null,
    subject_user_id: input.payload.subject_user_id || null,
    created_by_user_id: input.actorUserId,
    urgent: input.payload.urgent,
    notes: input.payload.notes || null,
    checkin_data: (input.payload.checkin_data || {}) as Json,
  };
}

function buildCheckinUpdatePayload(payload: z.output<typeof updateCheckinSchema>): CheckinUpdate {
  const updates: CheckinUpdate = {
    status: payload.status,
  };
  if (typeof payload.urgent === "boolean") updates.urgent = payload.urgent;
  if (payload.notes !== undefined) updates.notes = payload.notes || null;
  if (payload.status === "reviewed") updates.reviewed_at = new Date().toISOString();
  if (payload.status === "actioned") updates.actioned_at = new Date().toISOString();
  return updates;
}

async function insertClientCheckinRow(input: {
  supabase: DbClient;
  payload: CheckinInsert;
}): Promise<CheckinRow> {
  const { data, error } = await input.supabase.from("client_checkins").insert(input.payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as CheckinRow;
}

async function updateClientCheckinRow(input: {
  supabase: DbClient;
  checkinId: string;
  updates: CheckinUpdate;
}): Promise<CheckinRow> {
  const { data, error } = await input.supabase
    .from("client_checkins")
    .update(input.updates)
    .eq("id", input.checkinId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CheckinRow;
}

function resolveCoachNoteVisibility(input: {
  visibility?: "private" | "visible_to_client";
  isSharedWithLinkedUser: boolean;
}) {
  if (input.visibility !== undefined) {
    return {
      visibility: input.visibility,
      is_shared_with_linked_user: input.visibility === "visible_to_client",
    } as const;
  }
  const isShared = input.isSharedWithLinkedUser;
  return {
    visibility: (isShared ? "visible_to_client" : "private") as "private" | "visible_to_client",
    is_shared_with_linked_user: isShared,
  } as const;
}

function buildCoachNoteInsertPayload(input: {
  payload: z.output<typeof createNoteSchema>;
  actorUserId: string;
}): CoachNoteInsert {
  const visibilityFields = resolveCoachNoteVisibility({
    visibility: input.payload.visibility,
    isSharedWithLinkedUser: input.payload.is_shared_with_linked_user,
  });
  return {
    client_id: input.payload.client_id,
    coach_id: input.actorUserId,
    tag: normalizeCoachNoteTag(input.payload.tag),
    title: input.payload.title || null,
    content: input.payload.content,
    is_shared_with_linked_user: visibilityFields.is_shared_with_linked_user,
    visibility: visibilityFields.visibility,
  };
}

function buildCoachNoteUpdatePayload(payload: z.output<typeof updateNoteSchema>): CoachNoteUpdate {
  const updates: CoachNoteUpdate = {};
  if (payload.tag !== undefined) updates.tag = normalizeCoachNoteTag(payload.tag);
  if (payload.title !== undefined) updates.title = payload.title || null;
  if (payload.content !== undefined) updates.content = payload.content;
  if (payload.visibility !== undefined) {
    updates.visibility = payload.visibility;
    updates.is_shared_with_linked_user = payload.visibility === "visible_to_client";
  }
  return updates;
}

async function insertCoachNoteRow(input: {
  supabase: DbClient;
  payload: CoachNoteInsert;
}): Promise<CoachNoteRow> {
  const { data, error } = await input.supabase.from("coach_notes").insert(input.payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as CoachNoteRow;
}

async function updateCoachNoteRow(input: {
  supabase: DbClient;
  noteId: string;
  clientId: string;
  updates: CoachNoteUpdate;
}): Promise<CoachNoteRow> {
  const { data, error } = await input.supabase
    .from("coach_notes")
    .update(input.updates)
    .eq("id", input.noteId)
    .eq("client_id", input.clientId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CoachNoteRow;
}

function emitCheckinSubmitted(input: {
  checkinId: string;
  createdByUserId: string;
  subjectClientId: string | null;
  subjectUserId: string | null;
}) {
  void inngest.send({
    name: "coaching/checkin.submitted",
    data: {
      checkin_id: input.checkinId,
      created_by_user_id: input.createdByUserId,
      subject_client_id: input.subjectClientId,
      subject_user_id: input.subjectUserId,
    },
  });
}

function buildClientPaymentInsertPayload(input: {
  payload: z.output<typeof recordPaymentSchema>;
  actorUserId: string;
}): PaymentInsert {
  return {
    client_id: input.payload.client_id,
    coach_id: input.actorUserId,
    amount: input.payload.amount,
    currency: input.payload.currency.toUpperCase(),
    method: input.payload.method,
    payment_date: input.payload.payment_date,
    period_start: input.payload.period_start || null,
    period_end: input.payload.period_end || null,
    status: input.payload.status,
    notes: input.payload.notes || null,
  };
}

function buildClientPaymentDetailsUpdatePayload(payload: z.output<typeof updatePaymentDetailsSchema>): PaymentUpdate {
  const changes: PaymentUpdate = {};
  if (payload.method !== undefined) changes.method = payload.method;
  if (payload.status !== undefined) changes.status = payload.status;
  if (payload.notes !== undefined) changes.notes = payload.notes;
  return changes;
}

async function insertClientPaymentRow(input: {
  supabase: DbClient;
  payload: PaymentInsert;
}): Promise<PaymentRow> {
  const { data, error } = await input.supabase.from("client_payments").insert(input.payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as PaymentRow;
}

async function deleteClientPaymentRow(input: {
  supabase: DbClient;
  paymentId: string;
}): Promise<Pick<PaymentRow, "id" | "client_id">> {
  const { data, error } = await input.supabase
    .from("client_payments")
    .delete()
    .eq("id", input.paymentId)
    .select("id, client_id")
    .single();
  if (error) throw new Error(error.message);
  return data as Pick<PaymentRow, "id" | "client_id">;
}

async function updateClientPaymentRow(input: {
  supabase: DbClient;
  paymentId: string;
  changes: PaymentUpdate;
}): Promise<Pick<PaymentRow, "id" | "client_id">> {
  const { data, error } = await input.supabase
    .from("client_payments")
    .update(input.changes)
    .eq("id", input.paymentId)
    .select("id, client_id")
    .single();
  if (error) throw new Error(error.message);
  return data as Pick<PaymentRow, "id" | "client_id">;
}

function revalidateCoachClientFromPayment(input: Pick<PaymentRow, "client_id">) {
  revalidateCoachPaths(input.client_id);
}

const recordPaymentSchema = z.object({
  client_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  method: z.enum(["cash", "bank_transfer", "card", "other"]).default("bank_transfer"),
  payment_date: z.string().date(),
  period_start: z.string().date().nullable().optional(),
  period_end: z.string().date().nullable().optional(),
  status: z.enum(["pending", "paid"]).default("pending"),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const deletePaymentSchema = z.object({
  id: z.string().uuid(),
});

const updatePaymentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid"]),
});

const updatePaymentDetailsSchema = z
  .object({
    id: z.string().uuid(),
    method: z.enum(["cash", "bank_transfer", "card", "other"]).optional(),
    status: z.enum(["pending", "paid"]).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.method !== undefined ||
      value.status !== undefined ||
      value.notes !== undefined,
    "At least one field must be provided."
  );

const createBillingPlanSchema = z.object({
  client_id: z.string().uuid(),
  billing_type: z.enum(["per_session", "session_package", "monthly", "program", "hourly"]).default("per_session"),
  session_rate: z.number().positive(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  payment_method: z.enum(["cash", "bank_transfer", "card", "other"]).default("cash"),
  sessions_purchased: z.number().int().min(0).default(0),
  monthly_amount: z.number().positive().nullable().optional(),
  billing_cycle_day: z.number().int().min(1).max(28).nullable().optional(),
  program_start_date: z.string().date().nullable().optional(),
  program_end_date: z.string().date().nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const updateBillingPlanSchema = z
  .object({
    id: z.string().uuid(),
    session_rate: z.number().positive().optional(),
    sessions_purchased: z.number().int().min(0).optional(),
    monthly_amount: z.number().positive().nullable().optional(),
    billing_cycle_day: z.number().int().min(1).max(28).nullable().optional(),
    payment_method: z.enum(["cash", "bank_transfer", "card", "other"]).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.session_rate !== undefined ||
      value.sessions_purchased !== undefined ||
      value.monthly_amount !== undefined ||
      value.billing_cycle_day !== undefined ||
      value.payment_method !== undefined ||
      value.notes !== undefined ||
      value.is_active !== undefined,
    "At least one field must be provided."
  );

const renewPackageSchema = z.object({
  billing_plan_id: z.string().uuid(),
  sessions_to_add: z.number().int().positive(),
  payment_amount: z.number().positive(),
  payment_method: z.enum(["cash", "bank_transfer", "card", "other"]).default("cash"),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const logSessionSchema = z.object({
  client_id: z.string().uuid(),
  session_date: z.string().date().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const deleteSessionLogSchema = z.object({
  log_id: z.string().uuid(),
  client_id: z.string().uuid().optional(),
  session_date: z.string().date().optional(),
});

const listClientPaymentLogsSchema = z.object({
  client_id: z.string().uuid(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  limit: z.number().int().min(1).max(500).default(100),
  page: z.number().int().min(0).default(0),
  sort_by: z.enum(["session_date", "amount", "status", "created_at"]).default("session_date"),
  sort_dir: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["all", "logged", "confirmed"]).default("all"),
  search: z.string().trim().max(120).optional(),
});

const listClientGoalsSchema = z.object({
  client_id: z.string().uuid(),
  status: z.enum([...GOAL_STATUS_VALUES, "all"]).default("all"),
  limit: z.number().int().min(1).max(120).default(50),
});
const listMyGoalsSchema = z.object({
  status: z.enum([...GOAL_STATUS_VALUES, "all"]).default("all"),
  limit: z.number().int().min(1).max(120).default(50),
});

const createGoalSchema = z
  .object({
    client_id: z.string().uuid(),
    goal: z.string().trim().min(1).max(240),
    category: z.string().trim().min(1).max(120),
    start_value: z.number().min(0).nullable().optional(),
    current_value: z.number().min(0).nullable().optional(),
    target_value: z.number().positive().nullable().optional(),
    unit: z.string().trim().max(32).nullable().optional(),
    status: z.enum(GOAL_STATUS_VALUES).default("active"),
    start_date: z.string().date().optional(),
    target_date: z.string().date().nullable().optional(),
    notes: z.string().trim().max(2500).nullable().optional(),
    priority: z.number().int().min(1).max(5).default(1),
    start_weight: z.number().min(0).nullable().optional(),
    current_weight: z.number().min(0).nullable().optional(),
    target_weight: z.number().min(0).nullable().optional(),
    goal_direction: z.enum(["increase", "decrease"]).default("increase"),
    check_in_interval_days: z.number().int().min(1).max(365).nullable().optional(),
    linked_exercise_id: z.string().uuid().nullable().optional(),
    linked_program_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      (typeof value.target_value === "number" && value.target_value > 0) ||
      (typeof value.target_weight === "number" && value.target_weight > 0),
    "A target value or target weight is required."
  );

const updateGoalSchema = z
  .object({
    client_id: z.string().uuid(),
    goal_id: z.string().uuid(),
    goal: z.string().trim().min(1).max(240).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    start_value: z.number().min(0).nullable().optional(),
    current_value: z.number().min(0).nullable().optional(),
    target_value: z.number().positive().nullable().optional(),
    unit: z.string().trim().max(32).nullable().optional(),
    status: z.enum(GOAL_STATUS_VALUES).optional(),
    start_date: z.string().date().optional(),
    target_date: z.string().date().nullable().optional(),
    notes: z.string().trim().max(2500).nullable().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    start_weight: z.number().min(0).nullable().optional(),
    current_weight: z.number().min(0).nullable().optional(),
    target_weight: z.number().min(0).nullable().optional(),
    goal_direction: z.enum(["increase", "decrease"]).optional(),
    check_in_interval_days: z.number().int().min(1).max(365).nullable().optional(),
    linked_exercise_id: z.string().uuid().nullable().optional(),
    linked_program_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.goal !== undefined ||
      value.category !== undefined ||
      value.start_value !== undefined ||
      value.current_value !== undefined ||
      value.target_value !== undefined ||
      value.unit !== undefined ||
      value.status !== undefined ||
      value.start_date !== undefined ||
      value.target_date !== undefined ||
      value.notes !== undefined ||
      value.priority !== undefined ||
      value.start_weight !== undefined ||
      value.current_weight !== undefined ||
      value.target_weight !== undefined ||
      value.goal_direction !== undefined ||
      value.check_in_interval_days !== undefined ||
      value.linked_exercise_id !== undefined ||
      value.linked_program_id !== undefined,
    "At least one field must be provided."
  );

const updateGoalStatusSchema = z.object({
  client_id: z.string().uuid(),
  goal_id: z.string().uuid(),
  status: z.enum(GOAL_STATUS_VALUES),
});

const deleteGoalSchema = z.object({
  client_id: z.string().uuid(),
  goal_id: z.string().uuid(),
  goal_title: z.string().trim().max(240).optional(),
});

const createMyGoalSchema = z
  .object({
    goal: z.string().trim().min(1).max(240),
    category: z.string().trim().min(1).max(120),
    start_value: z.number().min(0).nullable().optional(),
    current_value: z.number().min(0).nullable().optional(),
    target_value: z.number().positive().nullable().optional(),
    unit: z.string().trim().max(32).nullable().optional(),
    status: z.enum(GOAL_STATUS_VALUES).default("active"),
    start_date: z.string().date().optional(),
    target_date: z.string().date().nullable().optional(),
    notes: z.string().trim().max(2500).nullable().optional(),
    priority: z.number().int().min(1).max(5).default(1),
    start_weight: z.number().min(0).nullable().optional(),
    current_weight: z.number().min(0).nullable().optional(),
    target_weight: z.number().min(0).nullable().optional(),
    goal_direction: z.enum(["increase", "decrease"]).default("increase"),
    check_in_interval_days: z.number().int().min(1).max(365).nullable().optional(),
    linked_exercise_id: z.string().uuid().nullable().optional(),
    linked_program_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      (typeof value.target_value === "number" && value.target_value > 0) ||
      (typeof value.target_weight === "number" && value.target_weight > 0),
    "A target value or target weight is required."
  );

const updateMyGoalSchema = z
  .object({
    goal_id: z.string().uuid(),
    goal: z.string().trim().min(1).max(240).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    start_value: z.number().min(0).nullable().optional(),
    current_value: z.number().min(0).nullable().optional(),
    target_value: z.number().positive().nullable().optional(),
    unit: z.string().trim().max(32).nullable().optional(),
    status: z.enum(GOAL_STATUS_VALUES).optional(),
    start_date: z.string().date().optional(),
    target_date: z.string().date().nullable().optional(),
    notes: z.string().trim().max(2500).nullable().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    start_weight: z.number().min(0).nullable().optional(),
    current_weight: z.number().min(0).nullable().optional(),
    target_weight: z.number().min(0).nullable().optional(),
    goal_direction: z.enum(["increase", "decrease"]).optional(),
    check_in_interval_days: z.number().int().min(1).max(365).nullable().optional(),
    linked_exercise_id: z.string().uuid().nullable().optional(),
    linked_program_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) =>
      value.goal !== undefined ||
      value.category !== undefined ||
      value.start_value !== undefined ||
      value.current_value !== undefined ||
      value.target_value !== undefined ||
      value.unit !== undefined ||
      value.status !== undefined ||
      value.start_date !== undefined ||
      value.target_date !== undefined ||
      value.notes !== undefined ||
      value.priority !== undefined ||
      value.start_weight !== undefined ||
      value.current_weight !== undefined ||
      value.target_weight !== undefined ||
      value.goal_direction !== undefined ||
      value.check_in_interval_days !== undefined ||
      value.linked_exercise_id !== undefined ||
      value.linked_program_id !== undefined,
    "At least one field must be provided."
  );
const updateMyGoalStatusSchema = z.object({
  goal_id: z.string().uuid(),
  status: z.enum(GOAL_STATUS_VALUES),
});
const deleteMyGoalSchema = z.object({
  goal_id: z.string().uuid(),
  goal_title: z.string().trim().max(240).optional(),
});

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function chunkArray<T>(input: T[], size = 20) {
  if (input.length === 0) return [] as T[][];
  const chunks: T[][] = [];
  for (let index = 0; index < input.length; index += size) {
    chunks.push(input.slice(index, index + size));
  }
  return chunks;
}

async function listActiveAssignmentsByClientIds(
  supabase: DbClient,
  coachId: string,
  clientIds: string[]
): Promise<Array<Pick<AssignmentRow, "id" | "client_id">>> {
  if (clientIds.length === 0) return [];
  const assignmentRows: Array<Pick<AssignmentRow, "id" | "client_id">> = [];
  for (const clientIdChunk of chunkArray(clientIds, 20)) {
    const { data, error } = await supabase
      .from("client_plan_assignments")
      .select("id, client_id")
      .in("client_id", clientIdChunk)
      .eq("coach_id", coachId)
      .eq("status", "active")
      .order("assigned_at", { ascending: false });
    if (error) throw new Error(error.message);
    assignmentRows.push(...((data || []) as Array<Pick<AssignmentRow, "id" | "client_id">>));
  }
  return assignmentRows;
}

async function listAssignmentSessionsByAssignmentIds(
  supabase: DbClient,
  assignmentIds: string[]
): Promise<Map<string, AssignmentSessionRow[]>> {
  const sessionsByAssignment = new Map<string, AssignmentSessionRow[]>();
  if (assignmentIds.length === 0) return sessionsByAssignment;

  for (const assignmentIdChunk of chunkArray(assignmentIds, 20)) {
    const { data: sessionsChunk, error: sessionsError } = await supabase
      .from("client_plan_assignment_sessions")
      .select("*")
      .in("assignment_id", assignmentIdChunk)
      .order("sequence_no", { ascending: true });
    if (sessionsError) throw new Error(sessionsError.message);
    for (const row of (sessionsChunk || []) as AssignmentSessionRow[]) {
      const existing = sessionsByAssignment.get(row.assignment_id) || [];
      existing.push(row);
      sessionsByAssignment.set(row.assignment_id, existing);
    }
  }

  return sessionsByAssignment;
}

async function countActiveAssignmentsByClientId(
  supabase: DbClient,
  coachId: string,
  clientIds: string[]
): Promise<Map<string, number>> {
  const activePlansCountByClient = new Map<string, number>();
  const assignmentRows = await listActiveAssignmentsByClientIds(supabase, coachId, clientIds);
  for (const row of assignmentRows) {
    activePlansCountByClient.set(row.client_id, (activePlansCountByClient.get(row.client_id) || 0) + 1);
  }
  return activePlansCountByClient;
}

async function fetchClientSessionsByPerformedRange(input: {
  supabase: DbClient;
  clientId: string;
  startDate: string;
  endDate: string;
  includePerformedOnSort?: boolean;
}): Promise<WorkoutSessionRow[]> {
  let query = input.supabase
    .from("training_sessions")
    .select("*")
    .eq("subject_client_id", input.clientId)
    .gte("performed_on", input.startDate)
    .lte("performed_on", input.endDate);

  if (input.includePerformedOnSort) {
    query = query.order("performed_on", { ascending: true });
  }
  query = query.order("started_at", { ascending: true, nullsFirst: true });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as WorkoutSessionRow[];
}

async function fetchClientCheckinsByClientId(input: {
  supabase: DbClient;
  clientId: string;
}): Promise<CheckinRow[]> {
  const { data, error } = await input.supabase
    .from("client_checkins")
    .select("*")
    .eq("subject_client_id", input.clientId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CheckinRow[];
}

async function fetchCoachNotesByClientId(input: {
  supabase: DbClient;
  clientId: string;
}): Promise<CoachNoteRow[]> {
  const { data, error } = await input.supabase
    .from("coach_notes")
    .select("*")
    .eq("client_id", input.clientId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CoachNoteRow[];
}

function revalidateCoachPaths(clientId?: string) {
  revalidatePath("/coach/plans");
  revalidatePath("/clients");
  revalidatePath("/clients/payments");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  if (clientId) revalidatePath(`/clients/${clientId}/payments`);
}

type ClientRosterRow = ClientRow & {
  active_assignment: AssignmentRow | null;
  active_plans_count: number;
  next_session: AssignmentSessionRow | null;
  today_sessions_count: number;
};

type ClientStatusCounts = {
  all: number;
  active: number;
  paused: number;
  blocked: number;
  archived: number;
};

export type CoachPaymentTransactionRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_status: ClientStatus;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus | "overdue";
  payment_date: string;
  method: PaymentMethod;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingPlanRow = Database["public"]["Tables"]["client_billing_plans"]["Row"];
export type PaymentLogRow = Database["public"]["Tables"]["payment_logs"]["Row"];

export type ClientBillingPlanWithRemaining = BillingPlanRow & {
  sessions_remaining: number;
};

export type TodayLogMapEntry = {
  client_id: string;
  log: PaymentLogRow;
};

export type CoachPaymentsTodayBoardRow = {
  client_id: string;
  client_name: string;
  client_status: ClientStatus;
  billing_plan: ClientBillingPlanWithRemaining;
  today_log: PaymentLogRow | null;
};

export type CoachPaymentClientBillingRow = {
  client_id: string;
  client_name: string;
  client_status: ClientStatus;
  billing_plan_id: string | null;
  billing_type: BillingType | null;
  session_rate: number | null;
  currency: string | null;
  payment_method: PaymentMethod | null;
  sessions_purchased: number;
  sessions_used: number;
  sessions_remaining: number;
  is_active_plan: boolean;
  monthly_amount: number | null;
  billing_cycle_day: number | null;
  program_start_date: string | null;
  program_end_date: string | null;
  plan_notes: string | null;
  total_paid: number;
  outstanding: number;
  next_billing_date: string | null;
};

export type CoachPaymentsDashboard = {
  features: {
    billing_plans_available: boolean;
    payment_logs_available: boolean;
  };
  kpis: {
    total_collected: number;
    pending_amount: number;
    overdue_amount: number;
    active_billing: number;
    sessions_logged_today: number;
    sessions_logged_this_week: number;
    sessions_logged_this_month: number;
    packages_expiring_soon: number;
    clients_due_today: number;
  };
  transactions: CoachPaymentTransactionRow[];
  transactions_total: number;
  nextCursor: string | null;
  page: number;
  page_size: number;
  has_more: boolean;
  todays_board: CoachPaymentsTodayBoardRow[];
  client_billing: CoachPaymentClientBillingRow[];
};

export type ClientPaymentLogsPayload = {
  rows: PaymentLogRow[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export type CoachClientsPayload = {
  data: ClientRosterRow[];
  totalCount: number;
  counts: ClientStatusCounts;
  nextCursor: string | null;
};

export type ClientPaymentLogStats = {
  sessions_this_month: number;
  revenue_this_month: number;
  total_sessions: number;
};

type GoalRow = Database["public"]["Tables"]["fitness_goals"]["Row"];
type GoalProgressHistoryRow = Database["public"]["Tables"]["goal_progress_history"]["Row"];
type GoalProgressHistorySlice = Pick<
  GoalProgressHistoryRow,
  | "goal_id"
  | "progress_percent"
  | "status"
  | "snapshot_at"
  | "current_value"
  | "target_value"
  | "current_weight"
  | "target_weight"
>;
type DbClient = SupabaseClient<Database>;
type GoalListFallbackMode = "none" | "assigned_by_self";

const GOAL_SELECTED_COLUMNS = [
  "id",
  "user_id",
  "goal_type",
  "custom_description",
  "start_value",
  "current_value",
  "target_value",
  "start_weight",
  "current_weight",
  "target_weight",
  "unit",
  "status",
  "start_date",
  "target_date",
  "updated_at",
  "created_at",
  "notes",
  "priority",
  "goal_direction",
  "check_in_interval_days",
  "linked_exercise_id",
  "linked_program_id",
] as const;

export type ClientGoalItem = {
  id: string;
  client_id: string;
  user_id: string;
  goal: string;
  category: string;
  start_value: number | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  progress_percent: number;
  previous_progress_percent: number | null;
  status: GoalStatus;
  trend: GoalTrend;
  remaining: number | null;
  value_delta: number | null;
  days_remaining: number | null;
  exceeded_days: number;
  duration_days: number | null;
  elapsed_days: number | null;
  pace_delta: number | null;
  trend_delta: number | null;
  priority: number;
  goal_direction: string;
  check_in_interval_days: number | null;
  review_due: boolean;
  start_date: string;
  target_date: string | null;
  updated_at: string | null;
  notes: string | null;
  linked_exercise_id: string | null;
  linked_exercise_name: string | null;
  linked_program_id: string | null;
  linked_program_name: string | null;
};

export type ClientGoalsPayload = {
  linked_user_id: string | null;
  categories: string[];
  goals: ClientGoalItem[];
};

function normalizeGoalCategory(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if ((GOAL_CATEGORY_VALUES as readonly string[]).includes(normalized)) return normalized;
  return normalized.slice(0, 120) || "custom";
}

function isGoalHistoryTableMissing(message: string) {
  return /(goal_progress_history|relation .* does not exist|schema cache)/i.test(message);
}

function isPaymentLogsTableMissing(message: string) {
  return /payment_logs|relation .*payment_logs.*does not exist|schema cache/i.test(message);
}

function isClientBillingPlansTableMissing(message: string) {
  return /client_billing_plans|relation .*client_billing_plans.*does not exist|schema cache/i.test(message);
}

const BILLING_TABLES_MIGRATION_MESSAGE =
  "Billing plans/session logs are not available on this database yet. Apply migration `20260313100000_billing_plans_and_payment_logs.sql` and reload the Supabase schema cache.";

function normalizeBillingTablesError(message: string) {
  if (isClientBillingPlansTableMissing(message) || isPaymentLogsTableMissing(message)) {
    return BILLING_TABLES_MIGRATION_MESSAGE;
  }
  return message;
}

type FallbackColumn =
  | "notes"
  | "start_date"
  | "start_value"
  | "start_weight"
  | "goal_direction"
  | "check_in_interval_days"
  | "is_personal_goal"
  | "linked_exercise_id"
  | "linked_program_id";

function missingFitnessGoalsColumn(message: string): FallbackColumn | null {
  const checks: Array<[FallbackColumn, RegExp[]]> = [
    ["notes", [/['"]notes['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.notes\s+does not exist/i]],
    ["start_date", [/['"]start_date['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.start_date\s+does not exist/i]],
    ["start_value", [/['"]start_value['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.start_value\s+does not exist/i]],
    ["start_weight", [/['"]start_weight['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.start_weight\s+does not exist/i]],
    ["goal_direction", [/['"]goal_direction['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.goal_direction\s+does not exist/i]],
    ["check_in_interval_days", [/['"]check_in_interval_days['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.check_in_interval_days\s+does not exist/i]],
    ["linked_exercise_id", [/['"]linked_exercise_id['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.linked_exercise_id\s+does not exist/i]],
    ["linked_program_id", [/['"]linked_program_id['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.linked_program_id\s+does not exist/i]],
    [
      "is_personal_goal",
      [/['"]is_personal_goal['"] column of ['"]fitness_goals['"] in the schema cache/i, /column\s+fitness_goals\.is_personal_goal\s+does not exist/i],
    ],
  ];
  for (const [col, patterns] of checks) {
    if (patterns.some((p) => p.test(message))) return col;
  }
  return null;
}

function isFitnessGoalStatusConstraintError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("fitness_goals") && lower.includes("status") && lower.includes("check constraint");
}

function isRlsViolationError(error: { code?: string | null; message: string } | null | undefined) {
  if (!error) return false;
  if (error.code === "42501") return true;
  return /row-level security|violates row-level security policy/i.test(error.message);
}

function titleFromGoalRow(row: GoalRow) {
  return formatGoalSubtitle({
    custom_description: row.custom_description,
    goal_type: row.goal_type,
  });
}

function previousProgressPercent(progressPercent: number, historyRows: GoalProgressHistorySlice[]) {
  if (historyRows.length >= 2) return historyRows[1].progress_percent;
  if (historyRows.length === 1) {
    const first = historyRows[0].progress_percent;
    return first === progressPercent ? null : first;
  }
  return null;
}

function isWeightGoalCategory(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase().replace(/\s+/g, "_");
  return normalized.includes("weight") || normalized.includes("fat") || normalized.includes("body");
}

function isLegacyDecreaseGoalCategory(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  return normalized.includes("lose") || normalized.includes("loss") || normalized.includes("cut") || normalized.includes("fat");
}

function resolveGoalDirection(row: GoalRow): "increase" | "decrease" {
  const inferDirection = (start: number | null, target: number | null): "increase" | "decrease" | null => {
    if (
      typeof start !== "number" ||
      !Number.isFinite(start) ||
      typeof target !== "number" ||
      !Number.isFinite(target)
    ) {
      return null;
    }
    if (start > target) return "decrease";
    if (start < target) return "increase";
    return null;
  };

  const inferredFromStart =
    inferDirection(row.start_weight, row.target_weight) ??
    inferDirection(row.start_value, row.target_value);

  const explicit = (row as Record<string, unknown>).goal_direction;
  if (explicit === "increase" || explicit === "decrease") {
    if (inferredFromStart && inferredFromStart !== explicit) return inferredFromStart;
    return explicit;
  }
  if (inferredFromStart) return inferredFromStart;

  if (
    typeof row.current_weight === "number" &&
    Number.isFinite(row.current_weight) &&
    typeof row.target_weight === "number" &&
    Number.isFinite(row.target_weight)
  ) {
    if (row.current_weight > row.target_weight) return "decrease";
    if (row.current_weight < row.target_weight) return "increase";
  }

  if (
    typeof row.current_value === "number" &&
    Number.isFinite(row.current_value) &&
    typeof row.target_value === "number" &&
    Number.isFinite(row.target_value)
  ) {
    if (row.current_value > row.target_value) return "decrease";
    if (row.current_value < row.target_value) return "increase";
  }

  if (isLegacyDecreaseGoalCategory(row.goal_type)) return "decrease";
  return "increase";
}

function resolveGoalMetricValues(row: GoalRow) {
  const hasWeightMetrics = row.start_weight !== null || row.current_weight !== null || row.target_weight !== null;
  const hasNumericMetrics = row.start_value !== null || row.current_value !== null || row.target_value !== null;
  const shouldUseWeightMetrics =
    isWeightGoalCategory(row.goal_type) ||
    (hasWeightMetrics && !hasNumericMetrics) ||
    ((row.unit || "").toLowerCase() === "kg" && hasWeightMetrics);

  if (shouldUseWeightMetrics) {
    return {
      start: row.start_weight ?? row.current_weight,
      current: row.current_weight,
      target: row.target_weight,
      unit: row.unit || "kg",
    };
  }
  return {
    start: row.start_value ?? row.current_value,
    current: row.current_value,
    target: row.target_value,
    unit: row.unit,
  };
}

function computeExceededDays(targetDate: string | null, progressPercent: number): number {
  if (!targetDate || progressPercent >= 100) return 0;
  const end = new Date(`${targetDate}T23:59:59.999Z`);
  if (Number.isNaN(end.getTime())) return 0;
  const diff = Date.now() - end.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type GoalLinkNameMaps = {
  exerciseNamesById: Map<string, string>;
  programNamesById: Map<string, string>;
};

async function listGoalLinkNamesById(supabase: DbClient, rows: GoalRow[]): Promise<GoalLinkNameMaps> {
  const exerciseNamesById = new Map<string, string>();
  const programNamesById = new Map<string, string>();

  const exerciseIds = Array.from(
    new Set(rows.map((row) => row.linked_exercise_id).filter((value): value is string => Boolean(value)))
  );
  const programIds = Array.from(
    new Set(rows.map((row) => row.linked_program_id).filter((value): value is string => Boolean(value)))
  );

  for (const chunk of chunkArray(exerciseIds, 20)) {
    const { data, error } = await supabase
      .from("exercise_catalog")
      .select("id, name")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      exerciseNamesById.set(row.id, row.name);
    }
  }

  for (const chunk of chunkArray(programIds, 20)) {
    const { data, error } = await supabase
      .from("training_plans")
      .select("id, name")
      .in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      programNamesById.set(row.id, row.name);
    }
  }

  return { exerciseNamesById, programNamesById };
}

function mapGoalRowToClientItem(input: {
  row: GoalRow;
  clientId: string;
  historyRows: GoalProgressHistorySlice[];
  linkedExerciseName?: string | null;
  linkedProgramName?: string | null;
}): ClientGoalItem {
  const goalDirection = resolveGoalDirection(input.row);
  const checkInDays = (input.row as Record<string, unknown>).check_in_interval_days as number | null | undefined;
  const progressPercent = computeGoalProgressPercent({
    goal_type: input.row.goal_type,
    goal_direction: goalDirection,
    start_value: input.row.start_value,
    start_weight: input.row.start_weight,
    current_value: input.row.current_value,
    target_value: input.row.target_value,
    current_weight: input.row.current_weight,
    target_weight: input.row.target_weight,
  });
  const trend = computeGoalTrendFromHistory(progressPercent, input.historyRows);
  const metrics = resolveGoalMetricValues(input.row);
  const prevProgress = previousProgressPercent(progressPercent, input.historyRows);
  const startDate = input.row.start_date || (input.row.created_at ? input.row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const targetDate = input.row.target_date || null;
  const updatedAt = input.row.updated_at || input.row.created_at || null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const elapsedDays = computeDaysBetween(startDate, todayIso);
  const durationDays = computeDaysBetween(startDate, targetDate);

  return {
    id: input.row.id,
    client_id: input.clientId,
    user_id: input.row.user_id,
    goal: titleFromGoalRow(input.row),
    category: normalizeGoalCategory(input.row.goal_type || "custom"),
    start_value: metrics.start,
    current_value: metrics.current,
    target_value: metrics.target,
    unit: metrics.unit,
    progress_percent: progressPercent,
    previous_progress_percent: prevProgress,
    status: normalizeClientGoalStatus(input.row.status),
    trend,
    remaining: metrics.target !== null && metrics.current !== null ? metrics.target - metrics.current : null,
    value_delta: metrics.current !== null && metrics.start !== null ? metrics.current - metrics.start : null,
    days_remaining: daysUntilDate(targetDate),
    exceeded_days: computeExceededDays(targetDate, progressPercent),
    duration_days: durationDays,
    elapsed_days: elapsedDays,
    pace_delta: computePaceDelta({ elapsed_days: elapsedDays, duration_days: durationDays, progress_percent: progressPercent }),
    trend_delta: prevProgress !== null ? progressPercent - prevProgress : null,
    priority: input.row.priority ?? 1,
    goal_direction: goalDirection,
    check_in_interval_days: checkInDays ?? null,
    review_due: computeReviewDue({ updated_at: updatedAt, check_in_interval_days: checkInDays ?? null }),
    start_date: startDate,
    target_date: targetDate,
    updated_at: updatedAt,
    notes: input.row.notes || null,
    linked_exercise_id: input.row.linked_exercise_id ?? null,
    linked_exercise_name: input.linkedExerciseName ?? null,
    linked_program_id: input.row.linked_program_id ?? null,
    linked_program_name: input.linkedProgramName ?? null,
  };
}

function revalidatePersonalGoalPaths() {
  revalidatePath("/goals");
  revalidatePath("/clients/dashboard");
}

async function queryGoalsWithFallback(input: {
  supabase: DbClient;
  userId: string;
  status: GoalStatus | "all";
  limit: number;
  personalGoalFilter: boolean;
  fallbackMode: GoalListFallbackMode;
}): Promise<GoalRow[]> {
  const runGoalsQuery = async (
    columns: string[],
    withPersonalFlagFilter: boolean
  ): Promise<{ data: GoalRow[] | null; error: { message: string } | null }> => {
    let query = (input.supabase.from("fitness_goals") as any)
      .select(columns.join(", "))
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .order("priority", { ascending: true })
      .limit(input.limit);

    if (withPersonalFlagFilter) {
      query = query.eq("is_personal_goal", input.personalGoalFilter);
    } else if (input.fallbackMode === "assigned_by_self") {
      query = query.eq("assigned_by_id", input.userId);
    }

    if (input.status !== "all") {
      query = query.eq("status", input.status);
    }

    const { data, error } = await query;
    return {
      data: (data || null) as GoalRow[] | null,
      error: error ? { message: error.message } : null,
    };
  };

  let activeColumns = [...GOAL_SELECTED_COLUMNS] as string[];
  let usePersonalFlagFilter = true;
  let { data, error } = await runGoalsQuery(activeColumns, usePersonalFlagFilter);
  for (let attempt = 0; attempt < 8 && error; attempt += 1) {
    const missingColumn = missingFitnessGoalsColumn(error.message);
    if (missingColumn === "is_personal_goal" && usePersonalFlagFilter) {
      usePersonalFlagFilter = false;
      ({ data, error } = await runGoalsQuery(activeColumns, usePersonalFlagFilter));
      continue;
    }
    if (!missingColumn || !activeColumns.includes(missingColumn)) break;
    activeColumns = activeColumns.filter((column) => column !== missingColumn);
    ({ data, error } = await runGoalsQuery(activeColumns, usePersonalFlagFilter));
  }
  if (error) throw new Error(error.message);
  return (data || []) as GoalRow[];
}

async function buildGoalsPayload(input: {
  supabase: DbClient;
  rows: GoalRow[];
  mappedClientId: string;
  linkedUserId: string;
}): Promise<ClientGoalsPayload> {
  const historyByGoal = await listGoalHistoryByGoalIds(
    input.supabase,
    input.rows.map((row) => row.id),
    2
  );
  const linkNames = await listGoalLinkNamesById(input.supabase, input.rows);

  const goals = input.rows.map((row) =>
    mapGoalRowToClientItem({
      row,
      clientId: input.mappedClientId,
      historyRows: historyByGoal.get(row.id) || [],
      linkedExerciseName: row.linked_exercise_id ? linkNames.exerciseNamesById.get(row.linked_exercise_id) || null : null,
      linkedProgramName: row.linked_program_id ? linkNames.programNamesById.get(row.linked_program_id) || null : null,
    })
  );

  const categories = Array.from(new Set(input.rows.map((row) => normalizeGoalCategory(row.goal_type || "custom")))).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    linked_user_id: input.linkedUserId,
    categories,
    goals,
  };
}

async function insertGoalWithFallback(input: {
  supabase: DbClient;
  row: GoalInsert;
  retryOnRls?: boolean;
}): Promise<GoalRow> {
  let attemptedInsert: GoalInsert = { ...input.row };
  let insertResult = await input.supabase.from("fitness_goals").insert(attemptedInsert).select("*").single();

  for (let attempt = 0; attempt < 6 && insertResult.error; attempt += 1) {
    const missingColumn = missingFitnessGoalsColumn(insertResult.error.message);
    if (!missingColumn || !(missingColumn in attemptedInsert)) break;
    const fallbackPayload = { ...attemptedInsert } as Record<string, unknown>;
    delete fallbackPayload[missingColumn];
    attemptedInsert = fallbackPayload as GoalInsert;
    insertResult = await input.supabase.from("fitness_goals").insert(attemptedInsert).select("*").single();
  }

  if (insertResult.error && isFitnessGoalStatusConstraintError(insertResult.error.message)) {
    throw new Error(
      "Goal status values are not fully supported in this database. Apply the latest goal-status migration and retry."
    );
  }

  if (insertResult.error && input.retryOnRls && isRlsViolationError(insertResult.error)) {
    insertResult = await input.supabase.from("fitness_goals").insert(attemptedInsert).select("*").single();
  }

  if (insertResult.error) throw new Error(insertResult.error.message);
  return insertResult.data as GoalRow;
}

async function updateGoalWithFallback(input: {
  supabase: DbClient;
  goalId: string;
  userId: string;
  existing: GoalRow;
  updates: GoalUpdate;
}): Promise<GoalRow> {
  let attemptedUpdates: GoalUpdate = { ...input.updates };
  let updateResult =
    Object.keys(attemptedUpdates).length === 0
      ? { data: input.existing as GoalRow, error: null as null | { message: string } }
      : await input.supabase
          .from("fitness_goals")
          .update(attemptedUpdates)
          .eq("id", input.goalId)
          .eq("user_id", input.userId)
          .select("*")
          .single();

  for (let attempt = 0; attempt < 6 && updateResult.error; attempt += 1) {
    const missingColumn = missingFitnessGoalsColumn(updateResult.error.message);
    if (!missingColumn || !(missingColumn in attemptedUpdates)) break;
    const fallbackPayload = { ...attemptedUpdates } as Record<string, unknown>;
    delete fallbackPayload[missingColumn];
    attemptedUpdates = fallbackPayload as GoalUpdate;
    if (Object.keys(attemptedUpdates).length === 0) {
      updateResult = { data: input.existing as GoalRow, error: null };
      break;
    }
    updateResult = await input.supabase
      .from("fitness_goals")
      .update(attemptedUpdates)
      .eq("id", input.goalId)
      .eq("user_id", input.userId)
      .select("*")
      .single();
  }

  if (updateResult.error && isFitnessGoalStatusConstraintError(updateResult.error.message) && attemptedUpdates.status) {
    throw new Error(
      "Goal status values are not fully supported in this database. Apply the latest goal-status migration and retry."
    );
  }
  if (updateResult.error) throw new Error(updateResult.error.message);
  return updateResult.data as GoalRow;
}

async function resolveClientGoalSubject(
  supabase: DbClient,
  clientId: string,
  actorUserId?: string
) {
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, linked_user_id, created_by_user_id, primary_coach_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!client) throw new Error("Client not found.");

  if (
    !client.linked_user_id &&
    actorUserId &&
    (client.created_by_user_id === actorUserId || client.primary_coach_id === actorUserId)
  ) {
    const nextLinkedUserId = client.created_by_user_id || actorUserId;
    const selectFields = "id, linked_user_id, created_by_user_id, primary_coach_id";

    const { data: existingLinkedClient, error: existingLinkedClientError } = await supabase
      .from("clients")
      .select("id")
      .eq("linked_user_id", nextLinkedUserId)
      .neq("id", clientId)
      .limit(1)
      .maybeSingle();

    if (existingLinkedClientError) throw new Error(existingLinkedClientError.message);
    if (existingLinkedClient) {
      return client;
    }

    const { data: updatedClient, error: updateError } = await supabase
      .from("clients")
      .update({ linked_user_id: nextLinkedUserId })
      .eq("id", clientId)
      .is("linked_user_id", null)
      .select(selectFields)
      .maybeSingle();

    if (updateError) {
      if ((updateError as { code?: string }).code === "23505") {
        return client;
      }
      throw new Error(updateError.message);
    } else if (updatedClient) {
      return updatedClient;
    }

    return client;
  }

  return client;
}

async function listGoalHistoryByGoalIds(
  supabase: DbClient,
  goalIds: string[],
  maxSnapshotsPerGoal?: number
) {
  if (goalIds.length === 0) return new Map<string, GoalProgressHistorySlice[]>();

  const selectFields = "goal_id, progress_percent, status, snapshot_at, current_value, target_value, current_weight, target_weight";
  const rows: GoalProgressHistorySlice[] = [];
  for (const chunk of chunkArray(goalIds, 20)) {
    const orFilter = chunk.map((goalId) => `goal_id.eq.${goalId}`).join(",");
    let query = supabase
      .from("goal_progress_history")
      .select(selectFields)
      .or(orFilter)
      .order("snapshot_at", { ascending: false });

    if (chunk.length === 1 && maxSnapshotsPerGoal) {
      query = query.limit(Math.max(maxSnapshotsPerGoal, 1));
    }

    const { data, error } = await query;
    if (error) {
      if (isGoalHistoryTableMissing(error.message)) return new Map<string, GoalProgressHistorySlice[]>();
      throw new Error(error.message);
    }
    rows.push(...((data || []) as GoalProgressHistorySlice[]));
  }

  const historyByGoal = new Map<string, GoalProgressHistorySlice[]>();
  for (const row of rows) {
    const rows = historyByGoal.get(row.goal_id) || [];
    if (maxSnapshotsPerGoal && rows.length >= maxSnapshotsPerGoal) continue;
    rows.push(row);
    historyByGoal.set(row.goal_id, rows);
  }
  return historyByGoal;
}

async function writeGoalProgressSnapshot(input: {
  supabase: DbClient;
  goal: GoalRow;
  actorId: string;
}) {
  const goalDirection = resolveGoalDirection(input.goal);
  const progressPercent = computeGoalProgressPercent({
    goal_type: input.goal.goal_type,
    goal_direction: goalDirection,
    start_value: input.goal.start_value,
    start_weight: input.goal.start_weight,
    current_value: input.goal.current_value,
    target_value: input.goal.target_value,
    current_weight: input.goal.current_weight,
    target_weight: input.goal.target_weight,
  });
  const status = normalizeClientGoalStatus(input.goal.status);

  const { data: latestRows, error: latestError } = await input.supabase
    .from("goal_progress_history")
    .select(
      "id, progress_percent, current_value, target_value, current_weight, target_weight, status"
    )
    .eq("goal_id", input.goal.id)
    .order("snapshot_at", { ascending: false })
    .limit(1);
  if (latestError) {
    if (isGoalHistoryTableMissing(latestError.message)) return;
    throw new Error(latestError.message);
  }

  const latest = latestRows?.[0];
  const unchanged =
    latest &&
    latest.progress_percent === progressPercent &&
    latest.current_value === input.goal.current_value &&
    latest.target_value === input.goal.target_value &&
    latest.current_weight === input.goal.current_weight &&
    latest.target_weight === input.goal.target_weight &&
    normalizeClientGoalStatus(latest.status) === status;

  if (unchanged) return;

  const historyPayload: GoalProgressHistoryInsert = {
    goal_id: input.goal.id,
    user_id: input.goal.user_id,
    progress_percent: progressPercent,
    current_value: input.goal.current_value,
    target_value: input.goal.target_value,
    current_weight: input.goal.current_weight,
    target_weight: input.goal.target_weight,
    status,
    recorded_by_user_id: input.actorId,
  };
  const { error: insertError } = await input.supabase.from("goal_progress_history").insert(historyPayload);
  if (insertError) {
    if (isGoalHistoryTableMissing(insertError.message)) return;
    throw new Error(insertError.message);
  }
}

export async function listCoachClientsAction(input: z.input<typeof listClientsSchema>): Promise<CoachClientsPayload> {
  const payload = listClientsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.clients.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const escapedSearch = payload.search ? escapeLikePattern(payload.search) : null;
      const searchFilter = escapedSearch
        ? `first_name.ilike.%${escapedSearch}%,last_name.ilike.%${escapedSearch}%,display_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`
        : null;
      const ascending = payload.sort_dir === "asc";

      let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("primary_coach_id", user.id)
        .limit(payload.page_size);

      if (payload.sort_by === "first_name") {
        query = query
          .order("first_name", { ascending, nullsFirst: ascending })
          .order("last_name", { ascending, nullsFirst: ascending });
      } else {
        query = query.order(payload.sort_by, { ascending, nullsFirst: ascending });
      }
      query = query.order("id", { ascending: true });

      if (searchFilter) query = query.or(searchFilter);
      if (payload.status) query = query.eq("status", payload.status);
      if (payload.cursor) {
        const { sortValue, id } = decodeCursor(payload.cursor);
        if (id) {
          const comparator = ascending ? "gt" : "lt";
          query = query.or(
            `${payload.sort_by}.${comparator}.${sortValue},and(${payload.sort_by}.eq.${sortValue},id.gt.${id})`
          );
        }
      }

      const buildCountQuery = (status?: ClientStatus) => {
        let countQuery = supabase.from("clients").select("id", { count: "exact", head: true }).eq("primary_coach_id", user.id);
        if (status) countQuery = countQuery.eq("status", status);
        if (searchFilter) countQuery = countQuery.or(searchFilter);
        return countQuery;
      };

      const [listRes, allCountRes, activeCountRes, pausedCountRes, blockedCountRes, archivedCountRes] = await Promise.all([
        query,
        buildCountQuery(),
        buildCountQuery("active"),
        buildCountQuery("paused"),
        buildCountQuery("blocked"),
        buildCountQuery("archived"),
      ]);

      const { data, error, count } = listRes;
      if (error) throw new Error(error.message);
      if (allCountRes.error) throw new Error(allCountRes.error.message);
      if (activeCountRes.error) throw new Error(activeCountRes.error.message);
      if (pausedCountRes.error) throw new Error(pausedCountRes.error.message);
      if (blockedCountRes.error) throw new Error(blockedCountRes.error.message);
      if (archivedCountRes.error) throw new Error(archivedCountRes.error.message);

      const counts: ClientStatusCounts = {
        all: allCountRes.count ?? 0,
        active: activeCountRes.count ?? 0,
        paused: pausedCountRes.count ?? 0,
        blocked: blockedCountRes.count ?? 0,
        archived: archivedCountRes.count ?? 0,
      };

      const rows = (data || []) as ClientRow[];
      const clientIds = rows.map((row) => row.id);
      if (clientIds.length === 0) {
        return {
          data: [] as ClientRosterRow[],
          totalCount: count ?? 0,
          counts,
          nextCursor: null,
        };
      }

      const activePlansCountByClient = await countActiveAssignmentsByClientId(supabase, user.id, clientIds);

      const enriched: ClientRosterRow[] = rows.map((row) => ({
        ...row,
        active_assignment: null,
        active_plans_count: activePlansCountByClient.get(row.id) || 0,
        next_session: null,
        today_sessions_count: 0,
      }));

      const lastRow = enriched[enriched.length - 1];
      const lastSortValueRaw =
        payload.sort_by === "first_name" ? lastRow.first_name : ((lastRow as Record<string, unknown>)[payload.sort_by] ?? "");
      const nextCursor =
        enriched.length === payload.page_size
          ? encodeCursor(String(lastSortValueRaw ?? ""), lastRow.id)
          : null;

      return {
        data: enriched,
        totalCount: count ?? 0,
        counts,
        nextCursor,
      };
    },
  });
}

export async function upsertClientAction(input: z.input<typeof upsertClientSchema>) {
  const payload = upsertClientSchema.parse(input);
  return runTrackedAction({
    eventName: payload.id ? "coach.client.update" : "coach.client.create",
    payload: {
      id: payload.id || null,
      client_name: payload.display_name || `${payload.first_name} ${payload.last_name || ""}`.trim() || payload.first_name,
      first_name: payload.first_name,
      last_name: payload.last_name || null,
      email: payload.email || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const normalized: ClientUpdate = {
        first_name: payload.first_name,
        last_name: payload.last_name || null,
        display_name: payload.display_name || null,
        email: payload.email || null,
        phone: payload.phone || null,
        date_of_birth: payload.date_of_birth || null,
        status: payload.status,
        linked_user_id: payload.linked_user_id === undefined ? undefined : payload.linked_user_id,
        goals: payload.goals || null,
        notes: payload.notes || null,
        medical_flags: payload.medical_flags || null,
      };

      let clientId = payload.id;
      if (payload.id) {
        const [{ data: existingClient, error: existingClientError }, { data: roleRow, error: roleError }] =
          await Promise.all([
            supabase
              .from("clients")
              .select("id, primary_coach_id, created_by_user_id, linked_user_id")
              .eq("id", payload.id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle(),
          ]);

        if (existingClientError) throw new Error(existingClientError.message);
        if (roleError) throw new Error(roleError.message);
        if (!existingClient) throw new Error("Client not found.");

        const isSysadmin = roleRow?.role === "sysadmin";
        const isPrimaryCoach = existingClient.primary_coach_id === user.id;
        if (!isSysadmin && !isPrimaryCoach) {
          throw new Error("Forbidden");
        }

        const resolvedLinkedUserId =
          payload.linked_user_id !== undefined
            ? payload.linked_user_id
            : existingClient.linked_user_id ?? null;

        const { data, error } = await supabase
          .from("clients")
          .update({
            ...normalized,
            linked_user_id: resolvedLinkedUserId,
            // Keep ownership immutable after creation.
            primary_coach_id: undefined,
            created_by_user_id: undefined,
          })
          .eq("id", payload.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        clientId = data.id;
      } else {
        const { error: profileEnsureError } = await supabase
          .from("profiles")
          .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
        if (profileEnsureError) throw new Error(profileEnsureError.message);

        let resolvedLinkedUserId: string | null;
        if (payload.linked_user_id !== undefined) {
          resolvedLinkedUserId = payload.linked_user_id;
        } else {
          const { data: linkedClient, error: linkedClientError } = await supabase
            .from("clients")
            .select("id")
            .eq("linked_user_id", user.id)
            .limit(1)
            .maybeSingle();
          if (linkedClientError) throw new Error(linkedClientError.message);
          resolvedLinkedUserId = linkedClient ? null : user.id;
        }

        const insertPayload: ClientInsert = {
          primary_coach_id: user.id,
          created_by_user_id: user.id,
          first_name: payload.first_name,
          last_name: payload.last_name || null,
          display_name: payload.display_name || null,
          email: payload.email || null,
          phone: payload.phone || null,
          date_of_birth: payload.date_of_birth || null,
          status: payload.status,
          // Keep one-to-one mapping: auto-link to creator only when the creator
          // profile is not already linked to another client.
          linked_user_id: resolvedLinkedUserId,
          goals: payload.goals || null,
          notes: payload.notes || null,
          medical_flags: payload.medical_flags || null,
        };

        const { data, error } = await supabase
          .from("clients")
          .insert(insertPayload)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        clientId = data.id;
      }

      revalidateCoachPaths(clientId || undefined);
      return { success: true, id: clientId };
    },
  });
}

export async function removeClientAction(input: z.input<typeof removeClientSchema>) {
  const payload = removeClientSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.remove",
    payload: { client_id: payload.client_id },
    action: async () => {
      const { supabase, user } = await requireActor();

      const [{ data: clientRow, error: clientError }, { data: roleRow, error: roleError }] =
        await Promise.all([
          supabase
            .from("clients")
            .select("id, primary_coach_id, display_name, first_name, last_name")
            .eq("id", payload.client_id)
            .maybeSingle(),
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        ]);

      if (clientError) throw new Error(clientError.message);
      if (roleError) throw new Error(roleError.message);
      if (!clientRow) throw new Error("Client not found.");

      const isSysadmin = roleRow?.role === "sysadmin";
      const isPrimaryCoach = clientRow.primary_coach_id === user.id;
      if (!isSysadmin && !isPrimaryCoach) {
        throw new Error("Forbidden");
      }

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          status: "archived",
          is_archived: true,
        })
        .eq("id", payload.client_id);
      if (updateError) throw new Error(updateError.message);

      revalidateCoachPaths(payload.client_id);
      return {
        success: true,
        id: payload.client_id,
        client_name:
          clientRow.display_name || `${clientRow.first_name} ${clientRow.last_name || ""}`.trim() || "client",
      };
    },
    getSuccessPayload: (result) => ({
      client_id: result.id,
      client_name: result.client_name,
    }),
  });
}

export async function listClientDetailAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.detail.read",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      const { data: client, error: clientError } = await supabase.from("clients").select("*").eq("id", clientId).single();

      if (clientError) throw new Error(clientError.message);

      return {
        client: client as ClientRow,
      };
    },
  });
}

export async function listClientGoalsAction(input: z.input<typeof listClientGoalsSchema>): Promise<ClientGoalsPayload> {
  const payload = listClientGoalsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.goals.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const client = await resolveClientGoalSubject(supabase, payload.client_id, user.id);

      if (!client.linked_user_id) {
        return {
          linked_user_id: null,
          categories: [],
          goals: [],
        };
      }
      const goalRows = await queryGoalsWithFallback({
        supabase,
        userId: client.linked_user_id,
        status: payload.status,
        limit: payload.limit,
        personalGoalFilter: false,
        fallbackMode: "none",
      });

      return buildGoalsPayload({
        supabase,
        rows: goalRows,
        mappedClientId: payload.client_id,
        linkedUserId: client.linked_user_id,
      });
    },
  });
}

export async function createClientGoalAction(input: z.input<typeof createGoalSchema>): Promise<ClientGoalItem> {
  const payload = createGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.goal.create",
    payload: {
      client_id: payload.client_id,
      goal_title: payload.goal,
      category: normalizeGoalCategory(payload.category),
      status: payload.status,
      target_date: payload.target_date || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const client = await resolveClientGoalSubject(supabase, payload.client_id, user.id);
      if (!client.linked_user_id) {
        throw new Error("Link this client to a user account before creating measurable goals.");
      }

      const normalizedCategory = normalizeGoalCategory(payload.category);
      const isWeightCategory = isWeightGoalCategory(normalizedCategory);
      const resolvedCurrentValue =
        payload.current_value ?? payload.start_value ?? payload.current_weight ?? payload.start_weight ?? null;
      const resolvedStartValue = payload.start_value ?? resolvedCurrentValue;
      const resolvedTargetValue = payload.target_value ?? payload.target_weight ?? null;
      const resolvedCurrentWeight = isWeightCategory ? resolvedCurrentValue : payload.current_weight ?? payload.start_weight ?? null;
      const resolvedStartWeight = isWeightCategory ? resolvedStartValue : payload.start_weight ?? resolvedCurrentWeight;
      const resolvedTargetWeight = isWeightCategory ? resolvedTargetValue : payload.target_weight ?? null;

      const insertPayload: GoalInsert = {
        user_id: client.linked_user_id,
        assigned_by_id: user.id,
        goal_type: normalizedCategory,
        custom_description: payload.goal,
        start_value: resolvedStartValue,
        current_value: resolvedCurrentValue,
        target_value: resolvedTargetValue,
        start_weight: resolvedStartWeight,
        current_weight: resolvedCurrentWeight,
        target_weight: resolvedTargetWeight,
        unit: payload.unit || (isWeightCategory ? "kg" : null),
        status: payload.status,
        start_date: payload.start_date || new Date().toISOString().slice(0, 10),
        target_date: payload.target_date || null,
        notes: payload.notes || null,
        priority: payload.priority,
        goal_direction: payload.goal_direction,
        check_in_interval_days: payload.check_in_interval_days ?? null,
        linked_exercise_id: payload.linked_exercise_id ?? null,
        linked_program_id: payload.linked_program_id ?? null,
      };

      const goalRow = await insertGoalWithFallback({
        supabase,
        row: insertPayload,
        retryOnRls: true,
      });
      await writeGoalProgressSnapshot({
        supabase,
        goal: goalRow,
        actorId: user.id,
      });
      const historyByGoal = await listGoalHistoryByGoalIds(supabase, [goalRow.id], 2);
      const linkNames = await listGoalLinkNamesById(supabase, [goalRow]);

      revalidateCoachPaths(payload.client_id);
      return mapGoalRowToClientItem({
        row: goalRow,
        clientId: payload.client_id,
        historyRows: historyByGoal.get(goalRow.id) || [],
        linkedExerciseName: goalRow.linked_exercise_id ? linkNames.exerciseNamesById.get(goalRow.linked_exercise_id) || null : null,
        linkedProgramName: goalRow.linked_program_id ? linkNames.programNamesById.get(goalRow.linked_program_id) || null : null,
      });
    },
  });
}

export async function updateClientGoalAction(input: z.input<typeof updateGoalSchema>): Promise<ClientGoalItem> {
  const payload = updateGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.goal.update",
    payload: {
      client_id: payload.client_id,
      goal_id: payload.goal_id,
      goal_title: payload.goal || null,
      status: payload.status || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const client = await resolveClientGoalSubject(supabase, payload.client_id, user.id);
      if (!client.linked_user_id) {
        throw new Error("Link this client to a user account before updating goals.");
      }

      const { data: existing, error: existingError } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("id", payload.goal_id)
        .eq("user_id", client.linked_user_id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (!existing) throw new Error("Goal not found.");

      const nextCategory = payload.category !== undefined ? normalizeGoalCategory(payload.category) : normalizeGoalCategory(existing.goal_type || "custom");
      const shouldMirrorToWeight = isWeightGoalCategory(nextCategory);
      const updates: GoalUpdate = {};
      if (payload.goal !== undefined) updates.custom_description = payload.goal;
      if (payload.category !== undefined) updates.goal_type = nextCategory;
      if (payload.start_value !== undefined) {
        updates.start_value = payload.start_value;
        if (shouldMirrorToWeight && payload.start_weight === undefined) updates.start_weight = payload.start_value;
      }
      if (payload.current_value !== undefined) {
        updates.current_value = payload.current_value;
        if (shouldMirrorToWeight && payload.current_weight === undefined) updates.current_weight = payload.current_value;
      }
      if (payload.target_value !== undefined) {
        updates.target_value = payload.target_value;
        if (shouldMirrorToWeight && payload.target_weight === undefined) updates.target_weight = payload.target_value;
      }
      if (payload.start_weight !== undefined) updates.start_weight = payload.start_weight;
      if (payload.current_weight !== undefined) updates.current_weight = payload.current_weight;
      if (payload.target_weight !== undefined) updates.target_weight = payload.target_weight;
      if (payload.category !== undefined && shouldMirrorToWeight && payload.unit === undefined && !existing.unit) {
        updates.unit = "kg";
      }
      if (payload.unit !== undefined) updates.unit = payload.unit;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.start_date !== undefined) updates.start_date = payload.start_date;
      if (payload.target_date !== undefined) updates.target_date = payload.target_date;
      if (payload.notes !== undefined) updates.notes = payload.notes;
      if (payload.priority !== undefined) updates.priority = payload.priority;
      if (payload.goal_direction !== undefined) updates.goal_direction = payload.goal_direction;
      if (payload.check_in_interval_days !== undefined) updates.check_in_interval_days = payload.check_in_interval_days;
      if (payload.linked_exercise_id !== undefined) updates.linked_exercise_id = payload.linked_exercise_id;
      if (payload.linked_program_id !== undefined) updates.linked_program_id = payload.linked_program_id;

      const goalRow = await updateGoalWithFallback({
        supabase,
        goalId: payload.goal_id,
        userId: client.linked_user_id,
        existing: existing as GoalRow,
        updates,
      });
      await writeGoalProgressSnapshot({
        supabase,
        goal: goalRow,
        actorId: user.id,
      });
      const historyByGoal = await listGoalHistoryByGoalIds(supabase, [goalRow.id], 2);
      const linkNames = await listGoalLinkNamesById(supabase, [goalRow]);

      revalidateCoachPaths(payload.client_id);
      return mapGoalRowToClientItem({
        row: goalRow,
        clientId: payload.client_id,
        historyRows: historyByGoal.get(goalRow.id) || [],
        linkedExerciseName: goalRow.linked_exercise_id ? linkNames.exerciseNamesById.get(goalRow.linked_exercise_id) || null : null,
        linkedProgramName: goalRow.linked_program_id ? linkNames.programNamesById.get(goalRow.linked_program_id) || null : null,
      });
    },
  });
}

export async function updateClientGoalStatusAction(input: z.input<typeof updateGoalStatusSchema>) {
  const payload = updateGoalStatusSchema.parse(input);
  return updateClientGoalAction({
    client_id: payload.client_id,
    goal_id: payload.goal_id,
    status: payload.status,
  });
}

export async function deleteClientGoalAction(input: z.input<typeof deleteGoalSchema>) {
  const payload = deleteGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.goal.delete",
    payload: {
      client_id: payload.client_id,
      goal_id: payload.goal_id,
      goal_title: payload.goal_title || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const client = await resolveClientGoalSubject(supabase, payload.client_id, user.id);
      if (!client.linked_user_id) {
        throw new Error("Link this client to a user account before deleting goals.");
      }

      const { data: existingGoal, error: existingGoalError } = await supabase
        .from("fitness_goals")
        .select("id")
        .eq("id", payload.goal_id)
        .eq("user_id", client.linked_user_id)
        .maybeSingle();
      if (existingGoalError) throw new Error(existingGoalError.message);
      if (!existingGoal) throw new Error("Goal not found.");

      const { error: deleteError } = await supabase
        .from("fitness_goals")
        .delete()
        .eq("id", payload.goal_id)
        .eq("user_id", client.linked_user_id);
      if (deleteError) throw new Error(deleteError.message);

      revalidateCoachPaths(payload.client_id);
      return {
        client_id: payload.client_id,
        goal_id: payload.goal_id,
      };
    },
  });
}

export async function listMyGoalsAction(
  input?: z.input<typeof listMyGoalsSchema>
): Promise<ClientGoalsPayload> {
  const payload = listMyGoalsSchema.parse(input ?? {});
  return runTrackedAction({
    eventName: "goal.self.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const goalRows = await queryGoalsWithFallback({
        supabase,
        userId: user.id,
        status: payload.status,
        limit: payload.limit,
        personalGoalFilter: true,
        fallbackMode: "assigned_by_self",
      });

      return buildGoalsPayload({
        supabase,
        rows: goalRows,
        mappedClientId: user.id,
        linkedUserId: user.id,
      });
    },
  });
}

export async function createMyGoalAction(input: z.input<typeof createMyGoalSchema>): Promise<ClientGoalItem> {
  const payload = createMyGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "goal.self.create",
    payload: {
      goal_title: payload.goal,
      category: normalizeGoalCategory(payload.category),
      status: payload.status,
      target_date: payload.target_date || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const normalizedCategory = normalizeGoalCategory(payload.category);
      const isWeightCategory = isWeightGoalCategory(normalizedCategory);
      const resolvedCurrentValue =
        payload.current_value ?? payload.start_value ?? payload.current_weight ?? payload.start_weight ?? null;
      const resolvedStartValue = payload.start_value ?? resolvedCurrentValue;
      const resolvedTargetValue = payload.target_value ?? payload.target_weight ?? null;
      const resolvedCurrentWeight = isWeightCategory ? resolvedCurrentValue : payload.current_weight ?? payload.start_weight ?? null;
      const resolvedStartWeight = isWeightCategory ? resolvedStartValue : payload.start_weight ?? resolvedCurrentWeight;
      const resolvedTargetWeight = isWeightCategory ? resolvedTargetValue : payload.target_weight ?? null;

      const insertPayload: GoalInsert = {
        user_id: user.id,
        assigned_by_id: user.id,
        is_personal_goal: true,
        goal_type: normalizedCategory,
        custom_description: payload.goal,
        start_value: resolvedStartValue,
        current_value: resolvedCurrentValue,
        target_value: resolvedTargetValue,
        start_weight: resolvedStartWeight,
        current_weight: resolvedCurrentWeight,
        target_weight: resolvedTargetWeight,
        unit: payload.unit || (isWeightCategory ? "kg" : null),
        status: payload.status,
        start_date: payload.start_date || new Date().toISOString().slice(0, 10),
        target_date: payload.target_date || null,
        notes: payload.notes || null,
        priority: payload.priority,
        goal_direction: payload.goal_direction,
        check_in_interval_days: payload.check_in_interval_days ?? null,
        linked_exercise_id: payload.linked_exercise_id ?? null,
        linked_program_id: payload.linked_program_id ?? null,
      };

      const goalRow = await insertGoalWithFallback({
        supabase,
        row: insertPayload,
      });
      await writeGoalProgressSnapshot({
        supabase,
        goal: goalRow,
        actorId: user.id,
      });
      const historyByGoal = await listGoalHistoryByGoalIds(supabase, [goalRow.id], 2);
      const linkNames = await listGoalLinkNamesById(supabase, [goalRow]);

      revalidatePersonalGoalPaths();

      return mapGoalRowToClientItem({
        row: goalRow,
        clientId: user.id,
        historyRows: historyByGoal.get(goalRow.id) || [],
        linkedExerciseName: goalRow.linked_exercise_id ? linkNames.exerciseNamesById.get(goalRow.linked_exercise_id) || null : null,
        linkedProgramName: goalRow.linked_program_id ? linkNames.programNamesById.get(goalRow.linked_program_id) || null : null,
      });
    },
  });
}

export async function updateMyGoalAction(input: z.input<typeof updateMyGoalSchema>): Promise<ClientGoalItem> {
  const payload = updateMyGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "goal.self.update",
    payload: {
      goal_id: payload.goal_id,
      goal_title: payload.goal || null,
      status: payload.status || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const { data: existing, error: existingError } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("id", payload.goal_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (!existing) throw new Error("Goal not found.");

      const nextCategory =
        payload.category !== undefined
          ? normalizeGoalCategory(payload.category)
          : normalizeGoalCategory(existing.goal_type || "custom");
      const shouldMirrorToWeight = isWeightGoalCategory(nextCategory);
      const updates: GoalUpdate = {};
      if (payload.goal !== undefined) updates.custom_description = payload.goal;
      if (payload.category !== undefined) updates.goal_type = nextCategory;
      if (payload.start_value !== undefined) {
        updates.start_value = payload.start_value;
        if (shouldMirrorToWeight && payload.start_weight === undefined) updates.start_weight = payload.start_value;
      }
      if (payload.current_value !== undefined) {
        updates.current_value = payload.current_value;
        if (shouldMirrorToWeight && payload.current_weight === undefined) updates.current_weight = payload.current_value;
      }
      if (payload.target_value !== undefined) {
        updates.target_value = payload.target_value;
        if (shouldMirrorToWeight && payload.target_weight === undefined) updates.target_weight = payload.target_value;
      }
      if (payload.start_weight !== undefined) updates.start_weight = payload.start_weight;
      if (payload.current_weight !== undefined) updates.current_weight = payload.current_weight;
      if (payload.target_weight !== undefined) updates.target_weight = payload.target_weight;
      if (payload.category !== undefined && shouldMirrorToWeight && payload.unit === undefined && !existing.unit) {
        updates.unit = "kg";
      }
      if (payload.unit !== undefined) updates.unit = payload.unit;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.start_date !== undefined) updates.start_date = payload.start_date;
      if (payload.target_date !== undefined) updates.target_date = payload.target_date;
      if (payload.notes !== undefined) updates.notes = payload.notes;
      if (payload.priority !== undefined) updates.priority = payload.priority;
      if (payload.goal_direction !== undefined) updates.goal_direction = payload.goal_direction;
      if (payload.check_in_interval_days !== undefined) updates.check_in_interval_days = payload.check_in_interval_days;
      if (payload.linked_exercise_id !== undefined) updates.linked_exercise_id = payload.linked_exercise_id;
      if (payload.linked_program_id !== undefined) updates.linked_program_id = payload.linked_program_id;

      const goalRow = await updateGoalWithFallback({
        supabase,
        goalId: payload.goal_id,
        userId: user.id,
        existing: existing as GoalRow,
        updates,
      });
      await writeGoalProgressSnapshot({
        supabase,
        goal: goalRow,
        actorId: user.id,
      });
      const historyByGoal = await listGoalHistoryByGoalIds(supabase, [goalRow.id], 2);
      const linkNames = await listGoalLinkNamesById(supabase, [goalRow]);

      revalidatePersonalGoalPaths();

      return mapGoalRowToClientItem({
        row: goalRow,
        clientId: user.id,
        historyRows: historyByGoal.get(goalRow.id) || [],
        linkedExerciseName: goalRow.linked_exercise_id ? linkNames.exerciseNamesById.get(goalRow.linked_exercise_id) || null : null,
        linkedProgramName: goalRow.linked_program_id ? linkNames.programNamesById.get(goalRow.linked_program_id) || null : null,
      });
    },
  });
}

export async function updateMyGoalStatusAction(input: z.input<typeof updateMyGoalStatusSchema>) {
  const payload = updateMyGoalStatusSchema.parse(input);
  return updateMyGoalAction({
    goal_id: payload.goal_id,
    status: payload.status,
  });
}

export async function deleteMyGoalAction(input: z.input<typeof deleteMyGoalSchema>) {
  const payload = deleteMyGoalSchema.parse(input);
  return runTrackedAction({
    eventName: "goal.self.delete",
    payload: {
      goal_id: payload.goal_id,
      goal_title: payload.goal_title || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const { data: existingGoal, error: existingGoalError } = await supabase
        .from("fitness_goals")
        .select("id")
        .eq("id", payload.goal_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingGoalError) throw new Error(existingGoalError.message);
      if (!existingGoal) throw new Error("Goal not found.");

      const { error: deleteError } = await supabase
        .from("fitness_goals")
        .delete()
        .eq("id", payload.goal_id)
        .eq("user_id", user.id);
      if (deleteError) throw new Error(deleteError.message);

      revalidatePersonalGoalPaths();

      return {
        goal_id: payload.goal_id,
      };
    },
  });
}

export async function listCoachPlanTemplatesAction() {
  return runTrackedAction({
    eventName: "coach.plan_templates.list",
    action: async () => {
      const { supabase } = await requireActor();
      const { data: templates, error: templatesError } = await supabase
        .from("coach_plan_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (templatesError) throw new Error(templatesError.message);

      const templateIds = (templates || []).map((row) => row.id);
      if (templateIds.length === 0) {
        return [] as Array<{ template: TemplateRow; sessions: TemplateSessionRow[] }>;
      }

      const sessions: TemplateSessionRow[] = [];
      for (const templateIdChunk of chunkArray(templateIds, 20)) {
        const { data: sessionsChunk, error: sessionsError } = await supabase
          .from("coach_plan_template_sessions")
          .select("*")
          .in("template_id", templateIdChunk)
          .order("sequence_no", { ascending: true });
        if (sessionsError) throw new Error(sessionsError.message);
        sessions.push(...((sessionsChunk || []) as TemplateSessionRow[]));
      }

      const sessionMap = new Map<string, TemplateSessionRow[]>();
      for (const row of sessions) {
        const existing = sessionMap.get(row.template_id) || [];
        existing.push(row);
        sessionMap.set(row.template_id, existing);
      }

      return (templates || []).map((template) => ({
        template: template as TemplateRow,
        sessions: sessionMap.get(template.id) || [],
      }));
    },
  });
}

export async function createCoachPlanTemplateAction(input: z.input<typeof createTemplateSchema>) {
  const payload = createTemplateSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.plan_template.create",
    payload: { session_count: payload.sessions.length },
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data: template, error: templateError } = await supabase
        .from("coach_plan_templates")
        .insert({
          coach_id: user.id,
          name: payload.name,
          description: payload.description || null,
          tags: payload.tags || null,
        })
        .select("*")
        .single();
      if (templateError) throw new Error(templateError.message);

      const sessionRows: Database["public"]["Tables"]["coach_plan_template_sessions"]["Insert"][] = payload.sessions.map(
        (session, index) => ({
          template_id: template.id,
          sequence_no: index + 1,
          title: session.title,
          session_type: session.session_type,
          notes: session.notes || null,
          default_slot: session.default_slot,
          estimated_duration_minutes: session.estimated_duration_minutes || null,
          metadata: (session.metadata || {}) as Json,
        })
      );
      const { error: sessionError } = await supabase.from("coach_plan_template_sessions").insert(sessionRows);
      if (sessionError) throw new Error(sessionError.message);

      revalidateCoachPaths();
      return template as TemplateRow;
    },
  });
}

export async function assignTemplateToClientAction(input: z.input<typeof assignTemplateSchema>) {
  const payload = assignTemplateSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.plan.assign",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();

      const [{ data: template, error: templateError }, { data: existingActiveAssignment, error: existingActiveAssignmentError }] =
        await Promise.all([
          supabase.from("coach_plan_templates").select("*").eq("id", payload.template_id).single(),
          supabase.from("client_plan_assignments").select("id, client_id").eq("template_id", payload.template_id).eq("status", "active").limit(1).maybeSingle(),
        ]);
      if (templateError) throw new Error(templateError.message);
      if (existingActiveAssignmentError) throw new Error(existingActiveAssignmentError.message);
      if (existingActiveAssignment) {
        if (existingActiveAssignment.client_id === payload.client_id) {
          throw new Error("This workout program is already assigned to this client.");
        }
        throw new Error("This workout program is already assigned to another client. Archive or complete it before reassigning.");
      }

      const { data: templateSessions, error: templateSessionsError } = await supabase
        .from("coach_plan_template_sessions")
        .select("*")
        .eq("template_id", payload.template_id)
        .order("sequence_no", { ascending: true });
      if (templateSessionsError) throw new Error(templateSessionsError.message);

      const { data: assignment, error: assignmentError } = await supabase
        .from("client_plan_assignments")
        .insert({
          client_id: payload.client_id,
          template_id: payload.template_id,
          coach_id: user.id,
          name: payload.name || template.name,
          notes: payload.notes || null,
          status: "active",
          started_on: new Date().toISOString().slice(0, 10),
        })
        .select("*")
        .single();
      if (assignmentError) {
        if ((assignmentError as { code?: string }).code === "23505") {
          throw new Error("This workout program is already assigned. Archive or complete it before reassigning.");
        }
        throw new Error(assignmentError.message);
      }

      const snapshotRows: Database["public"]["Tables"]["client_plan_assignment_sessions"]["Insert"][] =
        ((templateSessions || []) as TemplateSessionRow[]).map((session) => ({
          assignment_id: assignment.id,
          template_session_id: session.id,
          sequence_no: session.sequence_no,
          title: session.title,
          session_type: session.session_type,
          notes: session.notes,
          default_slot: session.default_slot,
          estimated_duration_minutes: session.estimated_duration_minutes,
          metadata: session.metadata,
        }));
      if (snapshotRows.length > 0) {
        const { error: snapshotError } = await supabase
          .from("client_plan_assignment_sessions")
          .insert(snapshotRows);
        if (snapshotError) throw new Error(snapshotError.message);
      }

      revalidateCoachPaths(payload.client_id);
      return assignment as AssignmentRow;
    },
  });
}

export async function listClientAssignmentsAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.assignments.list",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();

      const { data: assignments, error: assignmentsError } = await supabase
        .from("client_plan_assignments")
        .select("*")
        .eq("client_id", clientId)
        .order("assigned_at", { ascending: false });
      if (assignmentsError) throw new Error(assignmentsError.message);

      const assignmentIds = (assignments || []).map((item) => item.id);
      const sessionsByAssignment = await listAssignmentSessionsByAssignmentIds(supabase, assignmentIds);

      return (assignments || []).map((assignment) => ({
        assignment: assignment as AssignmentRow,
        sessions: sessionsByAssignment.get(assignment.id) || [],
      }));
    },
  });
}

export async function getClientNextSessionAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.next_session",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      const { data: assignment, error: assignmentError } = await supabase
        .from("client_plan_assignments")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);
      if (!assignment) return null;

      const sessionsByAssignment = await listAssignmentSessionsByAssignmentIds(supabase, [assignment.id]);
      const sessions = sessionsByAssignment.get(assignment.id) || [];

      const nextSession =
        sessions.find((session) => !session.completed_at && !session.is_skipped) || null;

      return {
        assignment: assignment as AssignmentRow,
        next_session: nextSession,
      };
    },
  });
}

export async function logClientWorkoutAction(input: z.input<typeof logWorkoutSchema>) {
  const payload = logWorkoutSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.workout.log",
    payload: {
      client_id: payload.client_id,
      session_name: payload.name,
      has_strength_sets: Boolean(payload.strength_sets?.length),
      has_cardio_sessions: Boolean(payload.cardio_sessions?.length),
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, linked_user_id")
        .eq("id", payload.client_id)
        .maybeSingle();
      if (clientError) throw new Error(clientError.message);
      if (!client) throw new Error("Client not found.");

      const workoutPayload: WorkoutInsert = {
        user_id: user.id,
        created_by_user_id: user.id,
        subject_client_id: payload.client_id,
        subject_user_id: client.linked_user_id ?? null,
        name: payload.name,
        performed_on: payload.performed_on,
        date: payload.started_at || `${payload.performed_on}T00:00:00.000Z`,
        started_at: payload.started_at || null,
        completed_at: payload.completed_at || null,
        session_slot: payload.session_slot,
        session_label: payload.session_label || null,
        location_type: payload.location_type || null,
        location_label: payload.location_label || null,
        location_address: payload.location_address || null,
        location_notes: payload.location_notes || null,
        status: payload.status,
        notes: payload.notes || null,
        plan_assignment_id: payload.plan_assignment_id || null,
        plan_session_id: payload.plan_session_id || null,
      };

      const { data: workout, error: workoutError } = await supabase
        .from("training_sessions")
        .insert(workoutPayload)
        .select("*")
        .single();
      if (workoutError) throw new Error(workoutError.message);

      const strengthRows: StrengthSetInsert[] = (payload.strength_sets || []).map((set, index) => ({
        workout_id: workout.id,
        exercise_name: set.exercise_name,
        set_number: set.set_number,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        rest_seconds: set.rest_seconds ?? null,
        notes: set.notes || null,
        entry_sequence: set.entry_sequence ?? index,
      }));
      const cardioRows: CardioSessionInsert[] = (payload.cardio_sessions || []).map((cardio, index) => ({
        workout_id: workout.id,
        user_id: user.id,
        date: payload.performed_on,
        activity_type: cardio.activity_type,
        duration_minutes: cardio.duration_minutes,
        distance_km: cardio.distance_km ?? null,
        calories_burned: cardio.calories_burned ?? null,
        average_heart_rate: cardio.average_heart_rate ?? null,
        reps: cardio.reps ?? null,
        notes: cardio.notes || null,
        entry_sequence: cardio.entry_sequence ?? index,
      }));
      await insertWorkoutExerciseRows({
        supabase,
        strengthRows,
        cardioRows,
      });

      if (payload.mark_plan_session_resolved && payload.plan_session_id) {
        const { error: resolveError } = await supabase
          .from("client_plan_assignment_sessions")
          .update({ completed_at: payload.completed_at || new Date().toISOString() })
          .eq("id", payload.plan_session_id);
        if (resolveError) throw new Error(resolveError.message);
      }

      emitTrainingWorkoutCompleted({
        workoutId: workout.id,
        userId: user.id,
        subjectUserId: workout.subject_user_id ?? null,
        subjectClientId: workout.subject_client_id ?? null,
      });

      revalidateCoachPaths(payload.client_id);
      revalidateTrainingWorkoutPaths({});
      return workout;
    },
  });
}

export async function listClientTodaySessionsAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.sessions.today",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      const todayIso = new Date().toISOString().slice(0, 10);
      return fetchClientSessionsByPerformedRange({
        supabase,
        clientId,
        startDate: todayIso,
        endDate: todayIso,
        includePerformedOnSort: false,
      });
    },
  });
}

export async function listClientSessionsByRangeAction(input: z.input<typeof listSessionsByRangeSchema>) {
  const payload = listSessionsByRangeSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.sessions.range",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      return fetchClientSessionsByPerformedRange({
        supabase,
        clientId: payload.client_id,
        startDate: payload.start_date,
        endDate: payload.end_date,
        includePerformedOnSort: true,
      });
    },
  });
}

export async function createClientCheckinAction(input: z.input<typeof createCheckinSchema>) {
  const payload = createCheckinSchema.parse(input);
  assertCheckinSubjectTarget({
    subjectClientId: payload.subject_client_id,
    subjectUserId: payload.subject_user_id,
  });

  return runTrackedAction({
    eventName: "coach.client.checkin.create",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const data = await insertClientCheckinRow({
        supabase,
        payload: buildCheckinInsertPayload({
          payload,
          actorUserId: user.id,
        }),
      });
      emitCheckinSubmitted({
        checkinId: data.id,
        createdByUserId: user.id,
        subjectClientId: payload.subject_client_id ?? null,
        subjectUserId: payload.subject_user_id ?? null,
      });

      revalidateCoachPaths(payload.subject_client_id || undefined);
      return data;
    },
  });
}

export async function updateClientCheckinAction(input: z.input<typeof updateCheckinSchema>) {
  const payload = updateCheckinSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.checkin.update",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const data = await updateClientCheckinRow({
        supabase,
        checkinId: payload.id,
        updates: buildCheckinUpdatePayload(payload),
      });
      revalidateCoachPaths(data.subject_client_id || undefined);
      return data;
    },
  });
}

export async function listClientCheckinsAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.checkins.list",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      return fetchClientCheckinsByClientId({
        supabase,
        clientId,
      });
    },
  });
}

export async function createCoachNoteAction(input: z.input<typeof createNoteSchema>) {
  const payload = createNoteSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.note.create",
    payload: {
      client_id: payload.client_id,
      tag: normalizeCoachNoteTag(payload.tag),
      title: payload.title || null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const data = await insertCoachNoteRow({
        supabase,
        payload: buildCoachNoteInsertPayload({
          payload,
          actorUserId: user.id,
        }),
      });
      revalidateCoachPaths(payload.client_id);
      return data;
    },
  });
}

export async function updateCoachNoteAction(input: z.input<typeof updateNoteSchema>) {
  const payload = updateNoteSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.note.update",
    payload: {
      note_id: payload.note_id,
      client_id: payload.client_id,
      tag: payload.tag ? normalizeCoachNoteTag(payload.tag) : null,
    },
    action: async () => {
      const { supabase } = await requireActor();
      const data = await updateCoachNoteRow({
        supabase,
        noteId: payload.note_id,
        clientId: payload.client_id,
        updates: buildCoachNoteUpdatePayload(payload),
      });
      revalidateCoachPaths(payload.client_id);
      return data;
    },
  });
}

async function listCoachNotesAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.notes.list",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      return fetchCoachNotesByClientId({
        supabase,
        clientId,
      });
    },
  });
}

// Backward-compatible alias used by existing hooks/components.
export async function listClientNotesAction(clientId: string) {
  return listCoachNotesAction(clientId);
}

export async function recordClientPaymentAction(input: z.input<typeof recordPaymentSchema>) {
  const payload = recordPaymentSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment.record",
    payload: {
      client_id: payload.client_id,
      amount: payload.amount,
      currency: payload.currency.toUpperCase(),
      status: payload.status,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const data = await insertClientPaymentRow({
        supabase,
        payload: buildClientPaymentInsertPayload({
          payload,
          actorUserId: user.id,
        }),
      });
      revalidateCoachClientFromPayment(data);
      return data;
    },
  });
}

export async function deleteClientPaymentAction(input: z.input<typeof deletePaymentSchema>) {
  const payload = deletePaymentSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment.delete",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const data = await deleteClientPaymentRow({
        supabase,
        paymentId: payload.id,
      });
      revalidateCoachClientFromPayment(data);
      return { success: true };
    },
  });
}

export async function updateClientPaymentStatusAction(input: z.input<typeof updatePaymentStatusSchema>) {
  const payload = updatePaymentStatusSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment.status.update",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const data = await updateClientPaymentRow({
        supabase,
        paymentId: payload.id,
        changes: { status: payload.status },
      });
      revalidateCoachClientFromPayment(data);
      return { success: true };
    },
  });
}

export async function updateClientPaymentDetailsAction(input: z.input<typeof updatePaymentDetailsSchema>) {
  const payload = updatePaymentDetailsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment.update",
    payload: { id: payload.id },
    action: async () => {
      const { supabase } = await requireActor();
      const data = await updateClientPaymentRow({
        supabase,
        paymentId: payload.id,
        changes: buildClientPaymentDetailsUpdatePayload(payload),
      });
      revalidateCoachClientFromPayment(data);
      return { success: true };
    },
  });
}

function sessionDateBoundary() {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  return {
    todayIso,
    minSessionDateIso: sevenDaysAgo.toISOString().slice(0, 10),
  };
}

function startOfWeekIso(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

function startOfMonthIso(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return utc.toISOString().slice(0, 10);
}

function billingPlanWithRemaining(plan: BillingPlanRow): ClientBillingPlanWithRemaining {
  return {
    ...plan,
    sessions_remaining: Math.max(0, (plan.sessions_purchased || 0) - (plan.sessions_used || 0)),
  };
}

function assertProgramDates(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return;
  if (endDate <= startDate) {
    throw new Error("Program end date must be after program start date.");
  }
}

function validateBillingPlanByType(input: {
  billing_type: BillingType;
  sessions_purchased: number;
  monthly_amount: number | null;
  billing_cycle_day: number | null;
  program_start_date: string | null;
  program_end_date: string | null;
}) {
  if (input.billing_type === "session_package" || input.billing_type === "program") {
    if (input.sessions_purchased <= 0) {
      throw new Error("Sessions purchased must be greater than 0 for package or program billing.");
    }
  }
  if (input.billing_type === "monthly") {
    if (!input.monthly_amount || input.monthly_amount <= 0) {
      throw new Error("Monthly amount is required for monthly billing.");
    }
    if (!input.billing_cycle_day) {
      throw new Error("Billing cycle day is required for monthly billing.");
    }
  }
  if (input.billing_type === "program") {
    assertProgramDates(input.program_start_date, input.program_end_date);
  }
}

async function getBillingPlanByIdForCoach(
  supabase: DbClient,
  coachId: string,
  billingPlanId: string
): Promise<BillingPlanRow> {
  const { data, error } = await supabase
    .from("client_billing_plans")
    .select("*")
    .eq("id", billingPlanId)
    .eq("coach_id", coachId)
    .single();
  if (error) throw new Error(normalizeBillingTablesError(error.message));
  return data as BillingPlanRow;
}

async function getActiveBillingPlanForClient(input: {
  supabase: DbClient;
  coachId: string;
  clientId: string;
  allowMissingTableFallback?: boolean;
}): Promise<BillingPlanRow | null> {
  const { data, error } = await input.supabase
    .from("client_billing_plans")
    .select("*")
    .eq("client_id", input.clientId)
    .eq("coach_id", input.coachId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    if (input.allowMissingTableFallback && isClientBillingPlansTableMissing(error.message)) {
      return null;
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return data ? (data as BillingPlanRow) : null;
}

async function listBillingPlansForClient(input: {
  supabase: DbClient;
  coachId: string;
  clientId: string;
  allowMissingTableFallback?: boolean;
}): Promise<BillingPlanRow[]> {
  const { data, error } = await input.supabase
    .from("client_billing_plans")
    .select("*")
    .eq("client_id", input.clientId)
    .eq("coach_id", input.coachId)
    .order("created_at", { ascending: false });

  if (error) {
    if (input.allowMissingTableFallback && isClientBillingPlansTableMissing(error.message)) {
      return [];
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return (data || []) as BillingPlanRow[];
}

async function listCoachBillingPlans(input: {
  supabase: DbClient;
  coachId: string;
  allowMissingTableFallback?: boolean;
}): Promise<{ rows: BillingPlanRow[]; missing: boolean }> {
  const { data, error } = await input.supabase
    .from("client_billing_plans")
    .select("*")
    .eq("coach_id", input.coachId)
    .order("created_at", { ascending: false });

  if (error) {
    if (input.allowMissingTableFallback && isClientBillingPlansTableMissing(error.message)) {
      return { rows: [], missing: true };
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return { rows: (data || []) as BillingPlanRow[], missing: false };
}

async function listCoachPaymentLogsForDate(input: {
  supabase: DbClient;
  coachId: string;
  sessionDate: string;
  allowMissingTableFallback?: boolean;
}): Promise<{ rows: PaymentLogRow[]; missing: boolean }> {
  const { data, error } = await input.supabase
    .from("payment_logs")
    .select("*")
    .eq("coach_id", input.coachId)
    .eq("session_date", input.sessionDate)
    .neq("status", "voided");

  if (error) {
    if (input.allowMissingTableFallback && isPaymentLogsTableMissing(error.message)) {
      return { rows: [], missing: true };
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return { rows: (data || []) as PaymentLogRow[], missing: false };
}

async function countCoachPaymentLogsSince(input: {
  supabase: DbClient;
  coachId: string;
  fromDate?: string;
  clientId?: string;
  allowMissingTableFallback?: boolean;
}): Promise<{ count: number; missing: boolean }> {
  let query = input.supabase
    .from("payment_logs")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", input.coachId)
    .neq("status", "voided");
  if (input.fromDate) query = query.gte("session_date", input.fromDate);
  if (input.clientId) query = query.eq("client_id", input.clientId);
  const { count, error } = await query;

  if (error) {
    if (input.allowMissingTableFallback && isPaymentLogsTableMissing(error.message)) {
      return { count: 0, missing: true };
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return { count: count ?? 0, missing: false };
}

async function listClientPaymentLogAmountsSince(input: {
  supabase: DbClient;
  coachId: string;
  clientId: string;
  fromDate: string;
  allowMissingTableFallback?: boolean;
}): Promise<{ rows: Array<{ amount: number | null; status: string }>; missing: boolean }> {
  const { data, error } = await input.supabase
    .from("payment_logs")
    .select("amount, status, session_date")
    .eq("coach_id", input.coachId)
    .eq("client_id", input.clientId)
    .gte("session_date", input.fromDate)
    .neq("status", "voided");

  if (error) {
    if (input.allowMissingTableFallback && isPaymentLogsTableMissing(error.message)) {
      return { rows: [], missing: true };
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  return { rows: (data || []) as Array<{ amount: number | null; status: string }>, missing: false };
}

async function listClientPaymentLogsPage(input: {
  supabase: DbClient;
  coachId: string;
  clientId: string;
  from: number;
  to: number;
  sortBy: "session_date" | "created_at" | "amount" | "status";
  ascending: boolean;
  dateFrom?: string;
  dateTo?: string;
  status?: "logged" | "confirmed" | "voided" | "all";
  search?: string;
  allowMissingTableFallback?: boolean;
}): Promise<{ rows: PaymentLogRow[]; total: number; missing: boolean }> {
  let query = input.supabase
    .from("payment_logs")
    .select("*", { count: "exact" })
    .eq("client_id", input.clientId)
    .eq("coach_id", input.coachId)
    .neq("status", "voided")
    .order(input.sortBy, { ascending: input.ascending })
    .order("created_at", { ascending: input.ascending })
    .range(input.from, input.to);

  if (input.dateFrom) query = query.gte("session_date", input.dateFrom);
  if (input.dateTo) query = query.lte("session_date", input.dateTo);
  if (input.status && input.status !== "all") query = query.eq("status", input.status);
  if (input.search) {
    const escapedSearch = escapeLikePattern(input.search);
    query = query.ilike("notes", `%${escapedSearch}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    if (input.allowMissingTableFallback && isPaymentLogsTableMissing(error.message)) {
      return { rows: [], total: 0, missing: true };
    }
    throw new Error(normalizeBillingTablesError(error.message));
  }

  const rows = (data || []) as PaymentLogRow[];
  return { rows, total: count ?? rows.length, missing: false };
}

export async function createBillingPlanAction(input: z.input<typeof createBillingPlanSchema>): Promise<ClientBillingPlanWithRemaining> {
  const payload = createBillingPlanSchema.parse(input);
  validateBillingPlanByType({
    billing_type: payload.billing_type,
    sessions_purchased: payload.sessions_purchased,
    monthly_amount: payload.monthly_amount ?? null,
    billing_cycle_day: payload.billing_cycle_day ?? null,
    program_start_date: payload.program_start_date ?? null,
    program_end_date: payload.program_end_date ?? null,
  });

  return runTrackedAction({
    eventName: "coach.client.billing_plan.create",
    payload: {
      client_id: payload.client_id,
      billing_type: payload.billing_type,
      session_rate: payload.session_rate,
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const { error: deactivateError } = await supabase
        .from("client_billing_plans")
        .update({ is_active: false })
        .eq("client_id", payload.client_id)
        .eq("coach_id", user.id)
        .eq("is_active", true);
      if (deactivateError) throw new Error(normalizeBillingTablesError(deactivateError.message));

      const insertPayload: BillingPlanInsert = {
        client_id: payload.client_id,
        coach_id: user.id,
        billing_type: payload.billing_type,
        session_rate: payload.session_rate,
        currency: payload.currency.toUpperCase(),
        payment_method: payload.payment_method,
        sessions_purchased: payload.sessions_purchased,
        sessions_used: 0,
        monthly_amount: payload.monthly_amount ?? null,
        billing_cycle_day: payload.billing_cycle_day ?? null,
        program_start_date: payload.program_start_date ?? null,
        program_end_date: payload.program_end_date ?? null,
        is_active: true,
        notes: payload.notes || null,
      };

      const { data, error } = await supabase
        .from("client_billing_plans")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw new Error(normalizeBillingTablesError(error.message));

      revalidateCoachPaths(payload.client_id);
      return billingPlanWithRemaining(data as BillingPlanRow);
    },
  });
}

export async function updateBillingPlanAction(input: z.input<typeof updateBillingPlanSchema>) {
  const payload = updateBillingPlanSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.billing_plan.update",
    payload: { id: payload.id },
    action: async () => {
      const { supabase, user } = await requireActor();
      const currentPlan = await getBillingPlanByIdForCoach(supabase, user.id, payload.id);

      if (
        payload.sessions_purchased !== undefined &&
        payload.sessions_purchased < Number(currentPlan.sessions_used || 0)
      ) {
        throw new Error("Sessions purchased cannot be lower than sessions already used.");
      }

      const changes: BillingPlanUpdate = {};
      if (payload.session_rate !== undefined) changes.session_rate = payload.session_rate;
      if (payload.sessions_purchased !== undefined) changes.sessions_purchased = payload.sessions_purchased;
      if (payload.monthly_amount !== undefined) changes.monthly_amount = payload.monthly_amount;
      if (payload.billing_cycle_day !== undefined) changes.billing_cycle_day = payload.billing_cycle_day;
      if (payload.payment_method !== undefined) changes.payment_method = payload.payment_method;
      if (payload.notes !== undefined) changes.notes = payload.notes;
      if (payload.is_active !== undefined) changes.is_active = payload.is_active;

      const { data, error } = await supabase
        .from("client_billing_plans")
        .update(changes)
        .eq("id", payload.id)
        .eq("coach_id", user.id)
        .select("client_id")
        .single();
      if (error) throw new Error(normalizeBillingTablesError(error.message));

      revalidateCoachPaths(data.client_id);
      return { success: true };
    },
  });
}

export async function getClientBillingPlanAction(clientId: string): Promise<ClientBillingPlanWithRemaining | null> {
  return runTrackedAction({
    eventName: "coach.client.billing_plan.get",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase, user } = await requireActor();
      const activePlan = await getActiveBillingPlanForClient({
        supabase,
        coachId: user.id,
        clientId,
        allowMissingTableFallback: true,
      });
      if (!activePlan) return null;
      return billingPlanWithRemaining(activePlan);
    },
  });
}

export async function listClientBillingPlanHistoryAction(clientId: string): Promise<ClientBillingPlanWithRemaining[]> {
  return runTrackedAction({
    eventName: "coach.client.billing_plan.history",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase, user } = await requireActor();
      const plans = await listBillingPlansForClient({
        supabase,
        coachId: user.id,
        clientId,
        allowMissingTableFallback: true,
      });
      return plans.map((row) => billingPlanWithRemaining(row));
    },
  });
}

export async function renewPackageAction(input: z.input<typeof renewPackageSchema>) {
  const payload = renewPackageSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.billing_plan.renew",
    payload: {
      billing_plan_id: payload.billing_plan_id,
      sessions_to_add: payload.sessions_to_add,
      payment_amount: payload.payment_amount,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const plan = await getBillingPlanByIdForCoach(supabase, user.id, payload.billing_plan_id);
      if (plan.billing_type !== "session_package" && plan.billing_type !== "program") {
        throw new Error("Renew package is only available for session package or program billing.");
      }

      const nextPurchased = Number(plan.sessions_purchased || 0) + payload.sessions_to_add;
      const { data: updatedPlan, error: updateError } = await supabase
        .from("client_billing_plans")
        .update({ sessions_purchased: nextPurchased })
        .eq("id", plan.id)
        .eq("coach_id", user.id)
        .select("*")
        .single();
      if (updateError) throw new Error(normalizeBillingTablesError(updateError.message));

      const paymentInsert: PaymentInsert = {
        client_id: plan.client_id,
        coach_id: user.id,
        amount: payload.payment_amount,
        currency: (plan.currency || "USD").toUpperCase(),
        method: payload.payment_method,
        payment_date: new Date().toISOString().slice(0, 10),
        status: "paid",
        notes:
          payload.notes?.trim() ||
          `Package renewal: +${payload.sessions_to_add} sessions`,
      };
      const { data: paymentRow, error: paymentError } = await supabase
        .from("client_payments")
        .insert(paymentInsert)
        .select("*")
        .single();
      if (paymentError) throw new Error(paymentError.message);

      revalidateCoachPaths(plan.client_id);
      return {
        plan: billingPlanWithRemaining(updatedPlan as BillingPlanRow),
        payment: paymentRow as Database["public"]["Tables"]["client_payments"]["Row"],
      };
    },
  });
}

export async function getTodayLogsAction(): Promise<Record<string, PaymentLogRow>> {
  return runTrackedAction({
    eventName: "coach.payments.today",
    payload: {},
    action: async () => {
      const { supabase, user } = await requireActor();
      const todayIso = new Date().toISOString().slice(0, 10);
      const { rows } = await listCoachPaymentLogsForDate({
        supabase,
        coachId: user.id,
        sessionDate: todayIso,
        allowMissingTableFallback: true,
      });
      const map: Record<string, PaymentLogRow> = {};
      for (const row of rows) {
        map[row.client_id] = row;
      }
      return map;
    },
  });
}

export async function logSessionAction(input: z.input<typeof logSessionSchema>) {
  const payload = logSessionSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.session.log",
    payload: { client_id: payload.client_id, session_date: payload.session_date || null },
    action: async () => {
      const { supabase, user } = await requireActor();
      const { todayIso, minSessionDateIso } = sessionDateBoundary();
      const sessionDate = payload.session_date || todayIso;
      if (sessionDate > todayIso) {
        throw new Error("Session date cannot be in the future.");
      }
      if (sessionDate < minSessionDateIso) {
        throw new Error("Session date cannot be more than 7 days in the past.");
      }

      const activePlan = await getActiveBillingPlanForClient({
        supabase,
        coachId: user.id,
        clientId: payload.client_id,
      });
      if (!activePlan) {
        throw new Error("No active billing plan for this client.");
      }
      const plan = activePlan;

      const { data: existingLog, error: existingLogError } = await supabase
        .from("payment_logs")
        .select("id, status")
        .eq("coach_id", user.id)
        .eq("client_id", payload.client_id)
        .eq("session_date", sessionDate)
        .maybeSingle();
      if (existingLogError) throw new Error(normalizeBillingTablesError(existingLogError.message));
      if (existingLog?.id) {
        if (existingLog.status === "voided") {
          const { error: cleanupError } = await supabase
            .from("payment_logs")
            .delete()
            .eq("id", existingLog.id)
            .eq("coach_id", user.id);
          if (cleanupError) throw new Error(normalizeBillingTablesError(cleanupError.message));
        } else {
          throw new Error("Session already logged for this date.");
        }
      }

      let amount: number | null = null;
      let sessionsRemainingAfter: number | null = null;

      if (plan.billing_type === "per_session" || plan.billing_type === "hourly") {
        amount = Number(plan.session_rate || 0);
      } else if (plan.billing_type === "session_package" || plan.billing_type === "program") {
        const remaining = Number(plan.sessions_purchased || 0) - Number(plan.sessions_used || 0);
        if (remaining <= 0) {
          throw new Error("No sessions remaining. Renew the package.");
        }
        const nextUsed = Number(plan.sessions_used || 0) + 1;
        const { data: updatedPlan, error: updatePlanError } = await supabase
          .from("client_billing_plans")
          .update({ sessions_used: nextUsed })
          .eq("id", plan.id)
          .eq("coach_id", user.id)
          .select("sessions_purchased, sessions_used")
          .single();
        if (updatePlanError) throw new Error(normalizeBillingTablesError(updatePlanError.message));
        sessionsRemainingAfter = Number(updatedPlan.sessions_purchased || 0) - Number(updatedPlan.sessions_used || 0);
      }

      const logInsert: PaymentLogInsert = {
        client_id: payload.client_id,
        coach_id: user.id,
        billing_plan_id: plan.id,
        session_date: sessionDate,
        amount,
        session_rate_snapshot: Number(plan.session_rate || 0),
        sessions_remaining_after: sessionsRemainingAfter,
        billing_type_snapshot: plan.billing_type,
        status: "logged",
        notes: payload.notes || null,
      };
      const { data: createdLog, error: createLogError } = await supabase
        .from("payment_logs")
        .insert(logInsert)
        .select("*")
        .single();
      if (createLogError) throw new Error(normalizeBillingTablesError(createLogError.message));

      revalidateCoachPaths(payload.client_id);
      return {
        log: createdLog as PaymentLogRow,
        sessions_remaining: sessionsRemainingAfter,
      };
    },
  });
}

export async function deleteSessionLogAction(input: z.input<typeof deleteSessionLogSchema>) {
  const payload = deleteSessionLogSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.session.delete",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data: logRow, error: logError } = await supabase
        .from("payment_logs")
        .select("*")
        .eq("id", payload.log_id)
        .eq("coach_id", user.id)
        .single();
      if (logError) throw new Error(normalizeBillingTablesError(logError.message));
      const log = logRow as PaymentLogRow;

      const { error: deleteError } = await supabase
        .from("payment_logs")
        .delete()
        .eq("id", payload.log_id)
        .eq("coach_id", user.id);
      if (deleteError) throw new Error(normalizeBillingTablesError(deleteError.message));

      if (
        log.status !== "voided" &&
        log.billing_plan_id &&
        (log.billing_type_snapshot === "session_package" || log.billing_type_snapshot === "program")
      ) {
        const { data: plan, error: planError } = await supabase
          .from("client_billing_plans")
          .select("id, sessions_used")
          .eq("id", log.billing_plan_id)
          .eq("coach_id", user.id)
          .maybeSingle();
        if (planError) throw new Error(normalizeBillingTablesError(planError.message));
        if (plan) {
          const nextUsed = Math.max(0, Number(plan.sessions_used || 0) - 1);
          const { error: updatePlanError } = await supabase
            .from("client_billing_plans")
            .update({ sessions_used: nextUsed })
            .eq("id", log.billing_plan_id)
            .eq("coach_id", user.id);
          if (updatePlanError) throw new Error(normalizeBillingTablesError(updatePlanError.message));
        }
      }

      revalidateCoachPaths(log.client_id);
      return { success: true };
    },
  });
}

export async function listClientPaymentLogsAction(
  input: z.input<typeof listClientPaymentLogsSchema>
): Promise<ClientPaymentLogsPayload> {
  const payload = listClientPaymentLogsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment_logs.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const from = payload.page * payload.limit;
      const to = from + payload.limit - 1;
      const result = await listClientPaymentLogsPage({
        supabase,
        coachId: user.id,
        clientId: payload.client_id,
        from,
        to,
        sortBy: payload.sort_by,
        ascending: payload.sort_dir === "asc",
        dateFrom: payload.date_from || undefined,
        dateTo: payload.date_to || undefined,
        status: payload.status,
        search: payload.search || undefined,
        allowMissingTableFallback: true,
      });
      if (result.missing) {
        return {
          rows: [],
          total: 0,
          page: payload.page,
          page_size: payload.limit,
          has_more: false,
        };
      }
      const rows = result.rows;
      const total = result.total;
      return {
        rows,
        total,
        page: payload.page,
        page_size: payload.limit,
        has_more: from + rows.length < total,
      };
    },
  });
}

export async function getClientPaymentLogStatsAction(clientId: string): Promise<ClientPaymentLogStats> {
  return runTrackedAction({
    eventName: "coach.client.payment_logs.stats",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase, user } = await requireActor();
      const monthStartIso = startOfMonthIso();
      const emptyStats: ClientPaymentLogStats = {
        sessions_this_month: 0,
        revenue_this_month: 0,
        total_sessions: 0,
      };

      const [totalRes, monthSessionsRes, monthRevenueRes] = await Promise.all([
        countCoachPaymentLogsSince({
          supabase,
          coachId: user.id,
          clientId,
          allowMissingTableFallback: true,
        }),
        countCoachPaymentLogsSince({
          supabase,
          coachId: user.id,
          clientId,
          fromDate: monthStartIso,
          allowMissingTableFallback: true,
        }),
        listClientPaymentLogAmountsSince({
          supabase,
          coachId: user.id,
          clientId,
          fromDate: monthStartIso,
          allowMissingTableFallback: true,
        }),
      ]);

      if (totalRes.missing || monthSessionsRes.missing || monthRevenueRes.missing) return emptyStats;

      const revenueThisMonth = monthRevenueRes.rows
        .filter((row) => row.status !== "voided")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      return {
        sessions_this_month: monthSessionsRes.count,
        revenue_this_month: revenueThisMonth,
        total_sessions: totalRes.count,
      };
    },
  });
}

export type PaymentAlert = {
  type: "overdue" | "period_ending" | "no_active_period";
  payment_id: string | null;
  message: string;
};

export async function listClientPaymentsAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.payments.list",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("client_payments")
        .select("*")
        .eq("client_id", clientId)
        .order("payment_date", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (data || []) as Database["public"]["Tables"]["client_payments"]["Row"][];
      const alerts: PaymentAlert[] = [];
      const now = new Date();
      const activePeriods = rows.filter((row) => row.status === "paid" && row.period_start && row.period_end);

      if (activePeriods.length === 0) {
        alerts.push({
          type: "no_active_period",
          payment_id: null,
          message: "No active paid period found for this client.",
        });
      }

      for (const row of rows) {
        if (row.status === "pending" && row.payment_date < now.toISOString().slice(0, 10)) {
          alerts.push({
            type: "overdue",
            payment_id: row.id,
            message: `Payment ${row.id.slice(0, 8)} is overdue.`,
          });
        }
        if (row.period_end) {
          const periodEnd = new Date(`${row.period_end}T00:00:00.000Z`).getTime();
          const daysLeft = Math.ceil((periodEnd - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= 3) {
            alerts.push({
              type: "period_ending",
              payment_id: row.id,
              message: `Payment period ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
            });
          }
        }
      }

      return { rows, alerts };
    },
  });
}

function derivePaymentDescription(row: Database["public"]["Tables"]["client_payments"]["Row"]) {
  const note = (row.notes || "").trim();
  if (!note) return "Client payment";
  const firstLine = note.split("\n").find((line) => line.trim().length > 0);
  return (firstLine || note).slice(0, 140);
}

function addDays(value: string, days: number) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function computeNextMonthlyBillingDate(cycleDay: number | null, todayIso: string) {
  if (!cycleDay || cycleDay < 1 || cycleDay > 28) return null;
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  if (Number.isNaN(today.getTime())) return null;

  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();

  if (day <= cycleDay) {
    const due = new Date(Date.UTC(year, month, cycleDay));
    return due.toISOString().slice(0, 10);
  }

  const next = new Date(Date.UTC(year, month + 1, cycleDay));
  return next.toISOString().slice(0, 10);
}

function paymentIsOverdue(
  row: Pick<Database["public"]["Tables"]["client_payments"]["Row"], "status" | "payment_date">,
  todayIso: string
) {
  return row.status === "pending" && row.payment_date < todayIso;
}

function normalizePaymentStatus(status: DbPaymentStatus): PaymentStatus {
  return status === "paid" ? "paid" : "pending";
}

export async function listCoachPaymentsDashboardAction(
  input: z.input<typeof listCoachPaymentsSchema>
): Promise<CoachPaymentsDashboard> {
  const payload = listCoachPaymentsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.payments.dashboard.read",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const todayIso = new Date().toISOString().slice(0, 10);
      const weekStartIso = startOfWeekIso();
      const monthStartIso = startOfMonthIso();
      const normalizedSearch = (payload.search || "").trim().toLowerCase();
      const ascending = payload.sort_dir === "asc";

      const ownedClientsRes = await supabase
        .from("clients")
        .select("id, first_name, last_name, status, is_archived")
        .eq("primary_coach_id", user.id);

      if (ownedClientsRes.error) throw new Error(ownedClientsRes.error.message);

      const ownedClients = (ownedClientsRes.data || []) as Array<
        Pick<ClientRow, "id" | "first_name" | "last_name" | "status" | "is_archived">
      >;
      const clients = ownedClients;
      const clientIds = clients.map((row) => row.id);
      if (clientIds.length === 0) {
        return {
          features: {
            billing_plans_available: true,
            payment_logs_available: true,
          },
          kpis: {
            total_collected: 0,
            pending_amount: 0,
            overdue_amount: 0,
            active_billing: 0,
            sessions_logged_today: 0,
            sessions_logged_this_week: 0,
            sessions_logged_this_month: 0,
            packages_expiring_soon: 0,
            clients_due_today: 0,
          },
          transactions: [],
          transactions_total: 0,
          nextCursor: null,
          page: payload.page,
          page_size: payload.page_size,
          has_more: false,
          todays_board: [],
          client_billing: [],
        };
      }

      const clientNameById = new Map<string, string>();
      const clientStatusById = new Map<string, ClientStatus>();
      for (const row of clients) {
        clientNameById.set(row.id, `${row.first_name} ${row.last_name || ""}`.trim() || "Client");
        clientStatusById.set(row.id, row.status);
      }

      let matchedClientIds: string[] = [];
      if (normalizedSearch) {
        matchedClientIds = clients
          .filter((row) => {
            const name = `${row.first_name} ${row.last_name || ""}`.trim().toLowerCase();
            return name.includes(normalizedSearch);
          })
          .map((row) => row.id);
      }
      const shouldScopeTransactionsByClientIds = matchedClientIds.length > 0 && matchedClientIds.length <= 20;

      const escapedSearch = escapeLikePattern((payload.search || "").trim()).slice(0, 120);
      let transactionsQuery = supabase
        .from("client_payments")
        .select(
          "id, client_id, amount, currency, status, payment_date, method, notes, created_at, updated_at",
          { count: "exact" }
        )
        .eq("coach_id", user.id)
        .limit(payload.page_size)
        .order(payload.sort_by, { ascending })
        .order("id", { ascending: true });

      if (shouldScopeTransactionsByClientIds) {
        transactionsQuery = transactionsQuery.in("client_id", matchedClientIds);
      }

      if (payload.status === "overdue") {
        transactionsQuery = transactionsQuery.eq("status", "pending").lt("payment_date", todayIso);
      } else if (payload.status !== "all") {
        transactionsQuery = transactionsQuery.eq("status", payload.status);
      }

      if (normalizedSearch && !shouldScopeTransactionsByClientIds && escapedSearch) {
        transactionsQuery = transactionsQuery.ilike("notes", `%${escapedSearch}%`);
      }
      if (payload.cursor) {
        const { sortValue, id } = decodeCursor(payload.cursor);
        if (id) {
          const comparator = ascending ? "gt" : "lt";
          transactionsQuery = transactionsQuery.or(
            `${payload.sort_by}.${comparator}.${sortValue},and(${payload.sort_by}.eq.${sortValue},id.gt.${id})`
          );
        }
      }

      const [
        transactionsRes,
        metricsRes,
        plansResult,
        todayLogsResult,
        weekLogsCountResult,
        monthLogsCountResult,
      ] = await Promise.all([
        transactionsQuery,
        supabase
          .from("client_payments")
          .select("client_id, amount, status, payment_date, period_end")
          .eq("coach_id", user.id)
          .order("payment_date", { ascending: false })
          .limit(payload.limit),
        listCoachBillingPlans({
          supabase,
          coachId: user.id,
          allowMissingTableFallback: true,
        }),
        listCoachPaymentLogsForDate({
          supabase,
          coachId: user.id,
          sessionDate: todayIso,
          allowMissingTableFallback: true,
        }),
        countCoachPaymentLogsSince({
          supabase,
          coachId: user.id,
          fromDate: weekStartIso,
          allowMissingTableFallback: true,
        }),
        countCoachPaymentLogsSince({
          supabase,
          coachId: user.id,
          fromDate: monthStartIso,
          allowMissingTableFallback: true,
        }),
      ]);

      if (transactionsRes.error) throw new Error(transactionsRes.error.message);
      if (metricsRes.error) throw new Error(metricsRes.error.message);

      const billingPlansMissing = plansResult.missing;
      const paymentLogsMissing =
        todayLogsResult.missing || weekLogsCountResult.missing || monthLogsCountResult.missing;

      const transactionRows =
        (transactionsRes.data || []) as Array<Database["public"]["Tables"]["client_payments"]["Row"]>;
      const allPayments = (metricsRes.data || []) as Array<
        Pick<
          Database["public"]["Tables"]["client_payments"]["Row"],
          "client_id" | "amount" | "status" | "payment_date" | "period_end"
        >
      >;
      const transactionsRaw: CoachPaymentTransactionRow[] = transactionRows.map((row) => {
        const computedStatus: PaymentStatus | "overdue" = paymentIsOverdue(row, todayIso)
          ? "overdue"
          : normalizePaymentStatus(row.status);
        return {
          ...row,
          client_name: clientNameById.get(row.client_id) || "Client",
          client_status: clientStatusById.get(row.client_id) || "active",
          description: derivePaymentDescription(row),
          status: computedStatus,
        };
      });

      const transactions = normalizedSearch
        ? transactionsRaw.filter((row) => {
            const searchable = `${row.client_name} ${row.description} ${row.notes || ""}`.toLowerCase();
            return searchable.includes(normalizedSearch);
          })
        : transactionsRaw;

      const planRows = plansResult.rows;
      const todayLogRows = todayLogsResult.rows;
      const activePayments = allPayments;

      const totalCollected = activePayments.reduce((sum, row) => (row.status === "paid" ? sum + Number(row.amount || 0) : sum), 0);
      const pendingAmount = activePayments.reduce((sum, row) => (row.status === "pending" ? sum + Number(row.amount || 0) : sum), 0);
      const overdueAmount = activePayments.reduce(
        (sum, row) => (paymentIsOverdue(row, todayIso) ? sum + Number(row.amount || 0) : sum),
        0
      );
      const activeBilling = new Set(
        activePayments
          .filter((row) => row.status === "paid" || row.status === "pending")
          .map((row) => row.client_id)
      ).size;

      const latestPlanByClient = new Map<string, BillingPlanRow>();
      const activePlanByClient = new Map<string, BillingPlanRow>();
      for (const plan of planRows) {
        if (!latestPlanByClient.has(plan.client_id)) {
          latestPlanByClient.set(plan.client_id, plan);
        }
        if (plan.is_active && !activePlanByClient.has(plan.client_id)) {
          activePlanByClient.set(plan.client_id, plan);
        }
      }

      const todayLogByClient = new Map<string, PaymentLogRow>();
      for (const log of todayLogRows) {
        if (!todayLogByClient.has(log.client_id)) {
          todayLogByClient.set(log.client_id, log);
        }
      }

      const paymentMetricsByClient = new Map<
        string,
        {
          total_paid: number;
          outstanding: number;
          next_billing_date: string | null;
        }
      >();
      for (const payment of activePayments) {
        const existing = paymentMetricsByClient.get(payment.client_id) || {
          total_paid: 0,
          outstanding: 0,
          next_billing_date: null,
        };
        if (payment.status === "paid") {
          existing.total_paid += Number(payment.amount || 0);
        }
        if (payment.status === "pending") {
          existing.outstanding += Number(payment.amount || 0);
        }
        if (!existing.next_billing_date && payment.period_end) {
          existing.next_billing_date = addDays(payment.period_end, 1);
        }
        paymentMetricsByClient.set(payment.client_id, existing);
      }

      const todaysBoard: CoachPaymentsTodayBoardRow[] = [];
      for (const client of clients) {
        if (client.status !== "active") continue;
        const activePlan = activePlanByClient.get(client.id);
        if (!activePlan) continue;
        const clientName = `${client.first_name} ${client.last_name || ""}`.trim() || "Client";
        todaysBoard.push({
          client_id: client.id,
          client_name: clientName,
          client_status: client.status,
          billing_plan: billingPlanWithRemaining(activePlan),
          today_log: todayLogByClient.get(client.id) || null,
        });
      }

      const packagesExpiringSoon = Array.from(activePlanByClient.values()).reduce((count, plan) => {
        if (plan.billing_type !== "session_package") return count;
        const remaining = Math.max(0, Number(plan.sessions_purchased || 0) - Number(plan.sessions_used || 0));
        return remaining <= 2 ? count + 1 : count;
      }, 0);

      const clientsDueToday = todaysBoard.reduce((count, row) => {
        if (row.today_log) return count;
        return count + 1;
      }, 0);

      const clientBilling: CoachPaymentClientBillingRow[] = clients.map((client) => {
        const clientName = `${client.first_name} ${client.last_name || ""}`.trim() || "Client";
        const latestPlan = latestPlanByClient.get(client.id) || null;
        const metrics = paymentMetricsByClient.get(client.id) || {
          total_paid: 0,
          outstanding: 0,
          next_billing_date: null,
        };
        const sessionsPurchased = Number(latestPlan?.sessions_purchased || 0);
        const sessionsUsed = Number(latestPlan?.sessions_used || 0);
        const sessionsRemaining = Math.max(0, sessionsPurchased - sessionsUsed);

        const nextBillingDate =
          latestPlan?.billing_type === "monthly"
            ? computeNextMonthlyBillingDate(latestPlan.billing_cycle_day, todayIso)
            : metrics.next_billing_date;

        return {
          client_id: client.id,
          client_name: clientName,
          client_status: client.status,
          billing_plan_id: latestPlan?.id ?? null,
          billing_type: latestPlan?.billing_type ?? null,
          session_rate: latestPlan ? Number(latestPlan.session_rate || 0) : null,
          currency: latestPlan?.currency ?? null,
          payment_method: latestPlan?.payment_method ?? null,
          sessions_purchased: sessionsPurchased,
          sessions_used: sessionsUsed,
          sessions_remaining: sessionsRemaining,
          is_active_plan: latestPlan?.is_active ?? false,
          monthly_amount: latestPlan?.monthly_amount ? Number(latestPlan.monthly_amount) : null,
          billing_cycle_day: latestPlan?.billing_cycle_day ?? null,
          program_start_date: latestPlan?.program_start_date ?? null,
          program_end_date: latestPlan?.program_end_date ?? null,
          plan_notes: latestPlan?.notes ?? null,
          total_paid: metrics.total_paid,
          outstanding: metrics.outstanding,
          next_billing_date: nextBillingDate,
        };
      });
      clientBilling.sort((a, b) => a.client_name.localeCompare(b.client_name));

      todaysBoard.sort((a, b) => a.client_name.localeCompare(b.client_name));
      const transactionsTotal = transactionsRes.count ?? transactions.length;
      const lastTransaction = transactionRows[transactionRows.length - 1];
      const lastSortValueRaw = lastTransaction
        ? ((lastTransaction as Record<string, unknown>)[payload.sort_by] ?? "")
        : "";
      const nextCursor =
        transactionRows.length === payload.page_size && lastTransaction
          ? encodeCursor(String(lastSortValueRaw), lastTransaction.id)
          : null;

      return {
        features: {
          billing_plans_available: !billingPlansMissing,
          payment_logs_available: !paymentLogsMissing,
        },
        kpis: {
          total_collected: totalCollected,
          pending_amount: pendingAmount,
          overdue_amount: overdueAmount,
          active_billing: activeBilling,
          sessions_logged_today: todayLogRows.length,
          sessions_logged_this_week: paymentLogsMissing ? 0 : weekLogsCountResult.count,
          sessions_logged_this_month: paymentLogsMissing ? 0 : monthLogsCountResult.count,
          packages_expiring_soon: packagesExpiringSoon,
          clients_due_today: clientsDueToday,
        },
        transactions,
        transactions_total: transactionsTotal,
        nextCursor,
        page: payload.page,
        page_size: payload.page_size,
        has_more: Boolean(nextCursor),
        todays_board: todaysBoard,
        client_billing: clientBilling,
      };
    },
  });
}
