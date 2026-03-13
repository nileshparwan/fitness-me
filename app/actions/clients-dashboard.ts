"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import {
  classifyClientsDashboardActivityType,
  computeDaysBetween,
  computeGoalProgressPercent,
  computeGoalTrendFromHistory,
  computePaceDelta,
  computeReviewDue,
  daysUntilDate,
  describeClientsDashboardActivity,
  extractActivityClientId,
  formatClientDisplayName,
  formatGoalSubtitle,
  isRelevantClientsDashboardActivity,
  normalizeClientGoalStatus,
  type ClientsDashboardData,
} from "@/lib/clients/dashboard";
import { activityMetadataObject, activityMetadataString } from "@/lib/nutrition/dashboard-activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type ClientRow = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "display_name" | "first_name" | "last_name" | "status" | "is_archived" | "created_at" | "linked_user_id"
>;
type SessionRow = Pick<
  Database["public"]["Tables"]["training_sessions"]["Row"],
  "id" | "subject_client_id" | "name" | "session_label" | "session_slot" | "status" | "started_at" | "completed_at" | "performed_on"
>;
type CheckinRow = Pick<
  Database["public"]["Tables"]["client_checkins"]["Row"],
  "id" | "subject_client_id" | "status" | "urgent" | "submitted_at"
>;
type NoteRow = Pick<
  Database["public"]["Tables"]["coach_notes"]["Row"],
  "id" | "client_id" | "tag" | "title" | "content" | "created_at"
>;
type PaymentRow = Pick<
  Database["public"]["Tables"]["client_payments"]["Row"],
  "id" | "client_id" | "amount" | "currency" | "status" | "payment_date"
>;
type GoalRow = Pick<
  Database["public"]["Tables"]["fitness_goals"]["Row"],
  | "id"
  | "user_id"
  | "goal_type"
  | "custom_description"
  | "start_value"
  | "current_value"
  | "target_value"
  | "start_weight"
  | "current_weight"
  | "target_weight"
  | "status"
  | "start_date"
  | "target_date"
  | "priority"
  | "updated_at"
  | "goal_direction"
  | "check_in_interval_days"
>;
type GoalHistoryRow = Pick<
  Database["public"]["Tables"]["goal_progress_history"]["Row"],
  "goal_id" | "progress_percent" | "snapshot_at"
>;
type AnalyticsEventRow = Pick<
  Database["public"]["Tables"]["analytics_events"]["Row"],
  "id" | "event_name" | "metadata" | "created_at" | "user_id"
>;

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

const COMPLETED_SESSION_STATUSES = new Set(["completed", "done", "logged"]);
const MISSED_SESSION_STATUSES = new Set(["missed", "cancelled", "canceled", "failed", "skipped"]);

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

function formatSessionTimeLabel(session: SessionRow) {
  if (session.started_at) {
    const parsed = new Date(session.started_at);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed);
    }
  }

  if (session.session_slot === "morning") return "Morning";
  if (session.session_slot === "afternoon") return "Afternoon";
  if (session.session_slot === "evening") return "Evening";
  return "Any time";
}

function resolveSessionStatus(session: SessionRow) {
  const rawStatus = (session.status || "").toLowerCase();
  if (session.completed_at || COMPLETED_SESSION_STATUSES.has(rawStatus)) return "completed" as const;
  if (MISSED_SESSION_STATUSES.has(rawStatus)) return "missed" as const;
  if (rawStatus === "pending" || rawStatus === "planned" || rawStatus === "scheduled") return "pending" as const;
  return "scheduled" as const;
}

function nowMonthBoundaries(now: Date) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return { monthStart, lastMonthStart };
}

function withinMonth(value: string, monthStart: Date, nextMonthStart: Date) {
  const parsed = parseIsoDate(value);
  if (!parsed) return false;
  const timestamp = parsed.getTime();
  return timestamp >= monthStart.getTime() && timestamp < nextMonthStart.getTime();
}

