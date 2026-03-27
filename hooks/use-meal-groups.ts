"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveMealGroupAssignmentAction,
  assignMealGroupToSubjectAction,
  copyMealPlanDayAction,
  createMealItemAction,
  deleteMealGroupAction,
  deleteMealItemAction,
  duplicateMealGroupAction,
  duplicateMealItemAction,
  getMealGroupDetailAction,
  listAssignableSubjectsAction,
  listMealGroupAssigneesAction,
  listMealGroupAssignmentsAction,
  listMealGroupsAction,
  toggleMealGroupPublicShareAction,
  updateMealGroupAssignmentAction,
  updateMealItemAction,
  updateMealPlanNoteAction,
  upsertMealGroupAction,
  type MealGroupAssigneeOption,
  type MealGroupDetail,
} from "@/app/actions/meal-groups";
import { useDebounce } from "@/hooks/use-debounce";
import { mealGroupKeys, type MealGroupAssignmentListParams, type MealGroupListParams } from "@/lib/query-keys-meal-groups";
import { nutritionKeys } from "@/lib/query-keys-nutrition";

const MEAL_GROUP_ASSIGNEES_PAGE_SIZE = 15;

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

export function useMealGroupAssignees(mealGroupId: string, rawSearch: string, enabled = true) {
  const debouncedSearch = useDebounce(rawSearch.trim(), 250);

  return useInfiniteQuery({
    queryKey: mealGroupKeys.assignees(mealGroupId, debouncedSearch),
    enabled: Boolean(mealGroupId) && enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) =>
      listMealGroupAssigneesAction({
        meal_group_id: mealGroupId,
        search: debouncedSearch || undefined,
        page: pageParam,
        page_size: MEAL_GROUP_ASSIGNEES_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.has_more ? allPages.length : undefined),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function flattenMealGroupAssigneePages(data: { pages: Array<{ items: MealGroupAssigneeOption[] }> } | undefined) {
  if (!data) return [] as MealGroupAssigneeOption[];
  const seen = new Set<string>();
  const rows: MealGroupAssigneeOption[] = [];
  for (const page of data.pages) {
    for (const item of page.items || []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      rows.push(item);
    }
  }
  return rows;
}

export function useMealGroupMutations() {
  const queryClient = useQueryClient();

  const invalidateMealGroupList = () => queryClient.invalidateQueries({ queryKey: mealGroupKeys.list() });
  const invalidateMealGroupDetails = () => queryClient.invalidateQueries({ queryKey: mealGroupKeys.detail() });
  const invalidateMealGroupDetailById = (mealGroupId?: string | null) =>
    mealGroupId ? queryClient.invalidateQueries({ queryKey: mealGroupKeys.detailById(mealGroupId) }) : Promise.resolve();
  const invalidateMealGroupAssignments = () => queryClient.invalidateQueries({ queryKey: mealGroupKeys.assignments() });
  const invalidateMealGroupAssignees = (mealGroupId?: string | null) =>
    mealGroupId ? queryClient.invalidateQueries({ queryKey: mealGroupKeys.assigneesRoot(mealGroupId) }) : Promise.resolve();
  const invalidateNutritionForAssignment = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: nutritionKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() }),
    ]);

  const upsertGroup = useMutation({
    mutationFn: upsertMealGroupAction,
    onSuccess: async (result, variables) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupDetailById(result?.id || variables.id || null),
      ]);
    },
  });

  const deleteGroup = useMutation({
    mutationFn: deleteMealGroupAction,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupDetailById(variables.meal_group_id),
      ]);
    },
  });

  const duplicateGroup = useMutation({
    mutationFn: duplicateMealGroupAction,
    onSuccess: async (result) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupDetailById(result?.id || null),
      ]);
    },
  });

  const updatePlanNote = useMutation({
    mutationFn: updateMealPlanNoteAction,
    onSuccess: invalidateMealGroupDetails,
  });

  const createItem = useMutation({
    mutationFn: createMealItemAction,
    onSuccess: invalidateMealGroupDetails,
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
    onSettled: invalidateMealGroupDetails,
  });

  const deleteItem = useMutation({
    mutationFn: deleteMealItemAction,
    onSuccess: invalidateMealGroupDetails,
  });

  const duplicateItem = useMutation({
    mutationFn: duplicateMealItemAction,
    onSuccess: invalidateMealGroupDetails,
  });

  const copyDay = useMutation({
    mutationFn: copyMealPlanDayAction,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        invalidateMealGroupDetailById(variables.meal_group_id),
        invalidateMealGroupDetails(),
      ]);
    },
  });

  const assignGroup = useMutation({
    mutationFn: assignMealGroupToSubjectAction,
    onSuccess: async (result, variables) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupAssignments(),
        invalidateMealGroupAssignees(variables.meal_group_id),
        invalidateMealGroupDetailById(variables.meal_group_id),
        invalidateMealGroupDetailById(result?.snapshot_group_id || null),
        invalidateNutritionForAssignment(),
      ]);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: updateMealGroupAssignmentAction,
    onSuccess: async (result) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupAssignments(),
        invalidateMealGroupDetailById(result.template_group_id),
        invalidateMealGroupDetailById(result.meal_group_id),
        invalidateNutritionForAssignment(),
      ]);
    },
  });

  const archiveAssignment = useMutation({
    mutationFn: archiveMealGroupAssignmentAction,
    onSuccess: async () => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupAssignments(),
        invalidateMealGroupDetails(),
        invalidateNutritionForAssignment(),
      ]);
    },
  });

  const togglePublicShare = useMutation({
    mutationFn: toggleMealGroupPublicShareAction,
    onSuccess: async (result, variables) => {
      await Promise.all([
        invalidateMealGroupList(),
        invalidateMealGroupDetailById(result?.id || variables.meal_group_id),
      ]);
    },
  });

  return {
    upsertGroup,
    deleteGroup,
    duplicateGroup,
    updatePlanNote,
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    copyDay,
    assignGroup,
    updateAssignment,
    archiveAssignment,
    togglePublicShare,
  };
}
