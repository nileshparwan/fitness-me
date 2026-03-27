"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  addMealItemAction,
  addMealLogSectionAction,
  copyMealsFromDateAction,
  getClientNutritionSummary7dAction,
  getNutritionActivePlanForDateAction,
  getNutritionDiaryDayAction,
  listFavoriteMealItemsAction,
  logFromPlanAction,
  removeMealItemAction,
  toggleFavoriteMealItemAction,
  updateMealItemAction,
  updateMealLogNotesAction,
  type ManualDiaryItem,
  type NutritionDiaryDay,
  type MealType,
} from "@/app/actions/nutrition-manual";
import { assignMealGroupToSubjectAction, listMealGroupsAction } from "@/app/actions/meal-groups";
import {
  nutritionKeys,
  type NutritionSubject,
} from "@/lib/query-keys-nutrition";

function clampProgress(value: number | null) {
  if (value === null) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(999, value));
}

function recomputeDiary(diary: NutritionDiaryDay): NutritionDiaryDay {
  const totals = diary.logs.reduce(
    (acc, log) => {
      acc.calories += Number(log.total_calories || 0);
      acc.protein_g += Number(log.total_protein_g || 0);
      acc.carbs_g += Number(log.total_carbs_g || 0);
      acc.fat_g += Number(log.total_fat_g || 0);
      acc.fiber_g += Number(log.total_fiber_g || 0);
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  const activePlan = diary.active_plan;
  const progress = {
    calories_pct:
      activePlan?.daily_calorie_target && activePlan.daily_calorie_target > 0
        ? clampProgress(Math.round((totals.calories / activePlan.daily_calorie_target) * 100))
        : null,
    protein_pct:
      activePlan?.daily_protein_target_g && activePlan.daily_protein_target_g > 0
        ? clampProgress(Math.round((totals.protein_g / activePlan.daily_protein_target_g) * 100))
        : null,
    carbs_pct:
      activePlan?.daily_carbs_target_g && activePlan.daily_carbs_target_g > 0
        ? clampProgress(Math.round((totals.carbs_g / activePlan.daily_carbs_target_g) * 100))
        : null,
    fat_pct:
      activePlan?.daily_fat_target_g && activePlan.daily_fat_target_g > 0
        ? clampProgress(Math.round((totals.fat_g / activePlan.daily_fat_target_g) * 100))
        : null,
  };

  return {
    ...diary,
    totals,
    progress,
  };
}

function withOptimisticItemAdd(
  queryClient: QueryClient,
  key: QueryKey,
  payload: {
    meal_type: MealType;
    meal_group_id?: string | null;
    item: {
      item_name: string;
      quantity?: number | null;
      unit?: string | null;
      calories?: number | null;
      protein_g?: number | null;
      carbs_g?: number | null;
      fat_g?: number | null;
      fiber_g?: number | null;
      notes?: string | null;
      is_quick_add?: boolean;
      consumed_time?: string | null;
    };
  }
) {
  const current = queryClient.getQueryData<NutritionDiaryDay>(key);
  if (!current) return;

  const targetMealType = payload.meal_type;
  const existingLog = current.logs.find((log) => log.meal_type === targetMealType);

  const optimisticItem: ManualDiaryItem = {
    id: `optimistic-${Date.now()}`,
    meal_log_id: existingLog?.id || `optimistic-log-${targetMealType}`,
    created_by_user_id: existingLog?.created_by_user_id || current.subject.subject_user_id || null,
    created_by_client_id: existingLog?.created_by_client_id || current.subject.subject_client_id || null,
    item_name: payload.item.item_name,
    quantity: payload.item.quantity ?? null,
    unit: payload.item.unit ?? null,
    calories: payload.item.calories ?? null,
    protein_g: payload.item.protein_g ?? null,
    carbs_g: payload.item.carbs_g ?? null,
    fat_g: payload.item.fat_g ?? null,
    fiber_g: payload.item.fiber_g ?? null,
    notes: payload.item.notes ?? null,
    is_quick_add: payload.item.is_quick_add ?? false,
    consumed_time: payload.item.consumed_time ?? null,
    position: (existingLog?.items.length ?? 0) + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const next = structuredClone(current);
  if (existingLog) {
    const logIndex = next.logs.findIndex((log) => log.id === existingLog.id);
    if (logIndex >= 0) {
      next.logs[logIndex].items = [...next.logs[logIndex].items, optimisticItem];
      next.logs[logIndex].total_calories = Number(next.logs[logIndex].total_calories || 0) + Number(optimisticItem.calories || 0);
      next.logs[logIndex].total_protein_g = Number(next.logs[logIndex].total_protein_g || 0) + Number(optimisticItem.protein_g || 0);
      next.logs[logIndex].total_carbs_g = Number(next.logs[logIndex].total_carbs_g || 0) + Number(optimisticItem.carbs_g || 0);
      next.logs[logIndex].total_fat_g = Number(next.logs[logIndex].total_fat_g || 0) + Number(optimisticItem.fat_g || 0);
      next.logs[logIndex].total_fiber_g = Number(next.logs[logIndex].total_fiber_g || 0) + Number(optimisticItem.fiber_g || 0);
    }
  } else {
    next.logs.push({
      id: `optimistic-log-${targetMealType}`,
      subject_user_id: current.subject.subject_user_id,
      subject_client_id: current.subject.subject_client_id,
      created_by_user_id: current.subject.subject_user_id || null,
      created_by_client_id: current.subject.subject_client_id || null,
      meal_group_id: payload.meal_group_id ?? null,
      performed_on: current.performed_on,
      meal_type: targetMealType,
      notes: null,
      total_calories: Number(optimisticItem.calories || 0),
      total_protein_g: Number(optimisticItem.protein_g || 0),
      total_carbs_g: Number(optimisticItem.carbs_g || 0),
      total_fat_g: Number(optimisticItem.fat_g || 0),
      total_fiber_g: Number(optimisticItem.fiber_g || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [optimisticItem],
    });
  }

  queryClient.setQueryData(key, recomputeDiary(next));
}

export function useNutritionDiary(performedOn: string, subject?: NutritionSubject, mealGroupId?: string | null) {
  return useQuery({
    queryKey: nutritionKeys.diaryDay(performedOn, subject, mealGroupId) as QueryKey,
    queryFn: () =>
      getNutritionDiaryDayAction({
        performed_on: performedOn,
        subject,
        meal_group_id: mealGroupId ?? undefined,
      }),
    enabled: Boolean(performedOn),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useNutritionActivePlanForDate(performedOn: string, subject?: NutritionSubject) {
  return useQuery({
    queryKey: nutritionKeys.activePlanForDate(performedOn, subject) as QueryKey,
    queryFn: () =>
      getNutritionActivePlanForDateAction({
        performed_on: performedOn,
        subject,
      }),
    enabled: Boolean(performedOn),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useMealPlanTemplates() {
  return useQuery({
    queryKey: nutritionKeys.templates(),
    queryFn: async () =>
      (
        await listMealGroupsAction({
          page: 0,
          page_size: 100,
          status: "all",
          include_snapshots: false,
        })
      ).rows,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFavoriteMealItems(limit = 30, mealType?: MealType | null, options?: { enabled?: boolean }) {
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(limit || 30)));
  return useQuery({
    queryKey: nutritionKeys.favoritesList(normalizedLimit, mealType ?? null),
    queryFn: () =>
      listFavoriteMealItemsAction(
        mealType
          ? {
              limit: normalizedLimit,
              meal_type: mealType,
            }
          : {
              limit: normalizedLimit,
            }
      ),
    enabled: options?.enabled ?? true,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientNutritionSummary7d(clientId: string, endDate?: string) {
  return useQuery({
    queryKey: nutritionKeys.clientSummary7d(clientId, endDate),
    queryFn: () => getClientNutritionSummary7dAction({ client_id: clientId, end_date: endDate }),
    enabled: Boolean(clientId),
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useLogFromPlan(performedOn: string, subject?: NutritionSubject) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logFromPlanAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...nutritionKeys.diary(), performedOn, subject ?? null],
        }),
        queryClient.invalidateQueries({ queryKey: nutritionKeys.dashboard() }),
      ]);
    },
  });
}

export function useNutritionMutations(performedOn: string, subject?: NutritionSubject, mealGroupId?: string | null) {
  const queryClient = useQueryClient();
  const dayKey = nutritionKeys.diaryDay(performedOn, subject, mealGroupId) as QueryKey;
  const activeClientId = subject?.subject_client_id || null;

  const invalidateDay = () =>
    queryClient.invalidateQueries({
      queryKey: [...nutritionKeys.diary(), performedOn, subject ?? null],
    });
  const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: nutritionKeys.dashboard() });
  const invalidateFavorites = () => queryClient.invalidateQueries({ queryKey: nutritionKeys.favorites() });
  const invalidateTemplates = () => queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() });
  const invalidateClientSummary = () => queryClient.invalidateQueries({ queryKey: nutritionKeys.clientSummary() });
  const invalidateActiveClientSummary = () =>
    activeClientId ? queryClient.invalidateQueries({ queryKey: nutritionKeys.clientSummary7d(activeClientId) }) : Promise.resolve();
  const invalidateDiarySurface = () =>
    Promise.all([
      invalidateDay(),
      invalidateDashboard(),
      invalidateActiveClientSummary(),
    ]);

  const addItem = useMutation({
    mutationFn: addMealItemAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: dayKey });
      const previous = queryClient.getQueryData<NutritionDiaryDay>(dayKey);
      withOptimisticItemAdd(queryClient, dayKey, {
        meal_type: payload.meal_type,
        meal_group_id: payload.meal_group_id,
        item: payload.item,
      });
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dayKey, context.previous);
      }
    },
    onSuccess: invalidateDiarySurface,
  });

  const updateItem = useMutation({
    mutationFn: updateMealItemAction,
    onMutate: async ({ item_id, item }) => {
      await queryClient.cancelQueries({ queryKey: dayKey });
      const previous = queryClient.getQueryData<NutritionDiaryDay>(dayKey);
      if (!previous) return { previous };

      const next = structuredClone(previous);
      for (const log of next.logs) {
        const index = log.items.findIndex((entry) => entry.id === item_id);
        if (index === -1) continue;
        log.items[index] = {
          ...log.items[index],
          ...item,
          updated_at: new Date().toISOString(),
        } as ManualDiaryItem;

        log.total_calories = log.items.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
        log.total_protein_g = log.items.reduce((sum, entry) => sum + Number(entry.protein_g || 0), 0);
        log.total_carbs_g = log.items.reduce((sum, entry) => sum + Number(entry.carbs_g || 0), 0);
        log.total_fat_g = log.items.reduce((sum, entry) => sum + Number(entry.fat_g || 0), 0);
        log.total_fiber_g = log.items.reduce((sum, entry) => sum + Number(entry.fiber_g || 0), 0);
      }

      queryClient.setQueryData(dayKey, recomputeDiary(next));
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dayKey, context.previous);
      }
    },
    onSuccess: invalidateDiarySurface,
  });

  const removeItem = useMutation({
    mutationFn: removeMealItemAction,
    onMutate: async ({ item_id }) => {
      await queryClient.cancelQueries({ queryKey: dayKey });
      const previous = queryClient.getQueryData<NutritionDiaryDay>(dayKey);
      if (!previous) return { previous };

      const next = structuredClone(previous);
      for (const log of next.logs) {
        const hasItem = log.items.some((entry) => entry.id === item_id);
        if (!hasItem) continue;

        log.items = log.items.filter((entry) => entry.id !== item_id);
        log.total_calories = log.items.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
        log.total_protein_g = log.items.reduce((sum, entry) => sum + Number(entry.protein_g || 0), 0);
        log.total_carbs_g = log.items.reduce((sum, entry) => sum + Number(entry.carbs_g || 0), 0);
        log.total_fat_g = log.items.reduce((sum, entry) => sum + Number(entry.fat_g || 0), 0);
        log.total_fiber_g = log.items.reduce((sum, entry) => sum + Number(entry.fiber_g || 0), 0);
      }

      queryClient.setQueryData(dayKey, recomputeDiary(next));
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dayKey, context.previous);
      }
    },
    onSuccess: invalidateDiarySurface,
  });

  const copyFromDate = useMutation({
    mutationFn: copyMealsFromDateAction,
    onSuccess: invalidateDiarySurface,
  });

  const toggleFavorite = useMutation({
    mutationFn: toggleFavoriteMealItemAction,
    onSuccess: invalidateFavorites,
  });

  const saveNotes = useMutation({
    mutationFn: updateMealLogNotesAction,
    onSuccess: invalidateDiarySurface,
  });

  const assignPlan = useMutation({
    mutationFn: assignMealGroupToSubjectAction,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        invalidateDay(),
        invalidateDashboard(),
        invalidateTemplates(),
        invalidateClientSummary(),
        invalidateActiveClientSummary(),
      ]);

      if (variables.subject.subject_client_id) {
        await queryClient.invalidateQueries({
          queryKey: nutritionKeys.clientSummary7d(variables.subject.subject_client_id),
        });
      }
    },
  });

  const addSection = useMutation({
    mutationFn: addMealLogSectionAction,
    onSuccess: invalidateDiarySurface,
  });

  return {
    addSection,
    addItem,
    updateItem,
    removeItem,
    copyFromDate,
    toggleFavorite,
    saveNotes,
    assignPlan,
  };
}
