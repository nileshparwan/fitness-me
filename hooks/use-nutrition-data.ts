"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getNutritionDiaryDayAction } from "@/app/actions/nutrition-manual";
import { listMealGroupsAction } from "@/app/actions/meal-groups";
import { useMealGroupAssignments, useMealGroupDetail, useMealGroupMutations, useMealGroups } from "@/hooks/use-meal-groups";
import { useNutritionDashboard } from "@/hooks/use-nutrition-dashboard";
import type { MealGroupSubject } from "@/lib/query-keys-nutrition";
import {
  DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS,
  nutritionKeys,
  type MealGroupAssignmentListParams,
  type MealGroupListParams,
} from "@/lib/query-keys-nutrition";
import { resolveNutritionSubject } from "@/lib/nutrition/subject";
import {
  useNutritionActiveSubject,
  useNutritionSelectedMealGroupId,
  useSetNutritionSelectedMealGroupId,
} from "@/stores/use-nutrition-ui-store";

function useNutritionResolvedSubject() {
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  return useMemo(
    () => resolveNutritionSubject(activeSubjectType, activeSubjectId),
    [activeSubjectId, activeSubjectType]
  );
}

export { resolveNutritionSubject };

export function useNutritionMealGroupOptions() {
  return useMealGroups(DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS);
}

export function useNutritionMealGroups(params: MealGroupListParams) {
  return useMealGroups(params);
}

export function useNutritionMealGroup(mealGroupId: string) {
  return useMealGroupDetail(mealGroupId);
}

export function useNutritionMealGroupAssignments(params: MealGroupAssignmentListParams) {
  return useMealGroupAssignments(params);
}

export function useNutritionGroupMutations() {
  return useMealGroupMutations();
}

export function useNutritionDashboardData() {
  return useNutritionDashboard();
}

type AutoMealGroupSelectionParams = {
  subject?: MealGroupSubject;
  enabled?: boolean;
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pickCurrentAssignmentGroupId(
  assignments:
    | Array<{
        meal_group_id: string;
        start_date: string;
        end_date: string;
      }>
    | undefined
) {
  if (!assignments || assignments.length === 0) return "";
  const today = toDateInput(new Date());
  const current = assignments.find((assignment) => assignment.start_date <= today && assignment.end_date >= today);
  if (current?.meal_group_id) return current.meal_group_id.trim();
  return assignments.find((assignment) => Boolean(assignment.meal_group_id))?.meal_group_id?.trim() || "";
}

export function useNutritionAutoMealGroupSelection(params?: AutoMealGroupSelectionParams) {
  const enabled = params?.enabled ?? true;
  const storeSubject = useNutritionResolvedSubject();
  const subject = params?.subject ?? storeSubject;
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();
  const groupsQuery = useNutritionMealGroupOptions();

  const assignmentsQuery = useNutritionMealGroupAssignments({
    status: "active",
    subject,
  });

  const activeAssignmentGroupId = useMemo(
    () => pickCurrentAssignmentGroupId(assignmentsQuery.data),
    [assignmentsQuery.data]
  );

  const fallbackActiveGroupId = useMemo(() => {
    const groups = groupsQuery.data?.rows || [];
    const active = groups.find((group) => group.status === "active");
    return (active?.id || groups[0]?.id || "").trim();
  }, [groupsQuery.data?.rows]);

  useEffect(() => {
    if (!enabled) return;
    if (selectedMealGroupId) return;
    if (assignmentsQuery.isLoading) return;
    const nextGroupId = activeAssignmentGroupId || fallbackActiveGroupId;
    if (!nextGroupId) return;
    setSelectedMealGroupId(nextGroupId);
  }, [activeAssignmentGroupId, assignmentsQuery.isLoading, enabled, fallbackActiveGroupId, selectedMealGroupId, setSelectedMealGroupId]);

  return {
    assignmentsQuery,
    activeAssignmentGroupId,
  };
}

export function useNutritionPrefetch() {
  const queryClient = useQueryClient();
  const subject = useNutritionResolvedSubject();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: nutritionKeys.groupsList(DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS),
      queryFn: () =>
        listMealGroupsAction({
          page: DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS.page,
          page_size: DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS.pageSize,
          status: DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS.status,
          search: undefined,
          include_snapshots: DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS.includeSnapshots,
        }),
      staleTime: 20_000,
    });
  }, [queryClient]);

  useEffect(() => {
    const today = toDateInput(new Date());
    void queryClient.prefetchQuery({
      queryKey: nutritionKeys.diaryDay(today, subject, undefined),
      queryFn: () =>
        getNutritionDiaryDayAction({
          performed_on: today,
          subject,
          meal_group_id: undefined,
        }),
      staleTime: 60_000,
    });
  }, [queryClient, subject]);
}
