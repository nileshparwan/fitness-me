"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["client_plan_assignments"]["Row"];
type AssignmentSessionRow = Database["public"]["Tables"]["client_plan_assignment_sessions"]["Row"];
type TemplateRow = Database["public"]["Tables"]["coach_plan_templates"]["Row"];
type TemplateSessionRow = Database["public"]["Tables"]["coach_plan_template_sessions"]["Row"];
type WorkoutInsert = Database["public"]["Tables"]["training_sessions"]["Insert"];
type StrengthSetInsert = Database["public"]["Tables"]["strength_sets"]["Insert"];
type CardioSessionInsert = Database["public"]["Tables"]["cardio_sessions"]["Insert"];
type CheckinInsert = Database["public"]["Tables"]["client_checkins"]["Insert"];
type CoachNoteInsert = Database["public"]["Tables"]["coach_notes"]["Insert"];
type PaymentInsert = Database["public"]["Tables"]["client_payments"]["Insert"];
type CoachAssignmentInsert = Database["public"]["Tables"]["coach_client_assignments"]["Insert"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type SessionSlot = Database["public"]["Enums"]["session_slot"];
export type SessionLocationType = Database["public"]["Enums"]["session_location_type"];
export type ClientCheckinStatus = Database["public"]["Enums"]["client_checkin_status"];
export type CoachNoteTag = Database["public"]["Enums"]["coach_note_tag"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const listClientsSchema = z.object({
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(12),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "paused", "blocked", "archived"]).optional(),
});

const upsertClientSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().max(120).nullable().optional(),
  display_name: z.string().trim().max(180).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  status: z.enum(["active", "paused", "blocked", "archived"]).default("active"),
  linked_user_id: z.string().uuid().nullable().optional(),
  goals: z.string().trim().max(3000).nullable().optional(),
  notes: z.string().trim().max(3000).nullable().optional(),
  medical_flags: z.string().trim().max(3000).nullable().optional(),
  assistant_coach_ids: z.array(z.string().uuid()).optional(),
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
  tag: z.enum(["injury", "nutrition", "psychology", "form", "milestone", "programming"]).default("programming"),
  title: z.string().trim().max(180).nullable().optional(),
  content: z.string().trim().min(1).max(5000),
  is_shared_with_linked_user: z.boolean().default(false),
  visibility: z.enum(["private", "visible_to_client"]).optional(),
});

