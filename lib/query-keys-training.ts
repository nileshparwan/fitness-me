export const trainingKeys = {
  plans: () => ["training_plans"] as const,
  plansList: () => [...trainingKeys.plans(), "list"] as const,
  plansInfinite: () => [...trainingKeys.plansList(), "infinite"] as const,
  planAssigneesBase: (programId: string) => [...trainingKeys.plans(), "assignees", programId] as const,
  planAssignees: (programId: string, search: string) => [...trainingKeys.planAssigneesBase(programId), search] as const,
  sessions: () => ["training_sessions"] as const,
  session: (sessionId: string) => [...trainingKeys.sessions(), sessionId] as const,
};
