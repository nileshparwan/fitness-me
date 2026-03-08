import {
  nutritionKeys,
  type MealGroupAssignmentListParams,
  type MealGroupListParams,
} from "@/lib/query-keys-nutrition";

export type { MealGroupAssignmentListParams, MealGroupListParams };

export const mealGroupKeys = {
  all: nutritionKeys.groups,
  list: () => [...nutritionKeys.groups(), "list"] as const,
  listByParams: (params: MealGroupListParams) => nutritionKeys.groupsList(params),
  detail: nutritionKeys.mealGroup,
  detailById: nutritionKeys.mealGroupById,
  assignments: nutritionKeys.mealGroupAssignments,
  assignmentsByParams: nutritionKeys.mealGroupAssignmentsByParams,
  assignableSubjects: nutritionKeys.mealGroupAssignableSubjects,
};
