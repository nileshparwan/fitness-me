import type { MealPlanStatus } from "@/app/actions/nutrition-manual";

export type NutritionSubject = {
  subject_user_id?: string | null;
  subject_client_id?: string | null;
};

export type NutritionPlansListParams = {
  page: number;
  pageSize?: number;
  status?: MealPlanStatus | "all";
  search?: string;
  subject?: NutritionSubject;
};

export const nutritionKeys = {
  all: ["nutrition-manual"] as const,
  diary: () => [...nutritionKeys.all, "diary"] as const,
  diaryDay: (performedOn: string, subject?: NutritionSubject) => [...nutritionKeys.diary(), performedOn, subject ?? null] as const,
  plans: () => [...nutritionKeys.all, "plans"] as const,
  plansList: (params: NutritionPlansListParams) => [...nutritionKeys.plans(), params] as const,
  templates: () => [...nutritionKeys.all, "templates"] as const,
  recent: () => [...nutritionKeys.all, "recent"] as const,
  recentList: (subject?: NutritionSubject, limit?: number) => [...nutritionKeys.recent(), subject ?? null, limit ?? 30] as const,
  favorites: () => [...nutritionKeys.all, "favorites"] as const,
  favoritesList: (limit?: number) => [...nutritionKeys.favorites(), limit ?? 30] as const,
  clientSummary: () => [...nutritionKeys.all, "client-summary"] as const,
  clientSummary7d: (clientId: string, endDate?: string) => [...nutritionKeys.clientSummary(), clientId, endDate ?? null] as const,
};
