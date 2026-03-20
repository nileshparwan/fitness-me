export type NutritionSubject = {
  subject_user_id?: string | null;
  subject_client_id?: string | null;
};

export type MealGroupSubject = {
  subject_user_id?: string | null;
  subject_client_id?: string | null;
};

export type MealGroupListParams = {
  page: number;
  pageSize?: number;
  status?: "all" | "draft" | "active" | "archived";
  search?: string;
  includeSnapshots?: boolean;
};

export type MealGroupAssignmentListParams = {
  status?: "all" | "active" | "paused" | "completed" | "archived";
  subject?: MealGroupSubject;
};

export const DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS: Required<MealGroupListParams> = {
  page: 0,
  pageSize: 100,
  status: "all",
  search: "",
  includeSnapshots: true,
};

export const nutritionKeys = {
  all: ["nutrition"] as const,

  dashboard: () => [...nutritionKeys.all, "dashboard"] as const,
  dashboardSummary: (subject?: NutritionSubject, date?: string, mealGroupId?: string | null) =>
    [...nutritionKeys.dashboard(), "summary", subject ?? null, date ?? null, mealGroupId ?? null] as const,
  dashboardActivity: (subject?: NutritionSubject, limit = 10, mealGroupId?: string | null) =>
    [...nutritionKeys.dashboard(), "activity", subject ?? null, limit, mealGroupId ?? null] as const,

  diary: () => [...nutritionKeys.all, "diary"] as const,
  diaryDay: (performedOn: string, subject?: NutritionSubject, mealGroupId?: string | null) =>
    [...nutritionKeys.diary(), performedOn, subject ?? null, mealGroupId ?? null] as const,
  activePlanForDate: (performedOn: string, subject?: NutritionSubject) =>
    [...nutritionKeys.diary(), "active-plan", performedOn, subject ?? null] as const,

  plans: () => [...nutritionKeys.all, "plans"] as const,
  templates: () => [...nutritionKeys.all, "templates"] as const,

  favorites: () => [...nutritionKeys.all, "favorites"] as const,
  favoritesList: (limit?: number, mealType?: string | null) => [...nutritionKeys.favorites(), limit ?? 30, mealType ?? null] as const,

  clientSummary: () => [...nutritionKeys.all, "client-summary"] as const,
  clientSummary7d: (clientId: string, endDate?: string) => [...nutritionKeys.clientSummary(), clientId, endDate ?? null] as const,

  groups: () => [...nutritionKeys.all, "groups"] as const,
  groupsList: (params: MealGroupListParams) => [...nutritionKeys.groups(), "list", params] as const,
  mealGroup: () => [...nutritionKeys.groups(), "detail"] as const,
  mealGroupById: (mealGroupId: string) => [...nutritionKeys.mealGroup(), mealGroupId] as const,
  mealGroupAssignments: () => [...nutritionKeys.groups(), "assignments"] as const,
  mealGroupAssignmentsByParams: (params: MealGroupAssignmentListParams) => [...nutritionKeys.mealGroupAssignments(), params] as const,
  mealGroupAssigneesBase: () => [...nutritionKeys.groups(), "assignees"] as const,
  mealGroupAssigneesRoot: (mealGroupId: string) => [...nutritionKeys.mealGroupAssigneesBase(), mealGroupId] as const,
  mealGroupAssignees: (mealGroupId: string, search: string) => [...nutritionKeys.mealGroupAssigneesRoot(mealGroupId), search] as const,
  mealGroupAssignableSubjects: () => [...nutritionKeys.groups(), "assignable-subjects"] as const,
  mealGroupOptions: () => [...nutritionKeys.groups(), "options", DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS] as const,

  programs: () => [...nutritionKeys.all, "programs"] as const,
  programById: (programId: string) => [...nutritionKeys.programs(), programId] as const,
  programOptions: () => [...nutritionKeys.programs(), "options"] as const,
  programMealsRoot: () => [...nutritionKeys.programs(), "meals"] as const,
  programMealsByProgramId: (programId: string) => [...nutritionKeys.programMealsRoot(), { program_id: programId }] as const,
};