function missingDashboardGoalsColumn(message: string): string | null {
  const schemaCacheMatch = message.match(
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column of ['"]fitness_goals['"] in the schema cache/i
  );
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const missingColumnMatches = [
    message.match(/column\s+(?:public\.)?fitness_goals\.([a-zA-Z0-9_]+)\s+does not exist/i),
    message.match(/column\s+['"]?([a-zA-Z0-9_]+)['"]?\s+of relation\s+['"]fitness_goals['"]\s+does not exist/i),
  ];

  for (const match of missingColumnMatches) {
    if (match?.[1]) return match[1];
  }

  return null;
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
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const todayIso = isoDateInUtc();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const ownedClientsRes = await supabase
    .from("clients")
    .select("id, display_name, first_name, last_name, status, is_archived, created_at, linked_user_id")
    .eq("primary_coach_id", user.id)
    .eq("is_archived", false);

  if (ownedClientsRes.error) throw new Error(ownedClientsRes.error.message);

  const ownedClients = (ownedClientsRes.data || []) as ClientRow[];
  const clients = ownedClients;
  const clientIds = clients.map((row) => row.id);
  const clientNameById = new Map<string, string>();
  const clientByLinkedUserId = new Map<string, ClientRow>();

  for (const row of clients) {
    clientNameById.set(row.id, formatClientDisplayName(row));
    if (row.linked_user_id) clientByLinkedUserId.set(row.linked_user_id, row);
  }

  const linkedUserIds = Array.from(clientByLinkedUserId.keys());

  const sessionsPromise = clientIds.length
    ? supabase
        .from("training_sessions")
        .select("id, subject_client_id, name, session_label, session_slot, status, started_at, completed_at, performed_on")
        .in("subject_client_id", clientIds)
        .eq("performed_on", todayIso)
        .order("started_at", { ascending: true, nullsFirst: true })
    : Promise.resolve({ data: [] as SessionRow[], error: null });

  const checkinsPromise = clientIds.length
    ? supabase
        .from("client_checkins")
        .select("id, subject_client_id, status, urgent, submitted_at")
        .in("subject_client_id", clientIds)
        .order("submitted_at", { ascending: false })
        .limit(240)
    : Promise.resolve({ data: [] as CheckinRow[], error: null });

  const notesPromise = supabase
    .from("coach_notes")
    .select("id, client_id, tag, title, content, created_at")
    .eq("coach_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.max(payload.notes_limit * 3, 20));

  const paymentsPromise = supabase
    .from("client_payments")
    .select("id, client_id, amount, currency, status, payment_date")
    .eq("coach_id", user.id)
    .order("payment_date", { ascending: false })
    .limit(400);

  const goalsPromise = linkedUserIds.length
    ? (async () => {
        const columns = [
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
          "status",
          "start_date",
          "target_date",
          "priority",
          "updated_at",
          "goal_direction",
          "check_in_interval_days",
        ];

        const runGoalsQuery = async (selectColumns: string[]) => {
          const { data, error } = await (admin.from("fitness_goals") as any)
            .select(selectColumns.join(", "))
            .in("user_id", linkedUserIds)
            .in("status", ["active", "on_track", "at_risk"])
            .order("priority", { ascending: true })
            .order("updated_at", { ascending: false })
            .limit(240);
          const errorMessage = error ? [error.message, error.details, error.hint].filter(Boolean).join(" | ") : null;
          return {
            data: (data || []) as GoalRow[],
            error: errorMessage ? { message: errorMessage } : null,
          };
        };

        let activeColumns = [...columns];
        let result = await runGoalsQuery(activeColumns);
        for (let attempt = 0; attempt < columns.length && result.error; attempt += 1) {
          const missingColumn = missingDashboardGoalsColumn(result.error.message);
          if (!missingColumn || !activeColumns.includes(missingColumn)) break;
          activeColumns = activeColumns.filter((column) => column !== missingColumn);
          result = await runGoalsQuery(activeColumns);
        }
        return result;
      })()
    : Promise.resolve({ data: [] as GoalRow[], error: null });

  const goalHistoryPromise = linkedUserIds.length
    ? admin
        .from("goal_progress_history")
        .select("goal_id, progress_percent, snapshot_at")
        .in("user_id", linkedUserIds)
        .order("snapshot_at", { ascending: false })
        .limit(240)
        .then((result) => {
          if (
            result.error &&
            /(goal_progress_history|relation .* does not exist|schema cache)/i.test(result.error.message)
          ) {
            return { data: [] as GoalHistoryRow[], error: null };
          }
          return result;
        })
    : Promise.resolve({ data: [] as GoalHistoryRow[], error: null });

  const activityPromise = admin
    .from("analytics_events")
    .select("id, event_name, metadata, created_at, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(180);

  const [sessionsRes, checkinsRes, notesRes, paymentsRes, goalsRes, goalHistoryRes, activityRes] = await Promise.all([
    sessionsPromise,
    checkinsPromise,
    notesPromise,
    paymentsPromise,
    goalsPromise,
    goalHistoryPromise,
    activityPromise,
  ]);

  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (checkinsRes.error) throw new Error(checkinsRes.error.message);
  if (notesRes.error) throw new Error(notesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (goalsRes.error) throw new Error(goalsRes.error.message);
  if (goalHistoryRes.error) throw new Error(goalHistoryRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);

  const sessions = (sessionsRes.data || []) as SessionRow[];
  const checkins = (checkinsRes.data || []) as CheckinRow[];
  const notes = (notesRes.data || []) as NoteRow[];
  const payments = (paymentsRes.data || []) as PaymentRow[];
  const goals = (goalsRes.data || []) as GoalRow[];
  const goalHistoryRows = (goalHistoryRes.data || []) as GoalHistoryRow[];
  const activityRows = (activityRes.data || []) as AnalyticsEventRow[];

  const goalHistoryByGoalId = new Map<string, GoalHistoryRow[]>();
  for (const row of goalHistoryRows) {
    const existing = goalHistoryByGoalId.get(row.goal_id) || [];
    if (existing.length < 3) {
      existing.push(row);
      goalHistoryByGoalId.set(row.goal_id, existing);
    }
  }

  const activeClients = clients.filter((row) => row.status === "active").length;
  const activeClientsDeltaWeek = clients.filter(
    (row) => row.status === "active" && row.created_at && new Date(row.created_at).getTime() >= weekAgo.getTime()
  ).length;

  const pendingSessions = sessions.filter((row) => {
    const status = resolveSessionStatus(row);
    return status === "pending" || status === "scheduled";
  }).length;

  const checkinsDue = checkins.filter((row) => row.status === "pending").length;
  const urgentCheckins = checkins.filter((row) => row.status === "pending" && row.urgent).length;

  const now = new Date();
  const { monthStart, lastMonthStart } = nowMonthBoundaries(now);
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const revenueMtd = payments.reduce((sum, row) => {
    if (row.status !== "paid" || !withinMonth(row.payment_date, monthStart, nextMonthStart)) return sum;
    return sum + Number(row.amount || 0);
  }, 0);

  const revenueLastMonth = payments.reduce((sum, row) => {
    if (row.status !== "paid" || !withinMonth(row.payment_date, lastMonthStart, monthStart)) return sum;
    return sum + Number(row.amount || 0);
  }, 0);

  const revenueDeltaPct =
    revenueLastMonth > 0 ? Math.round(((revenueMtd - revenueLastMonth) / revenueLastMonth) * 100) : revenueMtd > 0 ? 100 : null;

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
  let nearDeadlineGoals = 0;
  let downtrendGoals = 0;
  let recentlyCompletedGoals = 0;
  let recentlyUpdatedGoals = 0;
  let overdueGoals = 0;
  let reviewDueGoals = 0;
  const goalAttentionCandidates: Array<{
    row: GoalRow;
    client: ClientRow;
    progress: number;
    trend: "uptrend" | "downtrend" | "stable";
    status: "active" | "on_track" | "at_risk" | "completed" | "paused" | "archived";
    updatedTimestamp: number;
    paceDelta: number | null;
    exceededDays: number;
    attention_reason: "at_risk" | "near_deadline" | "downtrend";
    score: number;
  }> = [];

  for (const row of checkins) {
    if (row.status !== "pending") continue;
    const clientName = row.subject_client_id ? clientNameById.get(row.subject_client_id) || "Client" : "Client";
    const submittedAt = new Date(row.submitted_at).getTime();
    attentionDraft.push({
      id: `checkin-${row.id}`,
      type: "checkin",
      client_id: row.subject_client_id,
      client_name: clientName,
      context: row.urgent
        ? "Urgent check-in pending review"
        : `Check-in pending since ${Number.isNaN(submittedAt) ? "recently" : dateLabel(row.submitted_at.slice(0, 10))}`,
      priority: row.urgent ? 0 : 1,
      timestamp: Number.isNaN(submittedAt) ? 0 : submittedAt,
    });
  }

  for (const row of payments) {
    const clientName = clientNameById.get(row.client_id) || "Client";
    const paymentTime = parseIsoDate(row.payment_date)?.getTime() || 0;
    if (row.status === "pending" && row.payment_date <= todayIso) {
      attentionDraft.push({
        id: `payment-${row.id}`,
        type: "payment",
        client_id: row.client_id,
        client_name: clientName,
        context: `Payment pending (${dateLabel(row.payment_date)})`,
        priority: 1,
        timestamp: paymentTime,
      });
    }
  }

  for (const row of sessions) {
    const status = resolveSessionStatus(row);
    if (status !== "missed") continue;
    const clientName = row.subject_client_id ? clientNameById.get(row.subject_client_id) || "Client" : "Client";
    attentionDraft.push({
      id: `session-${row.id}`,
      type: "session",
      client_id: row.subject_client_id,
      client_name: clientName,
      context: `${row.session_label || row.name || "Session"} missed today`,
      priority: 1,
      timestamp: parseIsoDate(row.performed_on)?.getTime() || 0,
    });
  }

  const nowTimestamp = Date.now();
  const recentlyCompletedThreshold = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
  const recentlyUpdatedThreshold = nowTimestamp - 3 * 24 * 60 * 60 * 1000;

  for (const row of goals) {
    const client = clientByLinkedUserId.get(row.user_id);
    if (!client) continue;

    const goalDirection = (row as Record<string, unknown>).goal_direction as string | undefined;
    const checkInDays = (row as Record<string, unknown>).check_in_interval_days as number | null | undefined;
    const progress = computeGoalProgressPercent({
      goal_type: row.goal_type,
      goal_direction: goalDirection,
      start_value: row.start_value,
      start_weight: row.start_weight,
      current_value: row.current_value,
      target_value: row.target_value,
      current_weight: row.current_weight,
      target_weight: row.target_weight,
    });
    const trend = computeGoalTrendFromHistory(progress, goalHistoryByGoalId.get(row.id) || []);
    const status = normalizeClientGoalStatus(row.status);
    const daysToTarget = daysUntilDate(row.target_date, now);
    const elapsedDays = computeDaysBetween(row.start_date, todayIso);
    const durationDays = computeDaysBetween(row.start_date, row.target_date);
    const paceDelta = computePaceDelta({ elapsed_days: elapsedDays, duration_days: durationDays, progress_percent: progress });
    const goalTitle = formatGoalSubtitle({
      custom_description: row.custom_description,
      goal_type: row.goal_type,
    });
    const updatedTimestamp = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const clientName = formatClientDisplayName(client);

    const isOpenGoal = status !== "completed" && status !== "archived";
    const isAtRisk = status === "at_risk";
    const isDowntrend = trend === "downtrend" && isOpenGoal;
    const isNearDeadline =
      daysToTarget !== null &&
      daysToTarget >= 0 &&
      daysToTarget <= 7 &&
      isOpenGoal &&
      progress < 100;

    if (isAtRisk) atRiskGoals += 1;
    if (isDowntrend) downtrendGoals += 1;
    if (isNearDeadline) nearDeadlineGoals += 1;
    if (daysToTarget !== null && daysToTarget < 0 && progress < 100 && isOpenGoal) {
      overdueGoals += 1;
    }
    if (computeReviewDue({ updated_at: row.updated_at, check_in_interval_days: checkInDays ?? null, now })) {
      reviewDueGoals += 1;
    }
    if (status === "completed" && updatedTimestamp >= recentlyCompletedThreshold) {
      recentlyCompletedGoals += 1;
    }
    if (updatedTimestamp >= recentlyUpdatedThreshold) {
      recentlyUpdatedGoals += 1;
    }

    let attentionReason: "at_risk" | "near_deadline" | "downtrend" | null = null;
    if (isAtRisk) attentionReason = "at_risk";
    else if (isDowntrend) attentionReason = "downtrend";
    else if (isNearDeadline) attentionReason = "near_deadline";

    if (!attentionReason) continue;

    let score = 0;
    if (attentionReason === "at_risk") score += 100;
    if (attentionReason === "downtrend") score += 70;
    if (attentionReason === "near_deadline") score += 60;
    score += Math.max(0, progress - 40);

    goalAttentionCandidates.push({
      row,
      client,
      progress,
      trend,
      status,
      updatedTimestamp,
      paceDelta,
      exceededDays: daysToTarget !== null && daysToTarget < 0 ? Math.abs(daysToTarget) : 0,
      attention_reason: attentionReason,
      score,
    });

    if (attentionReason === "at_risk") {
      attentionDraft.push({
        id: `goal-${row.id}-risk`,
        type: "goal",
        client_id: client.id,
        client_name: clientName,
        context: `${goalTitle} is at risk`,
        priority: 0,
        timestamp: updatedTimestamp,
      });
      continue;
    }

    if (attentionReason === "downtrend") {
      attentionDraft.push({
        id: `goal-${row.id}-trend`,
        type: "goal",
        client_id: client.id,
        client_name: clientName,
        context: `${goalTitle} is trending down (${progress}%)`,
        priority: 1,
        timestamp: updatedTimestamp,
      });
      continue;
    }

    if (attentionReason === "near_deadline" && daysToTarget !== null) {
      attentionDraft.push({
        id: `goal-${row.id}-deadline`,
        type: "goal",
        client_id: client.id,
        client_name: clientName,
        context: `${goalTitle} is due in ${daysToTarget} day${daysToTarget === 1 ? "" : "s"}`,
        priority: 1,
        timestamp: updatedTimestamp,
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

  const todaySessions = sessions.slice(0, payload.sessions_limit).map((row) => ({
    id: row.id,
    client_id: row.subject_client_id,
    client_name: row.subject_client_id ? clientNameById.get(row.subject_client_id) || "Client" : "Client",
    session_label: row.session_label || row.name || "Session",
    time_label: formatSessionTimeLabel(row),
    status: resolveSessionStatus(row),
  }));

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

  const goalsLimit = Math.min(payload.goals_limit, 3);
  const goalCandidates = goalAttentionCandidates.sort((a, b) => b.score - a.score || b.updatedTimestamp - a.updatedTimestamp);
  const clientGoals: ClientsDashboardData["client_goals"] = [];
  for (const item of goalCandidates) {
    clientGoals.push({
      id: item.row.id,
      client_id: item.client.id,
      client_name: formatClientDisplayName(item.client),
      title: formatClientDisplayName(item.client),
      subtitle: formatGoalSubtitle({
        custom_description: item.row.custom_description,
        goal_type: item.row.goal_type,
      }),
      attention_reason: item.attention_reason,
      progress_percent: item.progress,
      status: item.status,
      trend: item.trend,
      target_date: item.row.target_date || null,
      updated_at: item.row.updated_at || null,
      pace_delta: item.paceDelta,
      exceeded_days: item.exceededDays,
    });

    if (clientGoals.length >= goalsLimit) break;
  }

  const recentNotes = notes.slice(0, payload.notes_limit).map((row) => ({
    id: row.id,
    client_id: row.client_id,
    client_name: clientNameById.get(row.client_id) || "Client",
    tag: row.tag,
    snippet: row.title ? `${row.title}: ${row.content}` : row.content,
    created_at: row.created_at,
  }));

  const paymentAlerts = payments
    .filter((row) => row.status === "pending")
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
    .slice(0, payload.payments_limit)
    .map((row) => ({
      id: row.id,
      client_id: row.client_id,
      client_name: clientNameById.get(row.client_id) || "Client",
      amount: Number(row.amount || 0),
      currency: row.currency || "USD",
      status: row.status,
      payment_date: row.payment_date,
    }));

  return {
    today_iso: todayIso,
    kpis: {
      active_clients: activeClients,
      active_clients_delta_week: activeClientsDeltaWeek,
      sessions_today: sessions.length,
      sessions_remaining: pendingSessions,
      checkins_due: checkinsDue,
      urgent_checkins: urgentCheckins,
      revenue_mtd: Math.round(revenueMtd),
      revenue_delta_pct: revenueDeltaPct,
    },
    needs_attention: needsAttention,
    today_sessions: todaySessions,
    live_activity: liveActivity,
    client_goals: clientGoals,
    goal_intelligence: {
      at_risk: atRiskGoals,
      near_deadline: nearDeadlineGoals,
      downtrend: downtrendGoals,
      recently_completed: recentlyCompletedGoals,
      recently_updated: recentlyUpdatedGoals,
      overdue_count: overdueGoals,
      review_due_count: reviewDueGoals,
    },
    recent_notes: recentNotes,
    payment_alerts: paymentAlerts,
  };
}
