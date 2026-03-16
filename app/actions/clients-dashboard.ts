"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import {
  classifyClientsDashboardActivityType,
  describeClientsDashboardActivity,
  extractActivityClientId,
  isRelevantClientsDashboardActivity,
  type ClientsDashboardData,
} from "@/lib/clients/dashboard";
import { activityMetadataObject, activityMetadataString } from "@/lib/nutrition/dashboard-activity";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type GoalHistoryRow = Pick<Database["public"]["Functions"]["get_coach_goal_history"]["Returns"][number], "goal_id" | "progress_percent" | "snapshot_at">;
type AnalyticsEventRow = Pick<Database["public"]["Tables"]["analytics_events"]["Row"], "id" | "event_name" | "metadata" | "created_at" | "user_id">;
type FallbackClientRow = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "linked_user_id" | "status" | "created_at" | "display_name" | "first_name" | "last_name"
>;
type SummaryRow = {
  client_id: string;
  linked_user_id: string | null;
  client_status: string;
  client_since: string;
  full_name: string | null;
  active_goals_count: number | string | null;
  completed_goals_count: number | string | null;
  at_risk_goals_count: number | string | null;
  last_goal_update: string | null;
  sessions_today_count: number | string | null;
  sessions_today_pending_count: number | string | null;
  mtd_revenue: number | string | null;
  pending_checkins: number | string | null;
  urgent_checkins: number | string | null;
  notes_last_30d: number | string | null;
  last_note_at: string | null;
  pending_payments_count: number | string | null;
  last_pending_payment_date: string | null;
};
type ServerClient = Awaited<ReturnType<typeof createClient>>;

const listClientsDashboardSchema = z.object({
  attention_limit: z.number().int().min(1).max(8).default(4),
  sessions_limit: z.number().int().min(1).max(12).default(6),
  activity_limit: z.number().int().min(1).max(10).default(10),
  goals_limit: z.number().int().min(1).max(3).default(3),
  notes_limit: z.number().int().min(1).max(10).default(6),
  payments_limit: z.number().int().min(1).max(8).default(4),
});

type DashboardInput = z.input<typeof listClientsDashboardSchema>;
type DashboardPayload = z.output<typeof listClientsDashboardSchema>;

