"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { type ClientModuleKey } from "@/lib/client-portal/constants";
import {
  canReadModule,
  canWriteModule,
  getClientPortalContext,
  getModuleAccessLevel,
} from "@/lib/client-portal/session";
import { mealUnitInputSchema } from "@/lib/nutrition/meal-units";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCoachAccess } from "@/app/actions/client-portal-auth";
import { Database } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientTaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type ClientTaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type ClientTaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
type CoachNoteInsert = Database["public"]["Tables"]["client_notes"]["Insert"];
type CoachNoteRow = Database["public"]["Tables"]["client_notes"]["Row"];
type SessionInsert = Database["public"]["Tables"]["workouts"]["Insert"];
type SessionRow = Database["public"]["Tables"]["workouts"]["Row"];
type StrengthSetInsert = Database["public"]["Tables"]["workout_sets"]["Insert"];
type CardioSetInsert = Database["public"]["Tables"]["workout_cardio"]["Insert"];
type MealLogRow = Database["public"]["Tables"]["diary_entries"]["Row"];
type MealLogInsert = Database["public"]["Tables"]["diary_entries"]["Insert"];
type MealLogItemRow = Database["public"]["Tables"]["diary_items"]["Row"];
type MealLogItemInsert = Database["public"]["Tables"]["diary_items"]["Insert"];
type FavoriteRow = Database["public"]["Tables"]["diary_favorites"]["Row"];
type CheckinRow = Database["public"]["Tables"]["client_reviews"]["Row"];
type CheckinInsert = Database["public"]["Tables"]["client_reviews"]["Insert"];
type ClientStepsRow = Database["public"]["Tables"]["client_activity"]["Row"];
type ClientStepsInsert = Database["public"]["Tables"]["client_activity"]["Insert"];

type ClientTaskStatus = Database["public"]["Enums"]["client_task_status"];
type SessionSlot = Database["public"]["Enums"]["workout_slot"];
type SessionLocationType = Database["public"]["Enums"]["workout_location"];
type CoachNoteTag = Database["public"]["Enums"]["coach_note_tag"];
type ClientNoteVisibility = Database["public"]["Enums"]["client_note_visibility"];
type MealType = Database["public"]["Enums"]["diary_entry_type"];

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

const CLIENT_PORTAL_MEAL_TYPES = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
  // Backward-compatible legacy values.
  "snacks",
  "other",
] as const;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const clientTaskSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3000).nullable().optional(),
  due_date: isoDateSchema.nullable().optional(),
  status: z.enum(["pending", "completed", "overdue"]).default("pending"),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  due_date: isoDateSchema.nullable().optional(),
  status: z.enum(["pending", "completed", "overdue"]).optional(),
});

const markTaskSchema = z.object({
  task_id: z.string().uuid(),
  completed: z.boolean(),
});

const coachNoteSchema = z.object({
  client_id: z.string().uuid(),
  tag: z.enum(COACH_NOTE_TAG_INPUTS).default("general"),
  title: z.string().trim().max(180).nullable().optional(),
  content: z.string().trim().min(1).max(5000),
  visibility: z.enum(["private", "visible_to_client"]).default("private"),
});

const updateNoteVisibilitySchema = z.object({
  note_id: z.string().uuid(),
  client_id: z.string().uuid(),
  visibility: z.enum(["private", "visible_to_client"]),
});

const workoutSchema = z.object({
  name: z.string().trim().min(1).max(180),
  performed_on: isoDateSchema.optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  workout_slot: z.enum(["morning", "afternoon", "evening", "other"]).default("other"),
  session_label: z.string().trim().max(120).nullable().optional(),
  location_type: z.enum(["gym", "home", "outdoor", "travel", "other"]).nullable().optional(),
  location_label: z.string().trim().max(180).nullable().optional(),
  location_address: z.string().trim().max(500).nullable().optional(),
  location_notes: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  plan_assignment_id: z.string().uuid().nullable().optional(),
  plan_session_id: z.string().uuid().nullable().optional(),
  mark_plan_session_resolved: z.boolean().default(false),
  workout_sets: z
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
  workout_cardio: z
    .array(
      z.object({
        activity_type: z.string().trim().min(1).max(120),
        duration_minutes: z.number().min(0),
        distance: z.number().min(0).nullable().optional(),
        calories_burned: z.number().min(0).nullable().optional(),
        average_heart_rate: z.number().min(0).nullable().optional(),
        reps: z.number().int().min(0).nullable().optional(),
        notes: z.string().trim().max(1000).nullable().optional(),
        entry_sequence: z.number().int().min(0).nullable().optional(),
      })
    )
    .optional(),
});

