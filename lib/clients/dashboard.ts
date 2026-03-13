import { activityMetadataObject, activityMetadataString, describeNutritionActivity } from "@/lib/nutrition/dashboard-activity";
import type { Json } from "@/types/database";

const READ_ONLY_ACTIVITY_TOKENS = [
  ".read",
  ".list",
  ".detail",
  ".recent",
  ".favorites",
  ".summary",
  ".options",
  ".assignable-subjects",
] as const;

const RELEVANT_ACTIVITY_PREFIXES = ["coach.", "client.portal.", "nutrition.", "workout."] as const;

export type ClientsDashboardActivityType =
  | "workout"
  | "meal"
  | "checkin"
  | "note"
  | "payment"
  | "goal"
  | "group"
  | "client"
  | "assignment"
  | "generic";

export const CLIENT_GOAL_STATUS_VALUES = [
  "active",
  "on_track",
  "at_risk",
  "completed",
  "paused",
  "archived",
] as const;

export type ClientGoalStatus = (typeof CLIENT_GOAL_STATUS_VALUES)[number];
export type ClientGoalTrend = "uptrend" | "downtrend" | "stable";

export type ClientsDashboardKpis = {
  active_clients: number;
  active_clients_delta_week: number;
  sessions_today: number;
  sessions_remaining: number;
  checkins_due: number;
  urgent_checkins: number;
  revenue_mtd: number;
  revenue_delta_pct: number | null;
};

export type ClientsDashboardAttentionType = "checkin" | "payment" | "session" | "goal";

export type ClientsDashboardAttentionItem = {
  id: string;
  type: ClientsDashboardAttentionType;
  client_id: string | null;
  client_name: string;
  context: string;
};

export type ClientsDashboardSessionStatus = "scheduled" | "pending" | "completed" | "missed";

export type ClientsDashboardSessionItem = {
  id: string;
  client_id: string | null;
  client_name: string;
  session_label: string;
  time_label: string;
  status: ClientsDashboardSessionStatus;
};

export type ClientsDashboardActivityItem = {
  id: string;
  type: ClientsDashboardActivityType;
  message: string;
  created_at: string;
};

export type ClientsDashboardGoalItem = {
  id: string;
  client_id: string | null;
  client_name: string;
  title: string;
  subtitle: string;
  attention_reason: "at_risk" | "near_deadline" | "downtrend";
  progress_percent: number;
  status: ClientGoalStatus;
  trend: ClientGoalTrend;
  target_date: string | null;
  updated_at: string | null;
  pace_delta: number | null;
  exceeded_days: number;
};

export type ClientsDashboardNoteItem = {
  id: string;
  client_id: string | null;
  client_name: string;
  tag: string;
  snippet: string;
  created_at: string;
};

export type ClientsDashboardPaymentAlertItem = {
  id: string;
  client_id: string | null;
  client_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
};

export type ClientsDashboardData = {
  today_iso: string;
  kpis: ClientsDashboardKpis;
  needs_attention: ClientsDashboardAttentionItem[];
  today_sessions: ClientsDashboardSessionItem[];
  live_activity: ClientsDashboardActivityItem[];
  client_goals: ClientsDashboardGoalItem[];
  goal_intelligence: {
    at_risk: number;
    near_deadline: number;
    downtrend: number;
    recently_completed: number;
    recently_updated: number;
    overdue_count: number;
    review_due_count: number;
  };
  recent_notes: ClientsDashboardNoteItem[];
  payment_alerts: ClientsDashboardPaymentAlertItem[];
};

