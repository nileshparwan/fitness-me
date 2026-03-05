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
  archiveMealPlanAction,
  assignMealPlanToSubjectAction,
  copyMealsFromDateAction,
  duplicateMealPlanAction,
  getClientNutritionSummary7dAction,
  getNutritionDiaryDayAction,
  listFavoriteMealItemsAction,
  listMealPlansAction,
  listMyMealPlanTemplatesAction,
  listRecentMealItemsAction,
  removeMealItemAction,
  toggleFavoriteMealItemAction,
  updateMealItemAction,
  updateMealLogNotesAction,
  upsertMealPlanAction,
  type ManualDiaryItem,
  type NutritionDiaryDay,
  type MealPlanStatus,
  type MealType,
} from "@/app/actions/nutrition-manual";
import {
  nutritionKeys,
  type NutritionPlansListParams,
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
      performed_on: current.performed_on,
      meal_type: targetMealType,
      timezone: current.timezone,
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

export function useNutritionDiary(performedOn: string, subject?: NutritionSubject, timezone?: string) {
  return useQuery({
    queryKey: nutritionKeys.diaryDay(performedOn, subject) as QueryKey,
    queryFn: () =>
      getNutritionDiaryDayAction({
        performed_on: performedOn,
        subject,
        timezone,
      }),
    enabled: Boolean(performedOn),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useNutritionPlans(params: NutritionPlansListParams) {
  return useQuery({
    queryKey: nutritionKeys.plansList(params),
    queryFn: () =>
      listMealPlansAction({
        page: params.page,
        page_size: params.pageSize ?? 12,
        status: params.status ?? "all",
        search: params.search?.trim() || undefined,
        subject: params.subject,
      }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useMealPlanTemplates() {
  return useQuery({
    queryKey: nutritionKeys.templates(),
    queryFn: listMyMealPlanTemplatesAction,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useRecentMealItems(subject?: NutritionSubject, limit = 30) {
  return useQuery({
    queryKey: nutritionKeys.recentList(subject, limit),
    queryFn: () => listRecentMealItemsAction({ subject, limit }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useFavoriteMealItems(limit = 30) {
  return useQuery({
    queryKey: nutritionKeys.favoritesList(limit),
    queryFn: () => listFavoriteMealItemsAction({ limit }),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientNutritionSummary7d(clientId: string, endDate?: string) {
  return useQuery({
    queryKey: nutritionKeys.clientSummary7d(clientId, endDate),
    queryFn: () => getClientNutritionSummary7dAction({ client_id: clientId, end_date: endDate }),
    enabled: Boolean(clientId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useNutritionMutations(performedOn: string, subject?: NutritionSubject) {
  const queryClient = useQueryClient();
  const dayKey = nutritionKeys.diaryDay(performedOn, subject) as QueryKey;

  const invalidatePrimary = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dayKey }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.recent() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.favorites() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.plans() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.clientSummary() }),
      queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() }),
    ]);
  };

  const addItem = useMutation({
    mutationFn: addMealItemAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: dayKey });
      const previous = queryClient.getQueryData<NutritionDiaryDay>(dayKey);
      withOptimisticItemAdd(queryClient, dayKey, {
        meal_type: payload.meal_type,
        item: payload.item,
      });
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dayKey, context.previous);
      }
    },
    onSuccess: async () => {
      await invalidatePrimary();
    },
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
    onSuccess: async () => {
      await invalidatePrimary();
    },
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
    onSuccess: async () => {
      await invalidatePrimary();
    },
  });

  const copyFromDate = useMutation({
    mutationFn: copyMealsFromDateAction,
    onSuccess: async () => {
      await invalidatePrimary();
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: toggleFavoriteMealItemAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.favorites() });
    },
  });

  const saveNotes = useMutation({
    mutationFn: updateMealLogNotesAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dayKey });
    },
  });

  const upsertPlan = useMutation({
    mutationFn: upsertMealPlanAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.plans() });
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() });
    },
  });

  const duplicatePlan = useMutation({
    mutationFn: duplicateMealPlanAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.plans() });
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() });
    },
  });

  const archivePlan = useMutation({
    mutationFn: archiveMealPlanAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.plans() });
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() });
      await queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() });
    },
  });

  const assignPlan = useMutation({
    mutationFn: assignMealPlanToSubjectAction,
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: nutritionKeys.diary() }),
        queryClient.invalidateQueries({ queryKey: nutritionKeys.clientSummary() }),
        queryClient.invalidateQueries({ queryKey: nutritionKeys.templates() }),
      ]);

      if (variables.subject?.subject_client_id) {
        await queryClient.invalidateQueries({
          queryKey: nutritionKeys.clientSummary7d(variables.subject.subject_client_id),
        });
      }
    },
  });

  return {
    addItem,
    updateItem,
    removeItem,
    copyFromDate,
    toggleFavorite,
    saveNotes,
    upsertPlan,
    duplicatePlan,
    archivePlan,
    assignPlan,
  };
}