const mealItemSchema = z.object({
  item_name: z.string().trim().min(1).max(220),
  quantity: z.number().min(0).nullable().optional(),
  unit: mealUnitInputSchema,
  calories: z.number().min(0).nullable().optional(),
  protein_g: z.number().min(0).nullable().optional(),
  carbs_g: z.number().min(0).nullable().optional(),
  fat_g: z.number().min(0).nullable().optional(),
  fiber_g: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  is_quick_add: z.boolean().optional(),
});

const addMealItemSchema = z.object({
  performed_on: isoDateSchema,
  meal_type: z.enum(CLIENT_PORTAL_MEAL_TYPES),
  item: mealItemSchema,
});

const removeMealItemSchema = z.object({
  item_id: z.string().uuid(),
});

const recentSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
});

const favoriteToggleSchema = z.object({
  item: mealItemSchema,
});

const copyMealsSchema = z.object({
  source_date: isoDateSchema,
  target_date: isoDateSchema,
  meal_types: z.array(z.enum(CLIENT_PORTAL_MEAL_TYPES)).optional(),
});

const stepsSchema = z.object({
  performed_on: isoDateSchema,
  steps: z.number().int().min(0),
  notes: z.string().trim().max(1000).nullable().optional(),
});

const checkinSchema = z.object({
  urgent: z.boolean().default(false),
  notes: z.string().trim().max(5000).nullable().optional(),
  checkin_data: z.record(z.string(), z.unknown()).default({}),
});

const goalsSchema = z.object({
  goals: z.string().trim().max(4000),
});