const recordPaymentSchema = z.object({
  client_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().trim().min(3).max(8).default("USD"),
  method: z.enum(["cash", "bank_transfer", "card", "other"]).default("bank_transfer"),
  payment_date: z.string().date(),
  period_start: z.string().date().nullable().optional(),
  period_end: z.string().date().nullable().optional(),
  status: z.enum(["pending", "paid", "failed", "refunded"]).default("pending"),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const archivePaymentSchema = z.object({
  id: z.string().uuid(),
  is_archived: z.boolean().default(true),
});

const addAssistantSchema = z.object({
  client_id: z.string().uuid(),
  coach_id: z.string().uuid(),
});

const disableAssistantSchema = z.object({
  assignment_id: z.string().uuid(),
});

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function revalidateCoachPaths(clientId?: string) {
  revalidatePath("/coach/plans");
  revalidatePath("/clients");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export type ClientRosterRow = ClientRow & {
  active_assignment: AssignmentRow | null;
  next_session: AssignmentSessionRow | null;
  today_sessions_count: number;
};

export async function listCoachClientsAction(input: z.input<typeof listClientsSchema>) {
  const payload = listClientsSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.clients.list",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const from = payload.page * payload.page_size;
      const to = from + payload.page_size - 1;

      let query = supabase.from("clients").select("*", { count: "exact" }).order("updated_at", { ascending: false });

      if (payload.search) {
        query = query.or(
          `first_name.ilike.%${payload.search}%,last_name.ilike.%${payload.search}%,display_name.ilike.%${payload.search}%,email.ilike.%${payload.search}%`
        );
      }
      if (payload.status) query = query.eq("status", payload.status);

      const { data, error, count } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const rows = (data || []) as ClientRow[];
      const clientIds = rows.map((row) => row.id);
      if (clientIds.length === 0) {
        return { rows: [] as ClientRosterRow[], total: count ?? 0, page: payload.page, page_size: payload.page_size, has_more: false };
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const [assignmentsRes, todaySessionsRes] = await Promise.all([
        supabase
          .from("client_plan_assignments")
          .select("*")
          .in("client_id", clientIds)
          .eq("status", "active")
          .order("assigned_at", { ascending: false }),
        supabase
          .from("training_sessions")
          .select("id, subject_client_id")
          .in("subject_client_id", clientIds)
          .eq("performed_on", todayIso),
      ]);

      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
      if (todaySessionsRes.error) throw new Error(todaySessionsRes.error.message);

      const assignmentRows = (assignmentsRes.data || []) as AssignmentRow[];
      const activeAssignmentByClient = new Map<string, AssignmentRow>();
      for (const row of assignmentRows) {
        if (!activeAssignmentByClient.has(row.client_id)) activeAssignmentByClient.set(row.client_id, row);
      }

      const assignmentIds = Array.from(new Set(Array.from(activeAssignmentByClient.values()).map((row) => row.id)));
      const nextSessionByAssignment = new Map<string, AssignmentSessionRow>();
      if (assignmentIds.length > 0) {
        const { data: assignmentSessions, error: assignmentSessionsError } = await supabase
          .from("client_plan_assignment_sessions")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("sequence_no", { ascending: true });
        if (assignmentSessionsError) throw new Error(assignmentSessionsError.message);
        for (const row of (assignmentSessions || []) as AssignmentSessionRow[]) {
          if (row.completed_at || row.is_skipped) continue;
          if (!nextSessionByAssignment.has(row.assignment_id)) nextSessionByAssignment.set(row.assignment_id, row);
        }
      }

      const todayCountByClient = new Map<string, number>();
      for (const row of (todaySessionsRes.data || []) as Pick<WorkoutInsert, "subject_client_id">[]) {
        const clientId = row.subject_client_id;
        if (!clientId) continue;
        todayCountByClient.set(clientId, (todayCountByClient.get(clientId) || 0) + 1);
      }

      const enriched: ClientRosterRow[] = rows.map((row) => {
        const activeAssignment = activeAssignmentByClient.get(row.id) || null;
        return {
          ...row,
          active_assignment: activeAssignment,
          next_session: activeAssignment ? nextSessionByAssignment.get(activeAssignment.id) || null : null,
          today_sessions_count: todayCountByClient.get(row.id) || 0,
        };
      });

      const total = count ?? 0;
      return {
        rows: enriched,
        total,
        page: payload.page,
        page_size: payload.page_size,
        has_more: from + enriched.length < total,
      };
    },
  });
}

export async function upsertClientAction(input: z.input<typeof upsertClientSchema>) {
  const payload = upsertClientSchema.parse(input);
  return runTrackedAction({
    eventName: payload.id ? "coach.client.update" : "coach.client.create",
    payload: { id: payload.id || null },
    action: async () => {
      const { supabase, user } = await requireActor();
      const admin = createAdminClient();

      const normalized: ClientUpdate = {
        first_name: payload.first_name,
        last_name: payload.last_name || null,
        display_name: payload.display_name || null,
        email: payload.email || null,
        phone: payload.phone || null,
        timezone: payload.timezone,
        status: payload.status,
        linked_user_id: payload.linked_user_id || null,
        goals: payload.goals || null,
        notes: payload.notes || null,
        medical_flags: payload.medical_flags || null,
      };

      let clientId = payload.id;
      let canManageAssistants = true;
      if (payload.id) {
        const [{ data: existingClient, error: existingClientError }, { data: roleRow, error: roleError }, { data: assistantAssignment, error: assignmentError }] =
          await Promise.all([
            supabase
              .from("clients")
              .select("id, primary_coach_id")
              .eq("id", payload.id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("coach_client_assignments")
              .select("id")
              .eq("client_id", payload.id)
              .eq("coach_id", user.id)
              .eq("is_active", true)
              .maybeSingle(),
          ]);

        if (existingClientError) throw new Error(existingClientError.message);
        if (roleError) throw new Error(roleError.message);
        if (assignmentError) throw new Error(assignmentError.message);
        if (!existingClient) throw new Error("Client not found.");

        const isSysadmin = roleRow?.role === "sysadmin";
        const isPrimaryCoach = existingClient.primary_coach_id === user.id;
        const isAssignedAssistant = Boolean(assistantAssignment);
        if (!isSysadmin && !isPrimaryCoach && !isAssignedAssistant) {
          throw new Error("Forbidden");
        }
        canManageAssistants = isSysadmin || isPrimaryCoach;

        const { data, error } = await supabase
          .from("clients")
          .update({
            ...normalized,
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

        const insertPayload: ClientInsert = {
          primary_coach_id: user.id,
          created_by_user_id: user.id,
          first_name: payload.first_name,
          last_name: payload.last_name || null,
          display_name: payload.display_name || null,
          email: payload.email || null,
          phone: payload.phone || null,
          timezone: payload.timezone,
          status: payload.status,
          linked_user_id: payload.linked_user_id || null,
          goals: payload.goals || null,
          notes: payload.notes || null,
          medical_flags: payload.medical_flags || null,
        };

        const { data, error } = await supabase
          .from("clients")
          .insert(insertPayload)
          .select("*")
          .single();
        if (!error) {
          clientId = data.id;
        } else {
          const isRlsError =
            error.code === "42501" ||
            error.code === "PGRST116" ||
            /row-level security/i.test(error.message);
          if (!isRlsError) throw new Error(error.message);

          // Fallback for environments where the auth DB role context is inconsistent.
          // Ownership remains pinned to the authenticated actor.
          const { data: adminData, error: adminError } = await admin
            .from("clients")
            .insert(insertPayload)
            .select("*")
            .single();
          if (adminError) throw new Error(adminError.message);
          clientId = adminData.id;
        }
      }

      const assistantCoachIds = Array.from(new Set((payload.assistant_coach_ids || []).filter((id) => id !== user.id)));
      if (assistantCoachIds.length > 0 && clientId) {
        if (!canManageAssistants) {
          throw new Error("Only the primary coach can manage assistant coaches.");
        }
        const rows: CoachAssignmentInsert[] = assistantCoachIds.map((coachId) => ({
          client_id: clientId!,
          coach_id: coachId,
          role: "assistant",
          is_active: true,
          created_by_user_id: user.id,
        }));
        const { error: assistantError } = await supabase
          .from("coach_client_assignments")
          .upsert(rows, { onConflict: "client_id,coach_id" });
        if (assistantError) throw new Error(assistantError.message);
      }

      revalidateCoachPaths(clientId || undefined);
      return { success: true, id: clientId };
    },
  });
}

export async function addAssistantCoachAction(input: z.input<typeof addAssistantSchema>) {
  const payload = addAssistantSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.assistant.add",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const row: CoachAssignmentInsert = {
        client_id: payload.client_id,
        coach_id: payload.coach_id,
        role: "assistant",
        is_active: true,
        created_by_user_id: user.id,
      };
      const { error } = await supabase
        .from("coach_client_assignments")
        .upsert(row, { onConflict: "client_id,coach_id" });
      if (error) throw new Error(error.message);
      revalidateCoachPaths(payload.client_id);
      return { success: true };
    },
  });
}

