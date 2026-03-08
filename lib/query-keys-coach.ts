export type CoachClientsKeyParams = {
  page: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "paused" | "blocked" | "archived" | "all";
};

export const coachKeys = {
  all: ["coach-tools"] as const,
  clients: () => [...coachKeys.all, "clients"] as const,
  clientList: (params: CoachClientsKeyParams) => [...coachKeys.clients(), params] as const,
  clientDetail: (clientId: string) => [...coachKeys.clients(), "detail", clientId] as const,
  clientAssignments: (clientId: string) => [...coachKeys.clients(), "assignments", clientId] as const,
  clientNextSession: (clientId: string) => [...coachKeys.clients(), "next-session", clientId] as const,
  clientTodaySessions: (clientId: string) => [...coachKeys.clients(), "today-sessions", clientId] as const,
  clientCheckins: (clientId: string) => [...coachKeys.clients(), "checkins", clientId] as const,
  clientNotes: (clientId: string) => [...coachKeys.clients(), "notes", clientId] as const,
  clientPayments: (clientId: string, includeArchived: boolean) =>
    [...coachKeys.clients(), "payments", clientId, includeArchived] as const,
  templates: () => [...coachKeys.all, "templates"] as const,
};

