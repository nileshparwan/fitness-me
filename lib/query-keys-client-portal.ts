import type { ClientModuleKey } from "@/lib/client-portal/constants";

export const clientPortalKeys = {
  all: ["client-portal"] as const,
  dashboard: () => [...clientPortalKeys.all, "dashboard"] as const,
  tasks: () => [...clientPortalKeys.all, "tasks"] as const,
  notes: () => [...clientPortalKeys.all, "notes"] as const,
  workouts: (performedOn: string) =>
    [...clientPortalKeys.all, "workouts", performedOn] as const,
  trainingPlan: () => [...clientPortalKeys.all, "training-plan"] as const,
  mealPlan: (performedOn: string) =>
    [...clientPortalKeys.all, "meal-plan", performedOn] as const,
  mealDiary: (performedOn: string) =>
    [...clientPortalKeys.all, "meal-diary", performedOn] as const,
  mealRecentRoot: () => [...clientPortalKeys.all, "meal-recent"] as const,
  mealRecent: (limit: number) =>
    [...clientPortalKeys.mealRecentRoot(), limit] as const,
  mealFavoritesRoot: () => [...clientPortalKeys.all, "meal-favorites"] as const,
  mealFavorites: (limit: number) =>
    [...clientPortalKeys.mealFavoritesRoot(), limit] as const,
  steps: (performedOn: string) =>
    [...clientPortalKeys.all, "steps", performedOn] as const,
  checkins: () => [...clientPortalKeys.all, "check-ins"] as const,
  goals: () => [...clientPortalKeys.all, "goals"] as const,
  coach: () => [...clientPortalKeys.all, "coach"] as const,
  coachClientSettings: (clientId: string) =>
    [...clientPortalKeys.coach(), "settings", clientId] as const,
  coachClientModule: (clientId: string, moduleKey: ClientModuleKey) =>
    [...clientPortalKeys.coachClientSettings(clientId), moduleKey] as const,
};
