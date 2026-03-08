export const trainingKeys = {
  plans: () => ["training_plans"] as const,
  plansList: () => [...trainingKeys.plans(), "list"] as const,
  plansInfinite: () => [...trainingKeys.plansList(), "infinite"] as const,
  sessions: () => ["training_sessions"] as const,
  session: (sessionId: string) => [...trainingKeys.sessions(), sessionId] as const,
};
