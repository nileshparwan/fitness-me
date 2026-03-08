"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveMealGroupAssignmentAction,
  assignMealGroupToSubjectAction,
  createMealPlanTypeAction,
  createMealItemAction,
  deleteMealGroupAction,
  deleteMealItemAction,
  duplicateMealGroupAction,
  duplicateMealItemAction,
  getMealGroupDetailAction,
  listAssignableSubjectsAction,
  listMealGroupAssignmentsAction,
  listMealGroupsAction,
  updateMealGroupAssignmentAction,
  updateMealItemAction,
  updateMealPlanNoteAction,
  upsertMealGroupAction,
  type MealGroupDetail,
} from "@/app/actions/meal-groups";
import { mealGroupKeys, type MealGroupAssignmentListParams, type MealGroupListParams } from "@/lib/query-keys-meal-groups";
import { nutritionKeys } from "@/lib/query-keys-nutrition";

export function useMealGroups(params: MealGroupListParams) {
  return useQuery({
    queryKey: mealGroupKeys.listByParams(params),
    queryFn: () =>
      listMealGroupsAction({
        page: params.page,
        page_size: params.pageSize ?? 12,
        status: params.status ?? "all",
        search: params.search?.trim() || undefined,
        include_snapshots: params.includeSnapshots ?? false,
      }),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useMealGroupDetail(mealGroupId: string) {
  return useQuery({
    queryKey: mealGroupKeys.detailById(mealGroupId),
    queryFn: () => getMealGroupDetailAction(mealGroupId),
    enabled: Boolean(mealGroupId),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMealGroupAssignments(params: MealGroupAssignmentListParams) {
  return useQuery({
    queryKey: mealGroupKeys.assignmentsByParams(params),
    queryFn: () =>
      listMealGroupAssignmentsAction({
        status: params.status ?? "active",
        subject: params.subject,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAssignableSubjects() {
  return useQuery({
    queryKey: mealGroupKeys.assignableSubjects(),
    queryFn: listAssignableSubjectsAction,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useMealGroupMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: mealGroupKeys.list() }),
      queryClient.invalidateQueries({ queryKey: mealGroupKeys.detail() }),
      queryClient.invalidateQueries({ queryKey: mealGroupKeys.assignments() }),
      queryClient.invalidateQueries({ queryKey: mealGroupKeys.assignableSubjects() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() }),
    ]);
  };

  const upsertGroup = useMutation({
    mutationFn: upsertMealGroupAction,
    onSuccess: invalidateAll,
  });

  const deleteGroup = useMutation({
    mutationFn: deleteMealGroupAction,
    onSuccess: invalidateAll,
  });

  const duplicateGroup = useMutation({
    mutationFn: duplicateMealGroupAction,
    onSuccess: invalidateAll,
  });

  const updatePlanNote = useMutation({
    mutationFn: updateMealPlanNoteAction,
    onSuccess: invalidateAll,
  });

  const createItem = useMutation({
    mutationFn: createMealItemAction,
    onSuccess: invalidateAll,
  });

  const createPlanType = useMutation({
    mutationFn: createMealPlanTypeAction,
    onSuccess: invalidateAll,
  });

  const updateItem = useMutation({
    mutationFn: updateMealItemAction,
    onMutate: async (payload) => {
      const detailEntries = queryClient.getQueriesData<MealGroupDetail>({ queryKey: mealGroupKeys.detail() });
      for (const [queryKey, detail] of detailEntries) {
        if (!detail) continue;
        const nextPlans = detail.plans.map((plan) => ({
          ...plan,
          items: plan.items.map((item) =>
            item.id === payload.meal_item_id
              ? {
                  ...item,
                  ...(payload.changes.type !== undefined ? { type: payload.changes.type } : {}),
                  ...(payload.changes.title !== undefined ? { title: payload.changes.title || item.title } : {}),
                  ...(payload.changes.calories !== undefined ? { calories: payload.changes.calories } : {}),
                  ...(payload.changes.protein_g !== undefined ? { protein_g: payload.changes.protein_g } : {}),
                  ...(payload.changes.carbs_g !== undefined ? { carbs_g: payload.changes.carbs_g } : {}),
                  ...(payload.changes.fat_g !== undefined ? { fat_g: payload.changes.fat_g } : {}),
                  ...(payload.changes.notes !== undefined ? { notes: payload.changes.notes || null } : {}),
                  ...(payload.changes.quantity !== undefined ? { quantity: payload.changes.quantity ?? null } : {}),
                  ...(payload.changes.unit !== undefined ? { unit: payload.changes.unit || null } : {}),
                  ...(payload.changes.planned_date !== undefined ? { planned_date: payload.changes.planned_date || null } : {}),
                  ...(payload.changes.planned_time !== undefined ? { planned_time: payload.changes.planned_time || null } : {}),
                }
              : item
          ),
        }));
        queryClient.setQueryData(queryKey, {
          ...detail,
          plans: nextPlans,
        } satisfies MealGroupDetail);
      }
      return { detailEntries };
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, detail] of context?.detailEntries || []) {
        queryClient.setQueryData(queryKey, detail);
      }
    },
    onSettled: invalidateAll,
  });

  const deleteItem = useMutation({
    mutationFn: deleteMealItemAction,
    onSuccess: invalidateAll,
  });

  const duplicateItem = useMutation({
    mutationFn: duplicateMealItemAction,
    onSuccess: invalidateAll,
  });

  const assignGroup = useMutation({
    mutationFn: assignMealGroupToSubjectAction,
    onSuccess: invalidateAll,
  });

  const updateAssignment = useMutation({
    mutationFn: updateMealGroupAssignmentAction,
    onSuccess: invalidateAll,
  });

  const archiveAssignment = useMutation({
    mutationFn: archiveMealGroupAssignmentAction,
    onSuccess: invalidateAll,
  });

  return {
    upsertGroup,
    deleteGroup,
    duplicateGroup,
    updatePlanNote,
    createPlanType,
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    assignGroup,
    updateAssignment,
    archiveAssignment,
  };
}
