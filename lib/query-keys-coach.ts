export type CoachClientsKeyParams = {
  page: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "paused" | "blocked" | "archived" | "all";
  sortBy?: "updated_at" | "created_at" | "first_name" | "status" | "email";
  sortDir?: "asc" | "desc";
};

export type CoachDashboardKeyParams = {
  attention_limit?: number;
  sessions_limit?: number;
  activity_limit?: number;
  goals_limit?: number;
  notes_limit?: number;
  payments_limit?: number;
};

export type CoachPaymentsKeyParams = {
  search?: string;
  status?: "all" | "paid" | "pending" | "overdue";
  limit?: number;
  page?: number;
  pageSize?: number;
  sortBy?: "payment_date" | "amount" | "status" | "updated_at" | "created_at";
  sortDir?: "asc" | "desc";
};

export type ClientPaymentLogsKeyParams = {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  page?: number;
  sortBy?: "session_date" | "amount" | "status" | "created_at";
  sortDir?: "asc" | "desc";
  status?: "all" | "logged" | "confirmed";
  search?: string;
};

export const DEFAULT_COACH_DASHBOARD_KEY_PARAMS: Required<CoachDashboardKeyParams> = {
  attention_limit: 4,
  sessions_limit: 6,
  activity_limit: 10,
  goals_limit: 3,
  notes_limit: 6,
  payments_limit: 4,
};

export function normalizeCoachDashboardKeyParams(
  params?: CoachDashboardKeyParams
): Required<CoachDashboardKeyParams> {
  return {
    attention_limit: params?.attention_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.attention_limit,
    sessions_limit: params?.sessions_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.sessions_limit,
    activity_limit: params?.activity_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.activity_limit,
    goals_limit: params?.goals_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.goals_limit,
    notes_limit: params?.notes_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.notes_limit,
    payments_limit: params?.payments_limit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.payments_limit,
  };
}

export const coachKeys = {
  all: ["coach-tools"] as const,
  clients: () => [...coachKeys.all, "clients"] as const,
  dashboard: () => [...coachKeys.all, "dashboard"] as const,
  payments: () => [...coachKeys.all, "payments"] as const,
  dashboardSnapshot: (params?: CoachDashboardKeyParams) =>
    [...coachKeys.dashboard(), normalizeCoachDashboardKeyParams(params)] as const,
  paymentsSnapshot: (params?: CoachPaymentsKeyParams) => [...coachKeys.payments(), params || {}] as const,
  clientList: (params: CoachClientsKeyParams) => [...coachKeys.clients(), params] as const,
  clientDetail: (clientId: string) => [...coachKeys.clients(), "detail", clientId] as const,
  clientAssignments: (clientId: string) => [...coachKeys.clients(), "assignments", clientId] as const,
  clientNextSession: (clientId: string) => [...coachKeys.clients(), "next-session", clientId] as const,
  clientTodaySessions: (clientId: string) => [...coachKeys.clients(), "today-sessions", clientId] as const,
  clientSessionsRange: (clientId: string, startDate: string, endDate: string) =>
    [...coachKeys.clients(), "sessions-range", clientId, startDate, endDate] as const,
  clientCheckins: (clientId: string) => [...coachKeys.clients(), "checkins", clientId] as const,
  clientNotes: (clientId: string) => [...coachKeys.clients(), "notes", clientId] as const,
  clientGoals: (
    clientId: string,
    status: "all" | "active" | "on_track" | "at_risk" | "completed" | "paused" | "archived" = "all"
  ) => [...coachKeys.clients(), "goals", clientId, status] as const,
  clientPayments: (clientId: string) => [...coachKeys.clients(), "payments", clientId] as const,
  billingPlan: (clientId: string) => [...coachKeys.clients(), "billing-plan", clientId] as const,
  billingPlanHistory: (clientId: string) => [...coachKeys.clients(), "billing-plan-history", clientId] as const,
  paymentLogs: (clientId: string, params?: ClientPaymentLogsKeyParams) =>
    [...coachKeys.clients(), "payment-logs", clientId, params || {}] as const,
  todayLogs: () => [...coachKeys.payments(), "today"] as const,
  templates: () => [...coachKeys.all, "templates"] as const,
};