function isoDateInUtc(value = new Date()) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function dateLabel(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMissingSchemaDependency(message: string | undefined, identifier: string) {
  if (!message) return false;
  const escaped = escapeRegExp(identifier);
  const patterns = [
    new RegExp(`Could not find the table ['"]public\\.${escaped}['"] in the schema cache`, "i"),
    new RegExp(`Could not find the function ['"]public\\.${escaped}[^'"]*['"] in the schema cache`, "i"),
    new RegExp(`relation ['"]?public\\.${escaped}['"]? does not exist`, "i"),
    new RegExp(`function ['"]?public\\.${escaped}[^'"]*['"] does not exist`, "i"),
    new RegExp(`\\b${escaped}\\b.*does not exist`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(message));
}

function formatFallbackClientName(row: FallbackClientRow) {
  const displayName = row.display_name?.trim();
  if (displayName) return displayName;
  const firstName = row.first_name?.trim();
  const lastName = row.last_name?.trim();
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  return combined || "Client";
}

async function loadFallbackSummaryRows(supabase: ServerClient, coachId: string): Promise<SummaryRow[]> {
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, linked_user_id, status, created_at, display_name, first_name, last_name")
    .eq("primary_coach_id", coachId)
    .eq("is_archived", false);

  if (error) throw new Error(error.message);

  return ((clients || []) as FallbackClientRow[]).map((client) => ({
    client_id: client.id,
    linked_user_id: client.linked_user_id,
    client_status: client.status,
    client_since: client.created_at,
    full_name: formatFallbackClientName(client),
    active_goals_count: 0,
    completed_goals_count: 0,
    at_risk_goals_count: 0,
    last_goal_update: null,
    sessions_today_count: 0,
    sessions_today_pending_count: 0,
    mtd_revenue: 0,
    pending_checkins: 0,
    urgent_checkins: 0,
    notes_last_30d: 0,
    last_note_at: null,
    pending_payments_count: 0,
    last_pending_payment_date: null,
  }));
}

export async function getClientsDashboardAction(input?: DashboardInput): Promise<ClientsDashboardData> {
  const payload = listClientsDashboardSchema.parse(input ?? {});
  return runTrackedAction({
    eventName: "coach.clients.dashboard.read",
    payload,
    action: async () => buildClientsDashboard(payload),
  });
}

async function buildClientsDashboard(payload: DashboardPayload): Promise<ClientsDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const todayIso = isoDateInUtc();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
  const recentlyUpdatedThreshold = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const [summaryRes, goalHistoryRes, activityRes] = await Promise.all([
    supabase.from("coach_client_summary").select("*").eq("coach_id", user.id),
    supabase.rpc("get_coach_goal_history", {
      p_coach_id: user.id,
      p_limit: 400,
    }),
    supabase
      .from("analytics_events")
      .select("id, event_name, metadata, created_at, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(180),
  ]);

  const missingLegacyCoachFn =
    isMissingSchemaDependency(activityRes.error?.message, "is_active_or_historical_coach_for_student") ||
    isMissingSchemaDependency(activityRes.error?.message, "is_org_admin_for_user");
  if (activityRes.error && !missingLegacyCoachFn) throw new Error(activityRes.error.message);

  const missingSummaryView = isMissingSchemaDependency(summaryRes.error?.message, "coach_client_summary");
  const missingGoalHistoryFn = isMissingSchemaDependency(goalHistoryRes.error?.message, "get_coach_goal_history");

  let summaryRows: SummaryRow[] = [];
  let goalHistoryRows: GoalHistoryRow[] = [];

  if (summaryRes.error && !missingSummaryView) {
    throw new Error(summaryRes.error.message);
  }
  if (goalHistoryRes.error && !missingGoalHistoryFn) {
    throw new Error(goalHistoryRes.error.message);
  }

  if (missingSummaryView) {
    console.warn(
      "[clients-dashboard] Missing A-006 view public.coach_client_summary. Falling back to base client summary."
    );
    summaryRows = await loadFallbackSummaryRows(supabase, user.id);
  } else {
    summaryRows = (summaryRes.data || []) as SummaryRow[];
  }

  if (missingGoalHistoryFn) {
    console.warn(
      "[clients-dashboard] Missing A-006 function public.get_coach_goal_history. Proceeding with empty goal history."
    );
    goalHistoryRows = [];
  } else {
    goalHistoryRows = (goalHistoryRes.data || []) as GoalHistoryRow[];
  }

  if (missingLegacyCoachFn) {
    console.warn(
      "[clients-dashboard] Missing policy helper function public.is_active_or_historical_coach_for_student. Proceeding with empty activity feed."
    );
  }
  const activityRows = (missingLegacyCoachFn ? [] : activityRes.data || []) as AnalyticsEventRow[];
  const numeric = (value: number | string | null | undefined) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const clientNameById = new Map<string, string>();
  for (const row of summaryRows) {
    const name = row.full_name && row.full_name.trim().length > 0 ? row.full_name : "Client";
    clientNameById.set(row.client_id, name);
  }
  const recentlyTrackedGoals = new Set(
    goalHistoryRows
      .filter((row) => new Date(row.snapshot_at).getTime() >= recentlyUpdatedThreshold)
      .map((row) => row.goal_id)
  ).size;

  const activeClients = summaryRows.filter((row) => row.client_status === "active").length;
  const activeClientsDeltaWeek = summaryRows.filter((row) => {
    if (row.client_status !== "active" || !row.client_since) return false;
    return new Date(row.client_since).getTime() >= weekAgo;
  }).length;
  const sessionsToday = summaryRows.reduce((sum, row) => sum + numeric(row.sessions_today_count), 0);
  const pendingSessions = summaryRows.reduce((sum, row) => sum + numeric(row.sessions_today_pending_count), 0);
  const checkinsDue = summaryRows.reduce((sum, row) => sum + numeric(row.pending_checkins), 0);
  const urgentCheckins = summaryRows.reduce((sum, row) => sum + numeric(row.urgent_checkins), 0);
  const revenueMtd = summaryRows.reduce((sum, row) => sum + numeric(row.mtd_revenue), 0);

  type AttentionDraft = {
    id: string;
    type: "checkin" | "payment" | "session" | "goal";
    client_id: string | null;
    client_name: string;
    context: string;
    priority: number;
    timestamp: number;
  };
  const attentionDraft: AttentionDraft[] = [];
  let atRiskGoals = 0;
  let completedGoals = 0;
  let recentlyUpdatedGoals = recentlyTrackedGoals;

  for (const row of summaryRows) {
    const clientName = clientNameById.get(row.client_id) || "Client";
    const pendingCheckins = numeric(row.pending_checkins);
    const urgent = numeric(row.urgent_checkins);
    const pendingPayments = numeric(row.pending_payments_count);
    const atRisk = numeric(row.at_risk_goals_count);
    const sessionsPending = numeric(row.sessions_today_pending_count);
    const lastGoalTimestamp = row.last_goal_update ? new Date(row.last_goal_update).getTime() : 0;
    const lastPaymentDate = row.last_pending_payment_date || todayIso;

    atRiskGoals += atRisk;
    completedGoals += numeric(row.completed_goals_count);
    if (lastGoalTimestamp >= recentlyUpdatedThreshold) recentlyUpdatedGoals += atRisk;

    if (urgent > 0) {
      attentionDraft.push({
        id: `checkin-urgent-${row.client_id}`,
        type: "checkin",
        client_id: row.client_id,
        client_name: clientName,
        context: `${urgent} urgent check-in${urgent === 1 ? "" : "s"} pending review`,
        priority: 0,
        timestamp: Date.now(),
      });
    } else if (pendingCheckins > 0) {
      attentionDraft.push({
        id: `checkin-${row.client_id}`,
        type: "checkin",
        client_id: row.client_id,
        client_name: clientName,
        context: `${pendingCheckins} pending check-in${pendingCheckins === 1 ? "" : "s"}`,
        priority: 1,
        timestamp: Date.now(),
      });
    }

    if (pendingPayments > 0) {
      attentionDraft.push({
        id: `payment-${row.client_id}`,
        type: "payment",
        client_id: row.client_id,
        client_name: clientName,
        context: `${pendingPayments} pending payment${pendingPayments === 1 ? "" : "s"} (${dateLabel(lastPaymentDate)})`,
        priority: 1,
        timestamp: parseIsoDate(lastPaymentDate)?.getTime() || 0,
      });
    }

    if (atRisk > 0) {
      attentionDraft.push({
        id: `goal-${row.client_id}`,
        type: "goal",
        client_id: row.client_id,
        client_name: clientName,
        context: `${atRisk} goal${atRisk === 1 ? "" : "s"} at risk`,
        priority: 0,
        timestamp: lastGoalTimestamp,
      });
    }

    if (sessionsPending > 0) {
      attentionDraft.push({
        id: `session-${row.client_id}`,
        type: "session",
        client_id: row.client_id,
        client_name: clientName,
        context: `${sessionsPending} session${sessionsPending === 1 ? "" : "s"} still pending today`,
        priority: 1,
        timestamp: Date.now(),
      });
    }
  }

  const needsAttention = attentionDraft
    .sort((a, b) => a.priority - b.priority || b.timestamp - a.timestamp)
    .slice(0, payload.attention_limit)
    .map(({ id, type, client_id, client_name, context }) => ({
      id,
      type,
      client_id,
      client_name,
      context,
    }));

  const todaySessions = summaryRows
    .filter((row) => numeric(row.sessions_today_count) > 0)
    .slice(0, payload.sessions_limit)
    .map((row) => {
      const pendingCount = numeric(row.sessions_today_pending_count);
      const totalCount = numeric(row.sessions_today_count);
      return {
        id: `session-${row.client_id}`,
        client_id: row.client_id,
        client_name: clientNameById.get(row.client_id) || "Client",
        session_label: `${totalCount} session${totalCount === 1 ? "" : "s"} today`,
        time_label: pendingCount > 0 ? "Pending" : "Completed",
        status: pendingCount > 0 ? ("pending" as const) : ("completed" as const),
      };
    });

  const liveActivity: ClientsDashboardData["live_activity"] = [];
  for (const row of activityRows) {
    if (!row.created_at) continue;
    if (!isRelevantClientsDashboardActivity(row.event_name)) continue;
    const metadata = activityMetadataObject(row.metadata);
    const status = activityMetadataString(metadata, "status");
    if (status && status !== "success") continue;

    const clientId = extractActivityClientId(row.metadata);
    const clientName = clientId ? clientNameById.get(clientId) || null : null;
    liveActivity.push({
      id: row.id,
      type: classifyClientsDashboardActivityType(row.event_name),
      message: describeClientsDashboardActivity({
        event_name: row.event_name,
        metadata: row.metadata,
        client_name: clientName,
      }),
      created_at: row.created_at,
    });

    if (liveActivity.length >= payload.activity_limit) break;
  }

  const clientGoals = summaryRows
    .filter((row) => numeric(row.at_risk_goals_count) > 0)
    .sort(
      (a, b) =>
        numeric(b.at_risk_goals_count) - numeric(a.at_risk_goals_count) ||
        (new Date(b.last_goal_update || 0).getTime() - new Date(a.last_goal_update || 0).getTime())
    )
    .slice(0, Math.min(payload.goals_limit, 3))
    .map((row) => ({
      id: `goal-${row.client_id}`,
      client_id: row.client_id,
      client_name: clientNameById.get(row.client_id) || "Client",
      title: clientNameById.get(row.client_id) || "Client",
      subtitle: `${numeric(row.at_risk_goals_count)} goal${numeric(row.at_risk_goals_count) === 1 ? "" : "s"} at risk`,
      attention_reason: "at_risk" as const,
      progress_percent: 0,
      status: "at_risk" as const,
      trend: "stable" as const,
      target_date: null,
      updated_at: row.last_goal_update || null,
      pace_delta: null,
      exceeded_days: 0,
    }));

  const recentNotes = summaryRows
    .filter((row) => numeric(row.notes_last_30d) > 0)
    .sort((a, b) => new Date(b.last_note_at || 0).getTime() - new Date(a.last_note_at || 0).getTime())
    .slice(0, payload.notes_limit)
    .map((row) => ({
      id: `note-${row.client_id}`,
      client_id: row.client_id,
      client_name: clientNameById.get(row.client_id) || "Client",
      tag: "general",
      snippet: `${numeric(row.notes_last_30d)} recent note${numeric(row.notes_last_30d) === 1 ? "" : "s"}`,
      created_at: row.last_note_at || new Date().toISOString(),
    }));

  const paymentAlerts = summaryRows
    .filter((row) => numeric(row.pending_payments_count) > 0)
    .sort(
      (a, b) =>
        new Date(b.last_pending_payment_date || 0).getTime() -
        new Date(a.last_pending_payment_date || 0).getTime()
    )
    .slice(0, payload.payments_limit)
    .map((row) => ({
      id: `payment-${row.client_id}`,
      client_id: row.client_id,
      client_name: clientNameById.get(row.client_id) || "Client",
      amount: 0,
      currency: "USD",
      status: "pending",
      payment_date: row.last_pending_payment_date || todayIso,
    }));

  return {
    today_iso: todayIso,
    kpis: {
      active_clients: activeClients,
      active_clients_delta_week: activeClientsDeltaWeek,
      sessions_today: sessionsToday,
      sessions_remaining: pendingSessions,
      checkins_due: checkinsDue,
      urgent_checkins: urgentCheckins,
      revenue_mtd: Math.round(revenueMtd),
      revenue_delta_pct: null,
    },
    needs_attention: needsAttention,
    today_sessions: todaySessions,
    live_activity: liveActivity,
    client_goals: clientGoals,
    goal_intelligence: {
      at_risk: atRiskGoals,
      near_deadline: 0,
      downtrend: 0,
      recently_completed: completedGoals,
      recently_updated: recentlyUpdatedGoals,
      overdue_count: 0,
      review_due_count: 0,
    },
    recent_notes: recentNotes,
    payment_alerts: paymentAlerts,
  };
}
