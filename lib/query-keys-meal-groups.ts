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

export const mealGroupKeys = {
  all: ["meal-groups"] as const,
  list: () => [...mealGroupKeys.all, "list"] as const,
  listByParams: (params: MealGroupListParams) => [...mealGroupKeys.list(), params] as const,
  detail: () => [...mealGroupKeys.all, "detail"] as const,
  detailById: (mealGroupId: string) => [...mealGroupKeys.detail(), mealGroupId] as const,
  assignments: () => [...mealGroupKeys.all, "assignments"] as const,
  assignmentsByParams: (params: MealGroupAssignmentListParams) => [...mealGroupKeys.assignments(), params] as const,
  assignableSubjects: () => [...mealGroupKeys.all, "assignable-subjects"] as const,
};