function todayIso(when = new Date()) {
  const year = when.getFullYear();
  const month = `${when.getMonth() + 1}`.padStart(2, "0");
  const day = `${when.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

async function requirePortalAccess(moduleKey: ClientModuleKey, write = false) {
  const context = await getClientPortalContext();
  if (!context) throw new Error("Unauthorized");

  const accessLevel = getModuleAccessLevel(context.features, moduleKey);
  if (!canReadModule(accessLevel)) {
    throw new Error("Access denied for this module.");
  }
  if (write && !canWriteModule(accessLevel)) {
    throw new Error("This module is read-only.");
  }

  return { context, accessLevel };
}

async function getOrCreateMealLog(args: {
  client: ClientRow;
  performed_on: string;
  meal_type: MealType;
}): Promise<MealLogRow> {
  const admin = createAdminClient();
  const { client, meal_type, performed_on } = args;

  const { data: existing, error: existingError } = await admin
    .from("diary_entries")
    .select("*")
    .eq("subject_client_id", client.id)
    .is("subject_user_id", null)
    .eq("performed_on", performed_on)
    .eq("meal_type", meal_type)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as MealLogRow;

  const insertPayload: MealLogInsert = {
    subject_client_id: client.id,
    subject_user_id: null,
    created_by_user_id: null,
    created_by_client_id: client.id,
    performed_on,
    meal_type,
  };
  const { data: inserted, error: insertError } = await admin
    .from("diary_entries")
    .insert(insertPayload)
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);
  return inserted as MealLogRow;
}

function revalidateClientPortalPaths(clientId: string) {
  revalidatePath("/client");
  revalidatePath("/client/workouts");
  revalidatePath("/client/training");
  revalidatePath("/client/meal-plan");
  revalidatePath("/client/nutrition");
  revalidatePath("/client/steps");
  revalidatePath("/client/tasks");
  revalidatePath("/client/notes");
  revalidatePath("/client/check-ins");
  revalidatePath("/client/goals");
  revalidatePath(`/clients/${clientId}`);
}

type ClientPortalDashboard = {
  client_id: string;
  display_name: string;
  today: string;
  today_sessions: number;
  pending_tasks: number;
  next_session: {
    assignment_id: string;
    session_id: string;
    sequence_no: number;
    title: string;
    session_type: string;
  } | null;
  access: Record<ClientModuleKey, Database["public"]["Enums"]["client_module_access_level"]>;
};

export async function getClientPortalDashboardAction(): Promise<ClientPortalDashboard> {
  return runTrackedAction({
    eventName: "client.portal.dashboard.read",
    action: async () => {
      const context = await getClientPortalContext();
      if (!context) throw new Error("Unauthorized");
      const admin = createAdminClient();
      const today = todayIso();

      const [{ count: todaySessionsCount, error: sessionsError }, { count: pendingTasksCount, error: tasksError }] =
        await Promise.all([
          admin
            .from("workouts")
            .select("id", { count: "exact", head: true })
            .eq("subject_client_id", context.client.id)
            .eq("performed_on", today),
          admin
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .eq("client_id", context.client.id)
            .eq("status", "pending")
            .is("archived_at", null),
        ]);
      if (sessionsError) throw new Error(sessionsError.message);
      if (tasksError) throw new Error(tasksError.message);

      const { data: activeAssignment, error: assignmentError } = await admin
        .from("program_assignments")
        .select("id")
        .eq("client_id", context.client.id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);

      let nextSession: ClientPortalDashboard["next_session"] = null;
      if (activeAssignment) {
        const { data: sessions, error: nextSessionError } = await admin
          .from("program_assignment_workouts")
          .select("id, sequence_no, title, session_type, completed_at, is_skipped")
          .eq("assignment_id", activeAssignment.id)
          .order("sequence_no", { ascending: true });
        if (nextSessionError) throw new Error(nextSessionError.message);
        const pending = (sessions || []).find(
          (session) => !session.completed_at && !session.is_skipped
        );
        if (pending) {
          nextSession = {
            assignment_id: activeAssignment.id,
            session_id: pending.id,
            sequence_no: pending.sequence_no,
            title: pending.title,
            session_type: pending.session_type,
          };
        }
      }

      return {
        client_id: context.client.id,
        display_name:
          context.client.display_name ||
          `${context.client.first_name} ${context.client.last_name || ""}`.trim() ||
          "Client",
        today,
        today_sessions: todaySessionsCount ?? 0,
        pending_tasks: pendingTasksCount ?? 0,
        next_session: nextSession,
        access: context.features,
      };
    },
  });
}

export async function listClientPortalTasksAction(): Promise<ClientTaskRow[]> {
  return runTrackedAction({
    eventName: "client.portal.tasks.list",
    action: async () => {
      const { context } = await requirePortalAccess("tasks");
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("tasks")
        .select("*")
        .eq("client_id", context.client.id)
        .is("archived_at", null)
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as ClientTaskRow[];
    },
  });
}

export async function listCoachClientTasksAction(clientId: string): Promise<ClientTaskRow[]> {
  const safeClientId = z.string().uuid().parse(clientId);
  return runTrackedAction({
    eventName: "coach.client.tasks.list",
    payload: { client_id: safeClientId },
    action: async () => {
      await requireCoachAccess(safeClientId);
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("tasks")
        .select("*")
        .eq("client_id", safeClientId)
        .is("archived_at", null)
        .order("status", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as ClientTaskRow[];
    },
  });
}

export async function markClientTaskCompleteAction(
  input: z.input<typeof markTaskSchema>
) {
  const payload = markTaskSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.tasks.complete",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("tasks", true);
      const admin = createAdminClient();

      const updates: ClientTaskUpdate = payload.completed
        ? { status: "completed", completed_at: new Date().toISOString() }
        : { status: "pending", completed_at: null };

      const { error } = await admin
        .from("tasks")
        .update(updates)
        .eq("id", payload.task_id)
        .eq("client_id", context.client.id);
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(context.client.id);
      return { success: true };
    },
  });
}

export async function createClientTaskAction(input: z.input<typeof clientTaskSchema>) {
  const payload = clientTaskSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.task.create",
    payload: { client_id: payload.client_id },
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();
      const insertPayload: ClientTaskInsert = {
        client_id: payload.client_id,
        title: payload.title,
        description: payload.description || null,
        due_date: payload.due_date || null,
        status: payload.status as ClientTaskStatus,
        created_by_user_id: scope.actorId,
        created_by_client_id: null,
      };
      const { data, error } = await admin
        .from("tasks")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(payload.client_id);
      return data as ClientTaskRow;
    },
  });
}

export async function updateClientTaskAction(input: z.input<typeof updateTaskSchema>) {
  const payload = updateTaskSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.task.update",
    payload: { id: payload.id, client_id: payload.client_id },
    action: async () => {
      await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();

      const updates: ClientTaskUpdate = {};
      if (payload.title !== undefined) updates.title = payload.title;
      if (payload.description !== undefined) updates.description = payload.description || null;
      if (payload.due_date !== undefined) updates.due_date = payload.due_date || null;
      if (payload.status !== undefined) {
        updates.status = payload.status;
        updates.completed_at =
          payload.status === "completed" ? new Date().toISOString() : null;
      }

      const { data, error } = await admin
        .from("tasks")
        .update(updates)
        .eq("id", payload.id)
        .eq("client_id", payload.client_id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(payload.client_id);
      return data as ClientTaskRow;
    },
  });
}

export async function listClientPortalNotesAction(): Promise<CoachNoteRow[]> {
  return runTrackedAction({
    eventName: "client.portal.notes.list",
    action: async () => {
      const { context } = await requirePortalAccess("coach_notes");
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("client_notes")
        .select("*")
        .eq("client_id", context.client.id)
        .eq("visibility", "visible_to_client")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as CoachNoteRow[];
    },
  });
}

export async function createCoachNoteForClientAction(
  input: z.input<typeof coachNoteSchema>
) {
  const payload = coachNoteSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.note.create",
    payload: { client_id: payload.client_id, visibility: payload.visibility },
    action: async () => {
      const scope = await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();
      const insertPayload: CoachNoteInsert = {
        client_id: payload.client_id,
        coach_id: scope.actorId,
        tag: normalizeCoachNoteTag(payload.tag),
        title: payload.title || null,
        content: payload.content,
        visibility: payload.visibility as ClientNoteVisibility,
        is_shared_with_linked_user: payload.visibility === "visible_to_client",
      };
      const { data, error } = await admin
        .from("client_notes")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(payload.client_id);
      return data as CoachNoteRow;
    },
  });
}

export async function updateCoachNoteVisibilityAction(
  input: z.input<typeof updateNoteVisibilitySchema>
) {
  const payload = updateNoteVisibilitySchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.note.visibility.update",
    payload,
    action: async () => {
      await requireCoachAccess(payload.client_id);
      const admin = createAdminClient();
      const { error } = await admin
        .from("client_notes")
        .update({
          visibility: payload.visibility,
          is_shared_with_linked_user: payload.visibility === "visible_to_client",
        })
        .eq("id", payload.note_id)
        .eq("client_id", payload.client_id);
      if (error) throw new Error(error.message);
      revalidateClientPortalPaths(payload.client_id);
      return { success: true };
    },
  });
}

export async function listClientPortalWorkoutsAction(
  date?: string
): Promise<SessionRow[]> {
  const safeDate = date ? isoDateSchema.parse(date) : null;
  return runTrackedAction({
    eventName: "client.portal.workouts.list",
    payload: { date: safeDate },
    action: async () => {
      const { context } = await requirePortalAccess("workouts");
      const admin = createAdminClient();
      const performedOn = safeDate || todayIso();

      const { data, error } = await admin
        .from("workouts")
        .select("*")
        .eq("subject_client_id", context.client.id)
        .is("subject_user_id", null)
        .eq("performed_on", performedOn)
        .order("started_at", { ascending: true, nullsFirst: true });
      if (error) throw new Error(error.message);
      return (data || []) as SessionRow[];
    },
  });
}

export async function createClientWorkoutLogAction(
  input: z.input<typeof workoutSchema>
) {
  const payload = workoutSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.workouts.create",
    payload: { has_strength_sets: Boolean(payload.workout_sets?.length), has_cardio_sessions: Boolean(payload.workout_cardio?.length) },
    action: async () => {
      const context = await getClientPortalContext();
      if (!context) throw new Error("Unauthorized");
      const workoutsAccess = getModuleAccessLevel(context.features, "workouts");
      const trainingAccess = getModuleAccessLevel(context.features, "program");
      const canRead = canReadModule(workoutsAccess) || canReadModule(trainingAccess);
      const canWrite = canWriteModule(workoutsAccess) || canWriteModule(trainingAccess);
      if (!canRead) throw new Error("Access denied for workouts.");
      if (!canWrite) throw new Error("Workouts are read-only.");
      const admin = createAdminClient();
      const performedOn = payload.performed_on || todayIso();

      const insertSession: SessionInsert = {
        created_by_user_id: null,
        created_by_client_id: context.client.id,
        subject_client_id: context.client.id,
        subject_user_id: null,
        name: payload.name,
        performed_on: performedOn,
        date: payload.started_at || `${performedOn}T00:00:00.000Z`,
        started_at: payload.started_at || null,
        completed_at: payload.completed_at || null,
        session_slot: payload.workout_slot as SessionSlot,
        session_label: payload.session_label || null,
        location_type: (payload.location_type || null) as SessionLocationType | null,
        location_label: payload.location_label || null,
        location_address: payload.location_address || null,
        location_notes: payload.location_notes || null,
        notes: payload.notes || null,
        status: "active",
        plan_assignment_id: payload.plan_assignment_id || null,
        plan_session_id: payload.plan_session_id || null,
      };

      const { data: session, error: sessionError } = await admin
        .from("workouts")
        .insert(insertSession)
        .select("*")
        .single();
      if (sessionError) throw new Error(sessionError.message);

      const strengthRows: StrengthSetInsert[] = (payload.workout_sets || []).map((set, index) => ({
        workout_id: session.id,
        exercise_name: set.exercise_name,
        set_number: set.set_number,
        reps: set.reps ?? null,
        weight: set.weight ?? null,
        rest_seconds: set.rest_seconds ?? null,
        notes: set.notes || null,
        entry_sequence: set.entry_sequence ?? index,
      }));
      if (strengthRows.length > 0) {
        const { error: strengthError } = await admin.from("workout_sets").insert(strengthRows);
        if (strengthError) throw new Error(strengthError.message);
      }

      const cardioRows: CardioSetInsert[] = (payload.workout_cardio || []).map((cardio, index) => ({
        workout_id: session.id,
        date: performedOn,
        activity_type: cardio.activity_type,
        duration_minutes: cardio.duration_minutes,
        distance: cardio.distance ?? null,
        calories_burned: cardio.calories_burned ?? null,
        average_heart_rate: cardio.average_heart_rate ?? null,
        reps: cardio.reps ?? null,
        notes: cardio.notes || null,
        entry_sequence: cardio.entry_sequence ?? index,
      }));
      if (cardioRows.length > 0) {
        const { error: cardioError } = await admin.from("workout_cardio").insert(cardioRows);
        if (cardioError) throw new Error(cardioError.message);
      }

      if (payload.mark_plan_session_resolved && payload.plan_session_id) {
        await admin
          .from("program_assignment_workouts")
          .update({ completed_at: payload.completed_at || new Date().toISOString() })
          .eq("id", payload.plan_session_id);
      }

      revalidateClientPortalPaths(context.client.id);
      return session as SessionRow;
    },
  });
}

export async function getClientPortalTrainingPlanAction() {
  return runTrackedAction({
    eventName: "client.portal.program.read",
    action: async () => {
      const { context } = await requirePortalAccess("program");
      const admin = createAdminClient();

      const { data: assignment, error: assignmentError } = await admin
        .from("program_assignments")
        .select("*")
        .eq("client_id", context.client.id)
        .eq("status", "active")
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);
      if (!assignment) return { assignment: null, sessions: [], next_session: null as null | { id: string; sequence_no: number; title: string } };

      const { data: sessions, error: sessionsError } = await admin
        .from("program_assignment_workouts")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("sequence_no", { ascending: true });
      if (sessionsError) throw new Error(sessionsError.message);

      const next = (sessions || []).find((item) => !item.completed_at && !item.is_skipped) || null;

      return {
        assignment,
        sessions: sessions || [],
        next_session: next
          ? { id: next.id, sequence_no: next.sequence_no, title: next.title }
          : null,
      };
    },
  });
}

export async function getClientPortalMealPlanAction(performedOn?: string) {
  const safeDate = performedOn ? isoDateSchema.parse(performedOn) : null;
  return runTrackedAction({
    eventName: "client.portal.nutrition_plan.read",
    payload: { date: safeDate },
    action: async () => {
      const { context } = await requirePortalAccess("nutrition_plan");
      const admin = createAdminClient();
      const date = safeDate || todayIso();

      const { data: assignment, error: assignmentError } = await admin
        .from("nutrition_plan_assignments")
        .select("*")
        .eq("subject_client_id", context.client.id)
        .eq("status", "active")
        .lte("start_date", date)
        .gte("end_date", date)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw new Error(assignmentError.message);
      if (!assignment) return { source: "assignment" as const, plan: null };

      const groupIds = Array.from(new Set([assignment.template_plan_id, assignment.nutrition_plan_id].filter(Boolean)));
      const { data: groups, error: groupsError } = await admin
        .from("nutrition_plans")
        .select("id, name")
        .in("id", groupIds);
      if (groupsError) throw new Error(groupsError.message);

      const groupsById = new Map((groups || []).map((row) => [row.id, row]));
      const name =
        groupsById.get(assignment.template_plan_id)?.name ||
        groupsById.get(assignment.nutrition_plan_id)?.name ||
        "Assigned meal template";

      return {
        source: "assignment" as const,
        plan: {
          id: assignment.id,
          name,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
          daily_calorie_target: null,
          daily_protein_target_g: null,
          daily_carbs_target_g: null,
          daily_fat_target_g: null,
        },
      };
    },
  });
}

export async function getClientPortalMealDiaryAction(performedOn?: string) {
  const safeDate = performedOn ? isoDateSchema.parse(performedOn) : null;
  return runTrackedAction({
    eventName: "client.portal.diary.read",
    payload: { date: safeDate },
    action: async () => {
      const { context } = await requirePortalAccess("diary");
      const admin = createAdminClient();
      const date = safeDate || todayIso();

      const { data: logs, error: logsError } = await admin
        .from("diary_entries")
        .select("*")
        .eq("subject_client_id", context.client.id)
        .is("subject_user_id", null)
        .eq("performed_on", date)
        .order("meal_type", { ascending: true })
        .order("created_at", { ascending: true });
      if (logsError) throw new Error(logsError.message);

      const logIds = (logs || []).map((row) => row.id);
      const itemsByLog = new Map<string, MealLogItemRow[]>();
      if (logIds.length > 0) {
        const { data: items, error: itemsError } = await admin
          .from("diary_items")
          .select("*")
          .in("meal_log_id", logIds)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        if (itemsError) throw new Error(itemsError.message);
        for (const item of (items || []) as MealLogItemRow[]) {
          const existing = itemsByLog.get(item.meal_log_id) || [];
          existing.push(item);
          itemsByLog.set(item.meal_log_id, existing);
        }
      }

      const logsWithItems = (logs || []).map((log) => ({
        ...log,
        items: itemsByLog.get(log.id) || [],
      }));

      const totals = logsWithItems.reduce(
        (acc, log) => {
          acc.calories += safeNumber(log.total_calories);
          acc.protein_g += safeNumber(log.total_protein_g);
          acc.carbs_g += safeNumber(log.total_carbs_g);
          acc.fat_g += safeNumber(log.total_fat_g);
          acc.fiber_g += safeNumber(log.total_fiber_g);
          return acc;
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
      );

      return {
        performed_on: date,
        logs: logsWithItems,
        totals,
      };
    },
  });
}

export async function addClientMealItemAction(input: z.input<typeof addMealItemSchema>) {
  const payload = addMealItemSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.item.add",
    payload: { meal_type: payload.meal_type, performed_on: payload.performed_on },
    action: async () => {
      const { context } = await requirePortalAccess("diary", true);
      const admin = createAdminClient();
      const mealLog = await getOrCreateMealLog({
        client: context.client,
        performed_on: payload.performed_on,
        meal_type: payload.meal_type as MealType,
      });

      const { data: lastRow, error: lastRowError } = await admin
        .from("diary_items")
        .select("position")
        .eq("meal_log_id", mealLog.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRowError) throw new Error(lastRowError.message);
      const nextPosition = (lastRow?.position || 0) + 1;

      const insertPayload: MealLogItemInsert = {
        meal_log_id: mealLog.id,
        item_name: payload.item.item_name,
        quantity: payload.item.quantity ?? null,
        unit: payload.item.unit || null,
        calories: payload.item.calories ?? null,
        protein_g: payload.item.protein_g ?? null,
        carbs_g: payload.item.carbs_g ?? null,
        fat_g: payload.item.fat_g ?? null,
        fiber_g: payload.item.fiber_g ?? null,
        notes: payload.item.notes || null,
        is_quick_add: payload.item.is_quick_add ?? false,
        position: nextPosition,
      };

      const { data, error } = await admin
        .from("diary_items")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(context.client.id);
      return data as MealLogItemRow;
    },
  });
}

export async function removeClientMealItemAction(
  input: z.input<typeof removeMealItemSchema>
) {
  const payload = removeMealItemSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.item.remove",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("diary", true);
      const admin = createAdminClient();

      const { data: item, error: itemError } = await admin
        .from("diary_items")
        .select("id, meal_log_id")
        .eq("id", payload.item_id)
        .maybeSingle();
      if (itemError) throw new Error(itemError.message);
      if (!item) throw new Error("Meal item not found.");

      const { data: mealLog, error: logError } = await admin
        .from("diary_entries")
        .select("id, subject_client_id")
        .eq("id", item.meal_log_id)
        .maybeSingle();
      if (logError) throw new Error(logError.message);
      if (!mealLog || mealLog.subject_client_id !== context.client.id) {
        throw new Error("Forbidden");
      }

      const { error } = await admin.from("diary_items").delete().eq("id", payload.item_id);
      if (error) throw new Error(error.message);

      revalidateClientPortalPaths(context.client.id);
      return { success: true };
    },
  });
}

export async function listClientRecentMealItemsAction(input: z.input<typeof recentSchema>) {
  const payload = recentSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.recent",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("diary");
      const admin = createAdminClient();

      const { data: mealLogs, error: mealLogsError } = await admin
        .from("diary_entries")
        .select("id, performed_on")
        .eq("subject_client_id", context.client.id)
        .is("subject_user_id", null)
        .order("performed_on", { ascending: false })
        .limit(100);
      if (mealLogsError) throw new Error(mealLogsError.message);

      const logIds = (mealLogs || []).map((row) => row.id);
      if (logIds.length === 0) return [];

      const { data: items, error: itemsError } = await admin
        .from("diary_items")
        .select("item_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g, notes, created_at")
        .in("meal_log_id", logIds)
        .order("created_at", { ascending: false });
      if (itemsError) throw new Error(itemsError.message);

      const deduped = new Map<string, (typeof items)[number] & { last_used_at: string }>();
      for (const item of items || []) {
        const key = `${item.item_name.toLowerCase()}::${item.unit || ""}`;
        if (!deduped.has(key)) {
          deduped.set(key, {
            ...item,
            last_used_at: item.created_at,
          });
        }
        if (deduped.size >= payload.limit) break;
      }

      return Array.from(deduped.values()).slice(0, payload.limit);
    },
  });
}

export async function listClientFavoriteMealItemsAction(input: z.input<typeof recentSchema>): Promise<FavoriteRow[]> {
  const payload = recentSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.favorites",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("diary");
      if (!context.client.linked_user_id) {
        throw new Error("Client portal account is not linked to a user profile.");
      }
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("diary_favorites")
        .select("*")
        .eq("subject_user_id", context.client.linked_user_id)
        .order("last_used_at", { ascending: false })
        .limit(payload.limit);
      if (error) throw new Error(error.message);
      return (data || []) as FavoriteRow[];
    },
  });
}

export async function toggleClientFavoriteMealItemAction(
  input: z.input<typeof favoriteToggleSchema>
) {
  const payload = favoriteToggleSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.favorite.toggle",
    payload: { item_name: payload.item.item_name },
    action: async () => {
      const { context } = await requirePortalAccess("diary", true);
      if (!context.client.linked_user_id) {
        throw new Error("Client portal account is not linked to a user profile.");
      }
      const admin = createAdminClient();

      let query = admin
        .from("diary_favorites")
        .select("*")
        .eq("subject_user_id", context.client.linked_user_id)
        .ilike("item_name", payload.item.item_name.trim());
      query = payload.item.unit
        ? query.eq("unit", payload.item.unit)
        : query.is("unit", null);
      const { data: existing, error: existingError } = await query.maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existing) {
        const { error: deleteError } = await admin
          .from("diary_favorites")
          .delete()
          .eq("id", existing.id);
        if (deleteError) throw new Error(deleteError.message);
        revalidateClientPortalPaths(context.client.id);
        return { favorited: false };
      }

      const { error: insertError } = await admin
        .from("diary_favorites")
        .insert({
          subject_user_id: context.client.linked_user_id,
          item_name: payload.item.item_name,
          quantity: payload.item.quantity ?? null,
          unit: payload.item.unit || null,
          calories: payload.item.calories ?? null,
          protein_g: payload.item.protein_g ?? null,
          carbs_g: payload.item.carbs_g ?? null,
          fat_g: payload.item.fat_g ?? null,
          fiber_g: payload.item.fiber_g ?? null,
          notes: payload.item.notes || null,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
        });
      if (insertError) throw new Error(insertError.message);

      revalidateClientPortalPaths(context.client.id);
      return { favorited: true };
    },
  });
}

export async function copyClientMealsFromDateAction(input: z.input<typeof copyMealsSchema>) {
  const payload = copyMealsSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.diary.copy_day",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("diary", true);
      const admin = createAdminClient();

      const { data: sourceLogs, error: sourceLogsError } = await admin
        .from("diary_entries")
        .select("*")
        .eq("subject_client_id", context.client.id)
        .is("subject_user_id", null)
        .eq("performed_on", payload.source_date);
      if (sourceLogsError) throw new Error(sourceLogsError.message);

      const filteredLogs = (sourceLogs || []).filter((log) =>
        payload.meal_types?.length
          ? payload.meal_types.includes(log.meal_type as MealType)
          : true
      );

      const sourceLogIds = filteredLogs.map((log) => log.id);
      const itemsByMealType = new Map<MealType, MealLogItemRow[]>();
      if (sourceLogIds.length > 0) {
        const { data: sourceItems, error: sourceItemsError } = await admin
          .from("diary_items")
          .select("*")
          .in("meal_log_id", sourceLogIds)
          .order("position", { ascending: true });
        if (sourceItemsError) throw new Error(sourceItemsError.message);

        const logById = new Map<string, MealLogRow>(
          filteredLogs.map((log) => [log.id, log as MealLogRow])
        );
        for (const item of (sourceItems || []) as MealLogItemRow[]) {
          const sourceLog = logById.get(item.meal_log_id);
          if (!sourceLog) continue;
          const mealType = sourceLog.meal_type as MealType;
          const existing = itemsByMealType.get(mealType) || [];
          existing.push(item);
          itemsByMealType.set(mealType, existing);
        }
      }

      for (const [mealType, items] of itemsByMealType.entries()) {
        const targetLog = await getOrCreateMealLog({
          client: context.client,
          performed_on: payload.target_date,
          meal_type: mealType,
        });

        const { error: clearError } = await admin
          .from("diary_items")
          .delete()
          .eq("meal_log_id", targetLog.id);
        if (clearError) throw new Error(clearError.message);

        if (items.length === 0) continue;
        const clonedRows: MealLogItemInsert[] = items.map((item, index) => ({
          meal_log_id: targetLog.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          notes: item.notes,
          is_quick_add: item.is_quick_add,
          position: index + 1,
        }));
        const { error: cloneError } = await admin
          .from("diary_items")
          .insert(clonedRows);
        if (cloneError) throw new Error(cloneError.message);
      }

      revalidateClientPortalPaths(context.client.id);
      return { success: true };
    },
  });
}

export async function getClientStepsLogAction(performedOn?: string): Promise<ClientStepsRow | null> {
  const safeDate = performedOn ? isoDateSchema.parse(performedOn) : null;
  return runTrackedAction({
    eventName: "client.portal.steps.read",
    payload: { date: safeDate },
    action: async () => {
      const { context } = await requirePortalAccess("steps_tracking");
      const admin = createAdminClient();
      const date = safeDate || todayIso();
      const { data, error } = await admin
        .from("client_activity")
        .select("*")
        .eq("client_id", context.client.id)
        .eq("performed_on", date)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as ClientStepsRow | null) || null;
    },
  });
}

export async function upsertClientStepsLogAction(input: z.input<typeof stepsSchema>) {
  const payload = stepsSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.steps.save",
    payload,
    action: async () => {
      const { context } = await requirePortalAccess("steps_tracking", true);
      const admin = createAdminClient();
      const insertPayload: ClientStepsInsert = {
        client_id: context.client.id,
        performed_on: payload.performed_on,
        steps: payload.steps,
        notes: payload.notes || null,
        created_by_user_id: null,
        created_by_client_id: context.client.id,
      };
      const { error } = await admin
        .from("client_activity")
        .upsert(insertPayload, { onConflict: "client_id,performed_on" });
      if (error) throw new Error(error.message);
      revalidateClientPortalPaths(context.client.id);
      return { success: true };
    },
  });
}

export async function listClientPortalCheckinsAction(): Promise<CheckinRow[]> {
  return runTrackedAction({
    eventName: "client.portal.checkins.list",
    action: async () => {
      const { context } = await requirePortalAccess("check_ins");
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("client_reviews")
        .select("*")
        .eq("subject_client_id", context.client.id)
        .order("submitted_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []) as CheckinRow[];
    },
  });
}

export async function createClientPortalCheckinAction(
  input: z.input<typeof checkinSchema>
) {
  const payload = checkinSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.checkins.create",
    payload: { urgent: payload.urgent },
    action: async () => {
      const { context } = await requirePortalAccess("check_ins", true);
      const admin = createAdminClient();
      const insertPayload: CheckinInsert = {
        subject_client_id: context.client.id,
        subject_user_id: null,
        created_by_user_id: null,
        created_by_client_id: context.client.id,
        urgent: payload.urgent,
        notes: payload.notes || null,
        checkin_data: payload.checkin_data as Database["public"]["Tables"]["client_reviews"]["Insert"]["checkin_data"],
      };
      const { data, error } = await admin
        .from("client_reviews")
        .insert(insertPayload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      revalidateClientPortalPaths(context.client.id);
      return data as CheckinRow;
    },
  });
}

export async function getClientGoalsAction() {
  return runTrackedAction({
    eventName: "client.portal.goals.read",
    action: async () => {
      const { context } = await requirePortalAccess("goals");
      return {
        client_id: context.client.id,
        goals: context.client.goals || "",
      };
    },
  });
}

export async function updateClientGoalsAction(input: z.input<typeof goalsSchema>) {
  const payload = goalsSchema.parse(input);
  return runTrackedAction({
    eventName: "client.portal.goals.update",
    action: async () => {
      const { context } = await requirePortalAccess("goals", true);
      const admin = createAdminClient();
      const { error } = await admin
        .from("clients")
        .update({ goals: payload.goals })
        .eq("id", context.client.id);
      if (error) throw new Error(error.message);
      revalidateClientPortalPaths(context.client.id);
      return { success: true };
    },
  });
}
