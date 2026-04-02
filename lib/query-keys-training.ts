export const trainingKeys = {
  plans: () => ["programs"] as const,
  plansList: () => [...trainingKeys.plans(), "list"] as const,
  plansInfinite: () => [...trainingKeys.plansList(), "infinite"] as const,
  planAssigneesBase: (programId: string) => [...trainingKeys.plans(), "assignees", programId] as const,
  planAssignees: (programId: string, search: string) => [...trainingKeys.planAssigneesBase(programId), search] as const,
  sessions: () => ["workouts"] as const,
  session: (sessionId: string) => [...trainingKeys.sessions(), sessionId] as const,
  executionSubjects: () => [...trainingKeys.sessions(), "execution_subjects"] as const,
  executionSubjectsSearch: (search: string) => [...trainingKeys.executionSubjects(), search] as const,
};