export function formatClientDisplayName(input: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  if (input.display_name && input.display_name.trim().length > 0) return input.display_name.trim();
  const fullName = `${input.first_name || ""} ${input.last_name || ""}`.replace(/\s+/g, " ").trim();
  return fullName || "Client";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeClientGoalStatus(value: string | null | undefined): ClientGoalStatus {
  const safe = (value || "").toLowerCase();
  if (CLIENT_GOAL_STATUS_VALUES.includes(safe as ClientGoalStatus)) return safe as ClientGoalStatus;
  return "active";
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function lowerCaseFirst(input: string) {
  if (!input) return input;
  return `${input.charAt(0).toLowerCase()}${input.slice(1)}`;
}

function withClientPrefix(clientName: string | null | undefined, actionText: string) {
  if (!clientName) return actionText;
  return `${clientName} ${lowerCaseFirst(actionText)}`;
}

function humanizeEventName(eventName: string) {
  return eventName
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeGoalType(goalType: string | null | undefined) {
  if (!goalType) return "Goal";
  return goalType
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatCurrencyAmount(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount)}`;
  }
}

export function computeGoalProgressPercent(input: {
  goal_type?: string | null;
  goal_direction?: string | null;
  start_value?: number | null;
  start_weight?: number | null;
  current_value?: number | null;
  target_value?: number | null;
  current_weight?: number | null;
  target_weight?: number | null;
}) {
  const hasWeightMetrics =
    typeof input.target_weight === "number" &&
    input.target_weight > 0 &&
    typeof input.current_weight === "number" &&
    input.current_weight > 0;

  const isWeightGoal =
    isLegacyWeightGoal(input.goal_type) || (input.goal_type || "").toLowerCase().replace(/\s+/g, "_").includes("weight");

  const inferDirectionFromValues = (start: number | null, target: number | null): "increase" | "decrease" | null => {
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

  const resolveDirection = (): "increase" | "decrease" => {
    const inferredFromStartWeight = inferDirectionFromValues(input.start_weight ?? null, input.target_weight ?? null);
    const inferredFromStartValue = inferDirectionFromValues(input.start_value ?? null, input.target_value ?? null);
    const inferredFromStart = inferredFromStartWeight ?? inferredFromStartValue;

    if (input.goal_direction === "increase" || input.goal_direction === "decrease") {
      // Self-heal records where persisted direction is stale/incorrect for the start->target trajectory.
      if (inferredFromStart && inferredFromStart !== input.goal_direction) return inferredFromStart;
      return input.goal_direction;
    }
    if (inferredFromStart) return inferredFromStart;

    if (hasWeightMetrics) {
      const current = input.current_weight as number;
      const target = input.target_weight as number;
      if (current > target) return "decrease";
      if (current < target) return "increase";
    }
    if (
      typeof input.current_value === "number" &&
      Number.isFinite(input.current_value) &&
      typeof input.target_value === "number" &&
      Number.isFinite(input.target_value)
    ) {
      if (input.current_value > input.target_value) return "decrease";
      if (input.current_value < input.target_value) return "increase";
    }
    if (isLegacyDecreaseGoal(input.goal_type)) return "decrease";
    return "increase";
  };

  if (hasWeightMetrics && isWeightGoal) {
    const isDecreaseGoal = resolveDirection() === "decrease";
    if (isDecreaseGoal) {
      if ((input.current_weight as number) <= (input.target_weight as number)) return 100;
      return clampPercent(((input.target_weight as number) / (input.current_weight as number)) * 100);
    }
    if ((input.current_weight as number) >= (input.target_weight as number)) return 100;
    return clampPercent(((input.current_weight as number) / (input.target_weight as number)) * 100);
  }

  if (typeof input.target_value === "number" && input.target_value > 0 && typeof input.current_value === "number") {
    return clampPercent((input.current_value / input.target_value) * 100);
  }

  if (hasWeightMetrics) {
    const isDecreaseGoal = resolveDirection() === "decrease";
    if (isDecreaseGoal) {
      if ((input.current_weight as number) <= (input.target_weight as number)) return 100;
      return clampPercent(((input.target_weight as number) / (input.current_weight as number)) * 100);
    }
    if ((input.current_weight as number) >= (input.target_weight as number)) return 100;
    return clampPercent(((input.current_weight as number) / (input.target_weight as number)) * 100);
  }

  return 0;
}

function isLegacyWeightGoal(goalType: string | null | undefined) {
  const t = (goalType || "").toLowerCase();
  return t.includes("weight") || t.includes("lose") || t.includes("loss") || t.includes("cut") || t.includes("fat");
}

function isLegacyDecreaseGoal(goalType: string | null | undefined) {
  const t = (goalType || "").toLowerCase();
  return t.includes("lose") || t.includes("loss") || t.includes("cut") || t.includes("fat");
}

export function computeGoalTrend(currentProgress: number, previousProgress?: number | null): ClientGoalTrend {
  if (!Number.isFinite(currentProgress)) return "stable";
  if (!Number.isFinite(previousProgress ?? NaN)) return "stable";
  if (currentProgress > (previousProgress as number)) return "uptrend";
  if (currentProgress < (previousProgress as number)) return "downtrend";
  return "stable";
}

export function computeGoalTrendFromHistory(
  currentProgress: number,
  history: Array<{ progress_percent: number }>
): ClientGoalTrend {
  if (history.length >= 2) {
    return computeGoalTrend(history[0].progress_percent, history[1].progress_percent);
  }
  if (history.length === 1) {
    return computeGoalTrend(currentProgress, history[0].progress_percent);
  }
  return "stable";
}

export function daysUntilDate(isoDate: string | null | undefined, now = new Date()) {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const midnightNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const midnightTarget = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return Math.ceil((midnightTarget - midnightNow) / (1000 * 60 * 60 * 24));
}

export function computeDaysBetween(startIso: string | null | undefined, endIso: string | null | undefined) {
  if (!startIso || !endIso) return null;
  const s = new Date(`${startIso.slice(0, 10)}T00:00:00.000Z`);
  const e = new Date(`${endIso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export function computePaceDelta(input: {
  elapsed_days: number | null;
  duration_days: number | null;
  progress_percent: number;
}): number | null {
  if (
    input.elapsed_days === null ||
    input.duration_days === null ||
    input.duration_days <= 0
  ) {
    return null;
  }
  const expected = (input.elapsed_days / input.duration_days) * 100;
  return Math.round(input.progress_percent - expected);
}

export function computeReviewDue(input: {
  updated_at: string | null;
  check_in_interval_days: number | null;
  now?: Date;
}): boolean {
  if (!input.updated_at || !input.check_in_interval_days || input.check_in_interval_days <= 0) return false;
  const updated = new Date(input.updated_at).getTime();
  if (Number.isNaN(updated)) return false;
  const threshold = updated + input.check_in_interval_days * 24 * 60 * 60 * 1000;
  return (input.now ?? new Date()).getTime() > threshold;
}

export function formatGoalSubtitle(input: {
  custom_description?: string | null;
  goal_type?: string | null;
}) {
  if (input.custom_description && input.custom_description.trim().length > 0) {
    return input.custom_description.trim();
  }
  return normalizeGoalType(input.goal_type);
}

export function isRelevantClientsDashboardActivity(eventName: string) {
  const lower = eventName.toLowerCase();
  if (READ_ONLY_ACTIVITY_TOKENS.some((token) => lower.includes(token))) return false;
  return RELEVANT_ACTIVITY_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function classifyClientsDashboardActivityType(eventName: string): ClientsDashboardActivityType {
  const lower = eventName.toLowerCase();
  if (lower.includes("workout") || lower.includes("session")) return "workout";
  if (lower.includes("meal") || lower.includes("nutrition")) return "meal";
  if (lower.includes("checkin")) return "checkin";
  if (lower.includes("note")) return "note";
  if (lower.includes("payment")) return "payment";
  if (lower.includes("goal")) return "goal";
  if (lower.includes("meal-group") || lower.includes("meal-groups") || lower.includes(".group")) return "group";
  if (lower.includes(".assign")) return "assignment";
  if (lower.includes(".client")) return "client";
  return "generic";
}

export function extractActivityClientId(metadataInput: Json | Record<string, unknown> | null) {
  const metadata = activityMetadataObject(metadataInput as Json | null);
  return (
    activityMetadataString(metadata, "subject_client_id") ||
    activityMetadataString(metadata, "client_id") ||
    activityMetadataString(metadata, "created_by_client_id")
  );
}

export function describeClientsDashboardActivity(input: {
  event_name: string;
  metadata: Json | null;
  client_name?: string | null;
}) {
  const eventName = input.event_name;
  const lower = eventName.toLowerCase();
  const metadata = activityMetadataObject(input.metadata);

  if (lower.startsWith("nutrition.")) {
    const nutritionText = describeNutritionActivity(eventName, metadata);
    return withClientPrefix(input.client_name, nutritionText);
  }

  if (eventName === "coach.client.workout.log" || eventName === "client.portal.workout.log") {
    const workoutName =
      activityMetadataString(metadata, "session_name") ||
      activityMetadataString(metadata, "name") ||
      activityMetadataString(metadata, "session_label") ||
      "workout";
    return withClientPrefix(input.client_name, `Completed ${workoutName}`);
  }

  if (eventName === "coach.client.note.create" || eventName === "client.portal.notes.create") {
    const tag = activityMetadataString(metadata, "tag");
    return withClientPrefix(input.client_name, `Added ${tag ? `${tag} ` : ""}coach note`);
  }

  if (eventName === "coach.client.checkin.create" || eventName === "client.portal.checkins.create") {
    return withClientPrefix(input.client_name, "Submitted check-in");
  }

  if (eventName === "coach.client.checkin.update") {
    const status = activityMetadataString(metadata, "status");
    return withClientPrefix(input.client_name, `Updated check-in${status ? ` (${status})` : ""}`);
  }

  if (eventName === "coach.client.payment.record") {
    const amount = metadataNumber(metadata, "amount");
    const currency = activityMetadataString(metadata, "currency") || "USD";
    const status = (activityMetadataString(metadata, "status") || "pending").toUpperCase();
    if (typeof amount === "number") {
      return withClientPrefix(input.client_name, `Recorded ${formatCurrencyAmount(amount, currency)} payment (${status})`);
    }
    return withClientPrefix(input.client_name, `Recorded payment (${status})`);
  }

  if (eventName === "coach.client.plan.assign") {
    const planName = activityMetadataString(metadata, "name") || activityMetadataString(metadata, "plan_name");
    return withClientPrefix(input.client_name, `Assigned ${planName ? `"${planName}" ` : ""}plan`);
  }

  if (eventName === "coach.client.goal.create") {
    const goalTitle = activityMetadataString(metadata, "goal_title");
    return withClientPrefix(input.client_name, `Added ${goalTitle ? `"${goalTitle}" ` : ""}goal`);
  }

  if (eventName === "coach.client.goal.update") {
    const goalTitle = activityMetadataString(metadata, "goal_title");
    const status = activityMetadataString(metadata, "status");
    return withClientPrefix(
      input.client_name,
      `Updated ${goalTitle ? `"${goalTitle}" ` : ""}goal${status ? ` (${status})` : ""}`
    );
  }

  if (eventName === "coach.client.goal.delete") {
    const goalTitle = activityMetadataString(metadata, "goal_title");
    return withClientPrefix(input.client_name, `Deleted ${goalTitle ? `"${goalTitle}" ` : ""}goal`);
  }

  if (eventName === "coach.client.create") {
    const createdClientName = activityMetadataString(metadata, "client_name") || input.client_name || "client";
    return `Created ${createdClientName}`;
  }

  if (eventName === "coach.client.update") {
    const updatedClientName = activityMetadataString(metadata, "client_name") || input.client_name || "client";
    return `Updated ${updatedClientName}`;
  }

  return withClientPrefix(input.client_name, humanizeEventName(eventName));
}