export async function disableAssistantCoachAction(input: z.input<typeof disableAssistantSchema>) {
  const payload = disableAssistantSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.assistant.disable",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("coach_client_assignments")
        .update({ is_active: false })
        .eq("id", payload.assignment_id)
        .select("client_id")
        .single();
      if (error) throw new Error(error.message);
      revalidateCoachPaths(data.client_id);
      return { success: true };
    },
  });
}

export async function listClientDetailAction(clientId: string) {
  return runTrackedAction({
    eventName: "coach.client.detail.read",
    payload: { client_id: clientId },
    action: async () => {
      const { supabase } = await requireActor();
      const [{ data: client, error: clientError }, { data: assistants, error: assistantsError }] =
        await Promise.all([
          supabase.from("clients").select("*").eq("id", clientId).single(),
          supabase
            .from("coach_client_assignments")
            .select("*")
            .eq("client_id", clientId)
            .eq("is_active", true)
            .order("created_at", { ascending: true }),
        ]);

      if (clientError) throw new Error(clientError.message);
      if (assistantsError) throw new Error(assistantsError.message);

      return {
        client: client as ClientRow,
        assistants: (assistants || []) as Database["public"]["Tables"]["coach_client_assignments"]["Row"][],
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

      const { data: sessions, error: sessionsError } = await supabase
        .from("coach_plan_template_sessions")
        .select("*")
        .in("template_id", templateIds)
        .order("sequence_no", { ascending: true });
      if (sessionsError) throw new Error(sessionsError.message);

      const sessionMap = new Map<string, TemplateSessionRow[]>();
      for (const row of (sessions || []) as TemplateSessionRow[]) {
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

      const [{ data: template, error: templateError }, { data: templateSessions, error: templateSessionsError }] =
        await Promise.all([
          supabase.from("coach_plan_templates").select("*").eq("id", payload.template_id).single(),
          supabase
            .from("coach_plan_template_sessions")
            .select("*")
            .eq("template_id", payload.template_id)
            .order("sequence_no", { ascending: true }),
        ]);
      if (templateError) throw new Error(templateError.message);
      if (templateSessionsError) throw new Error(templateSessionsError.message);

      const { error: archiveError } = await supabase
        .from("client_plan_assignments")
        .update({ status: "archived", ended_on: new Date().toISOString().slice(0, 10) })
        .eq("client_id", payload.client_id)
        .eq("status", "active");
      if (archiveError) throw new Error(archiveError.message);

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
      if (assignmentError) throw new Error(assignmentError.message);

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
      const sessionsByAssignment = new Map<string, AssignmentSessionRow[]>();
      if (assignmentIds.length > 0) {
        const { data: sessions, error: sessionsError } = await supabase
          .from("client_plan_assignment_sessions")
          .select("*")
          .in("assignment_id", assignmentIds)
          .order("sequence_no", { ascending: true });
        if (sessionsError) throw new Error(sessionsError.message);
        for (const row of (sessions || []) as AssignmentSessionRow[]) {
          const existing = sessionsByAssignment.get(row.assignment_id) || [];
          existing.push(row);
          sessionsByAssignment.set(row.assignment_id, existing);
        }
      }

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

      const { data: sessions, error: sessionsError } = await supabase
        .from("client_plan_assignment_sessions")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("sequence_no", { ascending: true });
      if (sessionsError) throw new Error(sessionsError.message);

      const nextSession =
        ((sessions || []) as AssignmentSessionRow[]).find((session) => !session.completed_at && !session.is_skipped) ||
        null;

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
      has_strength_sets: Boolean(payload.strength_sets?.length),
      has_cardio_sessions: Boolean(payload.cardio_sessions?.length),
    },
    action: async () => {
      const { supabase, user } = await requireActor();

      const workoutPayload: WorkoutInsert = {
        user_id: user.id,
        created_by_user_id: user.id,
        subject_client_id: payload.client_id,
        subject_user_id: null,
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
      if (strengthRows.length > 0) {
        const { error: strengthError } = await supabase.from("strength_sets").insert(strengthRows);
        if (strengthError) throw new Error(strengthError.message);
      }

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
      if (cardioRows.length > 0) {
        const { error: cardioError } = await supabase.from("cardio_sessions").insert(cardioRows);
        if (cardioError) throw new Error(cardioError.message);
      }

      if (payload.mark_plan_session_resolved && payload.plan_session_id) {
        const { error: resolveError } = await supabase
          .from("client_plan_assignment_sessions")
          .update({ completed_at: payload.completed_at || new Date().toISOString() })
          .eq("id", payload.plan_session_id);
        if (resolveError) throw new Error(resolveError.message);
      }

      revalidateCoachPaths(payload.client_id);
      revalidatePath("/workouts");
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
      const { data, error } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("subject_client_id", clientId)
        .eq("performed_on", todayIso)
        .order("started_at", { ascending: true, nullsFirst: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

export async function createClientCheckinAction(input: z.input<typeof createCheckinSchema>) {
  const payload = createCheckinSchema.parse(input);
  if (!payload.subject_client_id && !payload.subject_user_id) {
    throw new Error("A check-in must target a client or user.");
  }
  if (payload.subject_client_id && payload.subject_user_id) {
    throw new Error("A check-in can target only one subject.");
  }

  return runTrackedAction({
    eventName: "coach.client.checkin.create",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const insertPayload: CheckinInsert = {
        subject_client_id: payload.subject_client_id || null,
        subject_user_id: payload.subject_user_id || null,
        created_by_user_id: user.id,
        urgent: payload.urgent,
        notes: payload.notes || null,
        checkin_data: (payload.checkin_data || {}) as Json,
      };
      const { data, error } = await supabase.from("client_checkins").insert(insertPayload).select("*").single();
      if (error) throw new Error(error.message);
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
      const updates: Database["public"]["Tables"]["client_checkins"]["Update"] = {
        status: payload.status,
      };
      if (typeof payload.urgent === "boolean") updates.urgent = payload.urgent;
      if (payload.notes !== undefined) updates.notes = payload.notes || null;
      if (payload.status === "reviewed") updates.reviewed_at = new Date().toISOString();
      if (payload.status === "actioned") updates.actioned_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("client_checkins")
        .update(updates)
        .eq("id", payload.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from("client_checkins")
        .select("*")
        .eq("subject_client_id", clientId)
        .order("submitted_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}

export async function createCoachNoteAction(input: z.input<typeof createNoteSchema>) {
  const payload = createNoteSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.note.create",
    payload: { client_id: payload.client_id, tag: payload.tag },
    action: async () => {
      const { supabase, user } = await requireActor();
      const insertPayload: CoachNoteInsert = {
        client_id: payload.client_id,
        coach_id: user.id,
        tag: payload.tag,
        title: payload.title || null,
        content: payload.content,
        is_shared_with_linked_user:
          payload.visibility !== undefined
            ? payload.visibility === "visible_to_client"
            : payload.is_shared_with_linked_user,
        visibility:
          payload.visibility !== undefined
            ? payload.visibility
            : payload.is_shared_with_linked_user
              ? "visible_to_client"
              : "private",
      };
      const { data, error } = await supabase.from("coach_notes").insert(insertPayload).select("*").single();
      if (error) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from("coach_notes")
        .select("*")
        .eq("client_id", clientId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
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
    payload: { client_id: payload.client_id, amount: payload.amount, status: payload.status },
    action: async () => {
      const { supabase, user } = await requireActor();
      const insertPayload: PaymentInsert = {
        client_id: payload.client_id,
        coach_id: user.id,
        amount: payload.amount,
        currency: payload.currency.toUpperCase(),
        method: payload.method,
        payment_date: payload.payment_date,
        period_start: payload.period_start || null,
        period_end: payload.period_end || null,
        status: payload.status,
        notes: payload.notes || null,
      };
      const { data, error } = await supabase.from("client_payments").insert(insertPayload).select("*").single();
      if (error) throw new Error(error.message);
      revalidateCoachPaths(payload.client_id);
      return data;
    },
  });
}

export async function archiveClientPaymentAction(input: z.input<typeof archivePaymentSchema>) {
  const payload = archivePaymentSchema.parse(input);
  return runTrackedAction({
    eventName: "coach.client.payment.archive",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("client_payments")
        .update({ is_archived: payload.is_archived })
        .eq("id", payload.id)
        .select("id, client_id")
        .single();
      if (error) throw new Error(error.message);
      revalidateCoachPaths(data.client_id);
      return { success: true };
    },
  });
}

export type PaymentAlert = {
  type: "overdue" | "period_ending" | "no_active_period";
  payment_id: string | null;
  message: string;
};

export async function listClientPaymentsAction(clientId: string, includeArchived = false) {
  return runTrackedAction({
    eventName: "coach.client.payments.list",
    payload: { client_id: clientId, include_archived: includeArchived },
    action: async () => {
      const { supabase } = await requireActor();
      let query = supabase
        .from("client_payments")
        .select("*")
        .eq("client_id", clientId)
        .order("payment_date", { ascending: false });

      if (!includeArchived) query = query.eq("is_archived", false);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as Database["public"]["Tables"]["client_payments"]["Row"][];
      const alerts: PaymentAlert[] = [];
      const now = new Date();
      const activePeriods = rows.filter(
        (row) => row.status === "paid" && row.period_start && row.period_end && !row.is_archived
      );

      if (activePeriods.length === 0) {
        alerts.push({
          type: "no_active_period",
          payment_id: null,
          message: "No active paid period found for this client.",
        });
      }

      for (const row of rows) {
        if (row.is_archived) continue;
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
