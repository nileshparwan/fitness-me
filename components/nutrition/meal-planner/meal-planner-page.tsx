"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, CirclePlus, Copy, ListOrdered, Loader2, Pencil, RotateCcw, Star, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import type { MealDayOfWeek, MealGroupDetail, MealItemType } from "@/app/actions/meal-groups";
import {
  MEAL_DAY_LABELS,
  MEAL_TYPE_ACCENTS,
  MEAL_TYPE_DISPLAY_ORDER,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_LABELS,
} from "@/components/nutrition/meal-groups/meal-group-types";
import { MealPlannerSkeleton } from "@/components/nutrition/meal-planner/meal-planner-skeleton";
import { DeleteConfirmSheet } from "@/components/nutrition/shared/delete-confirm-sheet";
import { MealItemEditorSheet, type MealItemEditorValue } from "@/components/nutrition/shared/meal-item-editor-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  resolveNutritionSubject,
  useNutritionGroupMutations,
  useNutritionMealGroup,
  useNutritionMealGroupOptions,
} from "@/hooks/use-nutrition-data";
import { useFavoriteMealItems, useNutritionActivePlanForDate, useNutritionMutations } from "@/hooks/use-nutrition-manual";
import { useMediaQuery } from "@/hooks/use-media-query";
import { computeNutritionVisualPercent, type NutritionProgressMetric } from "@/lib/nutrition/progress-bars";
import { normalizeMealUnit } from "@/lib/nutrition/meal-units";
import {
  useNutritionActiveSubject,
  useClearNutritionPlannerMealTypeOrder,
  useNutritionPlannerMealTypeOrder,
  useNutritionSelectedMealGroupId,
  useNutritionSelectedPlannerDay,
  useSetNutritionPlannerMealTypeOrder,
  useSetNutritionSelectedMealGroupId,
  useSetNutritionSelectedPlannerDay,
} from "@/stores/use-nutrition-ui-store";
import { useUnitLabels } from "@/stores/use-settings-store";
import { currentMealDay } from "@/lib/nutrition/meal-ui";
import { toDateInput } from "@/lib/utils/date";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

const DAY_ORDER: MealDayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function isMealItemType(value: string): value is MealItemType {
  return MEAL_TYPE_DISPLAY_ORDER.includes(value as MealItemType);
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function computeProgressPercent(value: number, target: number | null) {
  if (!target || target <= 0) return null;
  const percent = Math.round((value / target) * 100);
  if (!Number.isFinite(percent)) return null;
  return clampInt(percent, 0, 999);
}

function ProgressBar({
  metric,
  label,
  value,
  target,
  pct,
}: {
  metric: NutritionProgressMetric;
  label: string;
  value: number;
  target: number | null;
  pct: number | null;
}) {
  const percent = computeNutritionVisualPercent({
    metric,
    value,
    target,
    explicitPercent: pct,
    maxPercent: 160,
  });
  const warning = percent > 110;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {target ? ` / ${Math.round(target)}` : ""}
        </span>
      </div>
      <Progress
        value={percent}
        max={160}
        className="h-2 bg-muted/70"
        indicatorClassName={warning ? "bg-chart-4" : "bg-chart-2"}
        animationDurationMs={1000}
      />
    </div>
  );
}

function readQueryErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "The meal planner could not be loaded. Please try again.";
}

function isMissingMealPlanError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.trim().toLowerCase();
  return (
    message.includes("meal plan not found or you do not have access") ||
    message.includes("meal group not found or unauthorized")
  );
}

function MealPlannerErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <section className="glass-surface surface-pad">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Could not load meal plan</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" onClick={onRetry} className="rounded-xl" disabled={isRetrying}>
          {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Retry
        </Button>
      </div>
    </section>
  );
}

function findDayPlan(detail: MealGroupDetail | undefined, day: MealDayOfWeek) {
  return detail?.plans.find((plan) => plan.day_of_week === day) ?? detail?.plans[0] ?? null;
}

function SectionIcon({ type, className }: { type: MealItemType; className?: string }) {
  const Icon = MEAL_TYPE_ICONS[type] ?? MEAL_TYPE_ICONS.breakfast;
  return <Icon className={className} />;
}

function defaultCopySourceDay(targetDay: MealDayOfWeek): MealDayOfWeek {
  const currentIndex = DAY_ORDER.indexOf(targetDay);
  if (currentIndex <= 0) return DAY_ORDER[DAY_ORDER.length - 1];
  return DAY_ORDER[currentIndex - 1];
}

function favoriteItemKey(itemName: string, unit: string | null | undefined, mealType: MealItemType) {
  const canonicalUnit = normalizeMealUnit(unit);
  return `${itemName.trim().toLowerCase()}::${canonicalUnit || unit || ""}::${mealType}`;
}

export function MealPlannerPage() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const units = useUnitLabels();
  const groupsQuery = useNutritionMealGroupOptions();
  const mutations = useNutritionGroupMutations();
  const upsertGroupMutateAsync = mutations.upsertGroup.mutateAsync;
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();
  const selectedDay = useNutritionSelectedPlannerDay();
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const customSectionOrderByDay = useNutritionPlannerMealTypeOrder(selectedDay);
  const setCustomSectionOrderByDay = useSetNutritionPlannerMealTypeOrder();
  const clearCustomSectionOrderByDay = useClearNutritionPlannerMealTypeOrder();
  const setSelectedDay = useSetNutritionSelectedPlannerDay();
  const resolvedSubject = useMemo(
    () => resolveNutritionSubject(activeSubjectType, activeSubjectId),
    [activeSubjectId, activeSubjectType]
  );
  const activePlanDate = useMemo(() => toDateInput(new Date()), []);
  const activePlanQuery = useNutritionActivePlanForDate(activePlanDate, resolvedSubject);

  const groups = useMemo(() => groupsQuery.data?.rows ?? [], [groupsQuery.data?.rows]);
  const resolvedSelectedMealGroupId = useMemo(() => {
    if (!selectedMealGroupId) return null;
    return groups.some((row) => row.id === selectedMealGroupId) ? selectedMealGroupId : null;
  }, [groups, selectedMealGroupId]);
  const groupId =
    groupsQuery.isLoading || groups.length === 0
      ? null
      : resolvedSelectedMealGroupId;
  const nutritionMutations = useNutritionMutations(activePlanDate, resolvedSubject, groupId);
  const [notesDraft, setNotesDraft] = useState("");

  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [itemEditorQuickMode, setItemEditorQuickMode] = useState(false);
  const [itemEditorDefaultValue, setItemEditorDefaultValue] = useState<Partial<MealItemEditorValue> | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string | null } | null>(null);
  const [isCustomOrderModalOpen, setIsCustomOrderModalOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLookupEnabled, setFavoritesLookupEnabled] = useState(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [isClientReady, setIsClientReady] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<MealDayOfWeek>(() => defaultCopySourceDay(currentMealDay()));
  const [favoriteType, setFavoriteType] = useState<MealItemType>("breakfast");
  const autoInitFiredRef = useRef(false);
  const noPlansFiredRef = useRef(false);

  const createDefaultGroup = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        const result = await upsertGroupMutateAsync({
          name: "My Meal Planner",
          description: "Weekly meal planner",
          status: "draft",
        });
        if (result?.id) {
          setSelectedMealGroupId(result.id);
        }
        if (!silent) {
          toast.success("Meal planner created");
        }
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to create planner");
        return null;
      }
    },
    [setSelectedMealGroupId, upsertGroupMutateAsync]
  );

  const resetPlanner = useCallback(async () => {
    if (!groupId) return;
    try {
      const deleted = await withToastFeedback(mutations.deleteGroup.mutateAsync({ meal_group_id: groupId }), {
        loading: "Resetting planner...",
        success: "Planner reset",
        error: "Unable to reset planner",
      }).catch(() => null);
      if (!deleted) return;
      setSelectedMealGroupId("");
      autoInitFiredRef.current = false;
      noPlansFiredRef.current = false;
      await createDefaultGroup({ silent: true });
    } catch {
      return;
    }
  }, [createDefaultGroup, groupId, mutations.deleteGroup, setSelectedMealGroupId]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!selectedMealGroupId) return;
    if (groups.some((row) => row.id === selectedMealGroupId)) return;
    if (groupsQuery.data?.has_more) return;
    setSelectedMealGroupId("");
  }, [selectedMealGroupId, groups, groupsQuery.data?.has_more, setSelectedMealGroupId]);

  useEffect(() => {
    if (groupId) return;
    if (groupsQuery.isLoading) return;
    if (groupsQuery.isFetching) return;
    const fallbackGroupId = groups[0]?.id;
    if (!fallbackGroupId) return;
    setSelectedMealGroupId(fallbackGroupId);
  }, [groupId, groups, groupsQuery.isFetching, groupsQuery.isLoading, setSelectedMealGroupId]);

  const detailQuery = useNutritionMealGroup(groupId ?? "");
  const detail = detailQuery.data;

  useEffect(() => {
    if (groupsQuery.isLoading) return;
    if (groups.length > 0) return;
    if (autoInitFiredRef.current) return;
    autoInitFiredRef.current = true;
    void createDefaultGroup({ silent: true });
  }, [createDefaultGroup, groups.length, groupsQuery.isLoading]);

  useEffect(() => {
    if (!groupId) return;
    if (detailQuery.isLoading || detailQuery.isFetching) return;
    if (detailQuery.isError && isMissingMealPlanError(detailQuery.error)) {
      setSelectedMealGroupId("");
      return;
    }
    if (!detailQuery.isError && !detailQuery.data) {
      setSelectedMealGroupId("");
    }
  }, [
    groupId,
    detailQuery.isLoading,
    detailQuery.isFetching,
    detailQuery.isError,
    detailQuery.error,
    detailQuery.data,
    setSelectedMealGroupId,
  ]);

  const selectedPlan = useMemo(() => findDayPlan(detail, selectedDay), [detail, selectedDay]);

  useEffect(() => {
    noPlansFiredRef.current = false;
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    if (!detail) return;
    if (detail.plans.length > 0) return;
    if (detailQuery.isLoading || detailQuery.isFetching) return;
    if (noPlansFiredRef.current) return;
    noPlansFiredRef.current = true;
    void resetPlanner();
  }, [detail, detailQuery.isFetching, detailQuery.isLoading, groupId, resetPlanner]);

  const activePlan = activePlanQuery.data?.active_plan ?? null;
  const allFavoritesQuery = useFavoriteMealItems(100, null, { enabled: favoritesLookupEnabled || favoritesOpen });
  const favoritesQuery = useFavoriteMealItems(40, favoriteType, { enabled: favoritesOpen });

  useEffect(() => {
    setNotesDraft(selectedPlan?.notes ?? "");
  }, [selectedPlan?.id, selectedPlan?.notes]);

  useEffect(() => {
    if (copyFromDay !== selectedDay) return;
    setCopyFromDay(defaultCopySourceDay(selectedDay));
  }, [copyFromDay, selectedDay]);

  useEffect(() => {
    if (!favoritesOpen) return;
    setFavoritesLookupEnabled(true);
  }, [favoritesOpen]);

  useEffect(() => {
    if (!allFavoritesQuery.data) return;
    setFavoriteOverrides((previous) => (Object.keys(previous).length > 0 ? {} : previous));
  }, [allFavoritesQuery.data]);

  const favoriteMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const favorite of allFavoritesQuery.data || []) {
      const mealType = favorite.meal_type ?? "";
      if (!isMealItemType(mealType)) continue;
      map.set(favoriteItemKey(favorite.item_name, favorite.unit, mealType), true);
    }
    for (const [key, value] of Object.entries(favoriteOverrides)) {
      map.set(key, value);
    }
    return map;
  }, [allFavoritesQuery.data, favoriteOverrides]);

  const customSectionOrder = useMemo(
    () => customSectionOrderByDay.filter(isMealItemType),
    [customSectionOrderByDay]
  );

  const sectionTypes = useMemo(() => {
    const configuredTypes = Array.from(new Set((selectedPlan?.meal_types || []).map((entry) => entry.type).filter(isMealItemType)));
    const baseTypes = configuredTypes.length > 0 ? configuredTypes : [...MEAL_TYPE_DISPLAY_ORDER];
    const inferredTypes = Array.from(new Set((selectedPlan?.items || []).map((item) => item.type).filter(isMealItemType)));

    const merged = [...baseTypes];
    for (const inferredType of inferredTypes) {
      if (merged.includes(inferredType)) continue;
      merged.push(inferredType);
    }
    return merged;
  }, [selectedPlan?.items, selectedPlan?.meal_types]);

  const orderedVisibleSectionTypes = useMemo(
    () => (customSectionOrder.length > 0 ? customSectionOrder : sectionTypes),
    [customSectionOrder, sectionTypes]
  );

  const customOrderRank = useMemo(() => {
    const map = new Map<MealItemType, number>();
    for (const [index, type] of customSectionOrder.entries()) {
      map.set(type, index + 1);
    }
    return map;
  }, [customSectionOrder]);

  const itemsByType = useMemo(() => {
    const map = new Map<MealItemType, MealGroupDetail["plans"][number]["items"]>();
    for (const type of sectionTypes) map.set(type, []);
    for (const item of selectedPlan?.items ?? []) {
      const current = map.get(item.type) ?? [];
      map.set(item.type, [...current, item]);
    }
    return map;
  }, [sectionTypes, selectedPlan?.items]);
  const plannerProgress = useMemo(() => {
    if (!activePlan || !selectedPlan) {
      return {
        calories_pct: null as number | null,
        protein_pct: null as number | null,
        carbs_pct: null as number | null,
        fat_pct: null as number | null,
      };
    }

    return {
      calories_pct: computeProgressPercent(selectedPlan.totals.calories ?? 0, activePlan.daily_calorie_target),
      protein_pct: computeProgressPercent(selectedPlan.totals.protein_g ?? 0, activePlan.daily_protein_target_g),
      carbs_pct: computeProgressPercent(selectedPlan.totals.carbs_g ?? 0, activePlan.daily_carbs_target_g),
      fat_pct: computeProgressPercent(selectedPlan.totals.fat_g ?? 0, activePlan.daily_fat_target_g),
    };
  }, [activePlan, selectedPlan]);

  const openCreateItem = (type: MealItemType, quickMode = false) => {
    setEditingItemId(null);
    setItemEditorQuickMode(quickMode);
    setItemEditorDefaultValue({
      type,
      title: quickMode ? "Quick Add" : "",
      quantity: null,
      unit: null,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: null,
      notes: null,
      planned_time: null,
    });
    setItemEditorOpen(true);
  };

  const openEditItem = (item: NonNullable<MealGroupDetail["plans"][number]["items"][number]>) => {
    setEditingItemId(item.id);
    setItemEditorQuickMode(false);
    setItemEditorDefaultValue({
      type: item.type,
      title: item.title || "",
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories || 0,
      protein_g: item.protein_g || 0,
      carbs_g: item.carbs_g || 0,
      fat_g: item.fat_g || 0,
      fiber_g: null,
      notes: item.notes || null,
      planned_time: item.planned_time || null,
    });
    setItemEditorOpen(true);
  };

  const onSaveItemEditor = async (value: MealItemEditorValue) => {
    if (!groupId) {
      toast.error("Select a meal group to continue.");
      return;
    }

    const dayPlan = findDayPlan(detail, selectedDay);
    if (!dayPlan) {
      toast.error("No planner day is available for the selected meal plan.");
      return;
    }

    try {
      const mealType = isMealItemType(value.type) ? value.type : "breakfast";
      const title = value.title.trim() || (itemEditorQuickMode ? "Quick Add" : MEAL_TYPE_LABELS[mealType]);

      if (!editingItemId) {
        await mutations.createItem.mutateAsync({
          meal_plan_id: dayPlan.id,
          type: mealType,
          title,
          quantity: value.quantity,
          unit: value.unit,
          calories: value.calories,
          protein_g: value.protein_g,
          carbs_g: value.carbs_g,
          fat_g: value.fat_g,
          notes: value.notes,
          planned_date: null,
          planned_time: value.planned_time,
        });
        toast.success("Meal item added");
      } else {
        const updated = await withToastFeedback(
          mutations.updateItem.mutateAsync({
            meal_item_id: editingItemId,
            changes: {
              type: mealType,
              title,
              quantity: value.quantity,
              unit: value.unit,
              calories: value.calories,
              protein_g: value.protein_g,
              carbs_g: value.carbs_g,
              fat_g: value.fat_g,
              notes: value.notes,
              planned_date: null,
              planned_time: value.planned_time,
            },
          }),
          {
            loading: "Updating meal item...",
            success: "Meal item updated",
            error: "Unable to save meal item",
          }
        ).catch(() => null);
        if (!updated) return;
      }
      setItemEditorOpen(false);
      setItemEditorDefaultValue(null);
      setEditingItemId(null);
      setItemEditorQuickMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal item");
    }
  };

  const saveNotes = async () => {
    if (!selectedPlan) return;
    await withToastFeedback(
      mutations.updatePlanNote.mutateAsync({
        meal_plan_id: selectedPlan.id,
        notes: notesDraft.trim() || null,
      }),
      {
        loading: "Updating section notes...",
        success: "Section notes saved",
        error: "Unable to save notes",
      }
    ).catch(() => null);
  };

  const onCopyFromDay = async () => {
    if (!groupId) return;
    try {
      const result = await mutations.copyDay.mutateAsync({
        meal_group_id: groupId,
        source_day: copyFromDay,
        target_day: selectedDay,
      });
      if (result.copied_count === 0) {
        toast.message(`No meals found on ${MEAL_DAY_LABELS[copyFromDay]}.`);
      } else {
        toast.success(
          `Copied ${result.copied_count} ${result.copied_count === 1 ? "meal" : "meals"} from ${MEAL_DAY_LABELS[copyFromDay]}.`
        );
      }
      setIsCopyDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy meals");
    }
  };

  const addFavoriteToPlanner = async (item: {
    item_name: string;
    quantity: number | null;
    unit: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    notes: string | null;
  }) => {
    if (!selectedPlan) return;
    try {
      await mutations.createItem.mutateAsync({
        meal_plan_id: selectedPlan.id,
        type: favoriteType,
        title: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories ?? 0,
        protein_g: item.protein_g ?? 0,
        carbs_g: item.carbs_g ?? 0,
        fat_g: item.fat_g ?? 0,
        notes: item.notes,
        planned_date: null,
        planned_time: null,
      });
      toast.success("Favorite added to planner");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add favorite");
    }
  };

  const onToggleFavoriteItem = async (
    type: MealItemType,
    item: {
      title: string | null;
      quantity: number | null;
      unit: string | null;
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
      notes: string | null;
    }
  ) => {
    const normalizedName = (item.title || MEAL_TYPE_LABELS[type]).trim();
    if (!normalizedName) return;

    const normalizedUnit = normalizeMealUnit(item.unit);
    const key = favoriteItemKey(normalizedName, normalizedUnit, type);
    setFavoritesLookupEnabled(true);
    const result = await withToastFeedback(
      nutritionMutations.toggleFavorite.mutateAsync({
        item: {
          item_name: normalizedName,
          quantity: item.quantity,
          unit: normalizedUnit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: null,
          notes: item.notes,
        },
        meal_type: type,
      }),
      {
        loading: "Updating favorites...",
        success: (value) => (value.favorited ? "Added to favorites" : "Removed from favorites"),
        error: "Unable to update favorites",
      }
    ).catch(() => null);
    if (!result) return;
    setFavoriteOverrides((previous) => ({
      ...previous,
      [key]: result.favorited,
    }));
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    const result = await withToastFeedback(mutations.deleteItem.mutateAsync({ meal_item_id: deleteTarget.id }), {
      loading: "Deleting meal item...",
      success: "Meal item deleted",
      error: "Unable to delete item",
    }).catch(() => null);
    if (!result) return;
    setDeleteTarget(null);
  };

  const toggleCustomOrderType = (type: MealItemType) => {
    setCustomSectionOrderByDay(selectedDay, (previous) => {
      const normalizedPrevious = previous.filter(isMealItemType);
      if (normalizedPrevious.includes(type)) {
        return normalizedPrevious.filter((entry) => entry !== type);
      }
      return [...normalizedPrevious, type];
    });
  };

  const clearCustomOrder = () => {
    clearCustomSectionOrderByDay(selectedDay);
  };

  if (!isClientReady || groupsQuery.isLoading) {
    return <MealPlannerSkeleton />;
  }

  if (groups.length === 0 && mutations.upsertGroup.isPending) {
    return <MealPlannerSkeleton />;
  }

  if (groupId && detailQuery.isLoading && !detailQuery.isError) {
    return <MealPlannerSkeleton />;
  }

  if (groupId && detailQuery.isError && isMissingMealPlanError(detailQuery.error)) {
    return <MealPlannerSkeleton />;
  }

  if (groupId && detailQuery.isError) {
    return (
      <MealPlannerErrorState
        message={readQueryErrorMessage(detailQuery.error)}
        onRetry={() => void detailQuery.refetch()}
        isRetrying={detailQuery.isFetching}
      />
    );
  }

  if (!groupId) {
    return <MealPlannerSkeleton />;
  }

  if (!detail) {
    return <MealPlannerSkeleton />;
  }

  if (detail.plans.length === 0 || !selectedPlan) {
    return <MealPlannerSkeleton />;
  }

  const dayLabel = MEAL_DAY_LABELS[selectedPlan.day_of_week];

  return (
    <div className="section-gap">
      <section className="glass-surface surface-pad space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Meal Group</p>
        <h1 className="text-lg font-semibold tracking-tight">{detail.group.name}</h1>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              className={cn(
                "flex h-12 min-w-[58px] flex-col items-center justify-center rounded-[10px] border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                selectedDay === day
                  ? "border-chart-2/50 bg-chart-2 text-black"
                  : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => setSelectedDay(day)}
            >
              {MEAL_DAY_LABELS[day].slice(0, 3)}
            </button>
          ))}
          <Button
            variant="outline"
            className="ml-auto rounded-xl border-border/70"
            onClick={() => setIsCopyDialogOpen(true)}
            disabled={mutations.copyDay.isPending}
          >
            <Copy className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Copy From Day</span>
          </Button>
        </div>
      </section>

      {activePlan ? (
        <section className="glass-surface surface-pad space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <ProgressBar
              metric="calories"
              label="Calories"
              value={selectedPlan.totals.calories ?? 0}
              target={activePlan.daily_calorie_target}
              pct={plannerProgress.calories_pct}
            />
            <ProgressBar
              metric="protein"
              label={`Protein (${units.macro})`}
              value={selectedPlan.totals.protein_g ?? 0}
              target={activePlan.daily_protein_target_g}
              pct={plannerProgress.protein_pct}
            />
            <ProgressBar
              metric="carbs"
              label={`Carbs (${units.macro})`}
              value={selectedPlan.totals.carbs_g ?? 0}
              target={activePlan.daily_carbs_target_g}
              pct={plannerProgress.carbs_pct}
            />
            <ProgressBar
              metric="fat"
              label={`Fat (${units.macro})`}
              value={selectedPlan.totals.fat_g ?? 0}
              target={activePlan.daily_fat_target_g}
              pct={plannerProgress.fat_pct}
            />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meal Types</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-border/60"
              onClick={() => setIsCustomOrderModalOpen(true)}
              disabled={!groupId}
            >
              <ListOrdered className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Custom Order</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={clearCustomOrder}
              disabled={customSectionOrder.length === 0}
            >
              <RotateCcw className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clear Order</span>
            </Button>
          </div>
        </div>

        {orderedVisibleSectionTypes.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">No meal types added for {dayLabel} yet.</p>
          </div>
        ) : null}
        {orderedVisibleSectionTypes.map((type) => {
          const sectionItems = itemsByType.get(type) ?? [];
          const macroTotals = sectionItems.reduce(
            (acc, item) => {
              acc.calories += item.calories ?? 0;
              acc.protein_g += item.protein_g ?? 0;
              acc.carbs_g += item.carbs_g ?? 0;
              acc.fat_g += item.fat_g ?? 0;
              return acc;
            },
            { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
          );

          return (
            <article key={`${selectedPlan.id}-${type}`} className="glass-surface overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SectionIcon type={type} className={cn("h-4 w-4", MEAL_TYPE_ACCENTS[type])} />
                    <h3 className="truncate text-xl font-semibold tracking-tight">{MEAL_TYPE_LABELS[type]}</h3>
                    <span className="text-sm text-muted-foreground">{Math.round(macroTotals.calories)} kcal</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    P {Math.round(macroTotals.protein_g)}g • C {Math.round(macroTotals.carbs_g)}g • F {Math.round(macroTotals.fat_g)}g
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden rounded-xl border-border/60 md:inline-flex"
                    onClick={() => openCreateItem(type, true)}
                    disabled={!groupId}
                  >
                    <Zap className="mr-0 h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Quick Add</span>
                  </Button>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full accent-strong"
                    onClick={() => openCreateItem(type)}
                    aria-label={`Add item to ${MEAL_TYPE_LABELS[type]}`}
                    disabled={!groupId}
                  >
                    <CirclePlus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {sectionItems.length === 0 ? (
                <button
                  type="button"
                  className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => openCreateItem(type)}
                  disabled={!groupId}
                >
                  Tap + to add your first item
                </button>
              ) : (
                <div className="divide-y divide-border/30 px-4 md:px-5">
                  {sectionItems
                    .slice()
                    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
                    .map((item) => {
                      const itemName = (item.title || MEAL_TYPE_LABELS[type]).trim();
                      const itemFavoriteKey = favoriteItemKey(itemName, item.unit, type);
                      const isFavorite = favoriteMap.get(itemFavoriteKey) === true;
                      return (
                        <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-medium leading-tight">{item.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.planned_time || "No time"}
                              {item.quantity !== null && item.quantity !== undefined ? ` • ${item.quantity}` : ""}
                              {item.unit ? ` ${item.unit}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              P {Math.round(Number(item.protein_g || 0))}g • C {Math.round(Number(item.carbs_g || 0))}g • F {Math.round(Number(item.fat_g || 0))}g
                            </p>
                            {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="mr-2 text-xl font-semibold">{Math.round(Number(item.calories || 0))}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() =>
                                void onToggleFavoriteItem(type, {
                                  title: item.title,
                                  quantity: item.quantity,
                                  unit: item.unit,
                                  calories: item.calories,
                                  protein_g: item.protein_g,
                                  carbs_g: item.carbs_g,
                                  fat_g: item.fat_g,
                                  notes: item.notes,
                                })
                              }
                              disabled={nutritionMutations.toggleFavorite.isPending}
                              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className={cn("h-4 w-4", isFavorite ? "fill-chart-4 text-chart-4" : "text-muted-foreground")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditItem(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => {
                                void mutations.duplicateItem
                                  .mutateAsync({ meal_item_id: item.id })
                                  .then(() => toast.success("Meal item duplicated"))
                                  .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to duplicate item"));
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive"
                              onClick={() => {
                                setDeleteTarget({ id: item.id, name: item.title });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="glass-surface surface-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="h-auto rounded-lg px-0 text-left hover:bg-transparent"
            onClick={() => setFavoritesOpen((previous) => !previous)}
          >
            <div className="flex items-center gap-2">
              <ChevronRight className={cn("h-4 w-4 transition-transform", favoritesOpen ? "rotate-90" : "")} />
              <Star className="h-4 w-4 text-chart-4" />
              <p className="text-sm font-semibold">Favorites</p>
            </div>
          </Button>
          {favoritesOpen ? (
            <Select value={favoriteType} onValueChange={(value) => setFavoriteType(value as MealItemType)}>
              <SelectTrigger className="h-9 w-[190px] rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPE_DISPLAY_ORDER.map((type) => (
                  <SelectItem key={type} value={type}>
                    {MEAL_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        {!favoritesOpen ? <p className="mt-2 text-xs text-muted-foreground">Open favorites to load reusable meals.</p> : null}
        {favoritesOpen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {favoritesQuery.isLoading ? <span className="text-sm text-muted-foreground">Loading favorites...</span> : null}
            {(favoritesQuery.data || []).slice(0, 12).map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant="outline"
                className="rounded-full border-border/60 bg-muted/20"
                onClick={() =>
                  void addFavoriteToPlanner({
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit: item.unit,
                    calories: item.calories,
                    protein_g: item.protein_g,
                    carbs_g: item.carbs_g,
                    fat_g: item.fat_g,
                    notes: item.notes,
                  })
                }
              >
                {item.item_name}
              </Button>
            ))}
            {!favoritesQuery.isLoading && (favoritesQuery.data || []).length === 0 ? (
              <span className="text-sm text-muted-foreground">No favorites yet</span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="glass-surface surface-pad space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Section notes</h2>
        <Textarea
          value={notesDraft}
          onChange={(event) => setNotesDraft(event.target.value)}
          placeholder={`Add notes for ${dayLabel.toLowerCase()}...`}
          className="min-h-[180px] border-border/70 bg-muted/20"
        />
        <div className="flex justify-end">
          <Button
            className="rounded-xl"
            onClick={() => void saveNotes()}
            disabled={mutations.updatePlanNote.isPending}
          >
            Save Notes
          </Button>
        </div>
      </section>

      <MealItemEditorSheet
        open={itemEditorOpen}
        onOpenChange={(open) => {
          setItemEditorOpen(open);
          if (!open) {
            setItemEditorDefaultValue(null);
            setEditingItemId(null);
            setItemEditorQuickMode(false);
          }
        }}
        mode={editingItemId ? "edit" : "create"}
        defaultValue={itemEditorDefaultValue}
        quickMode={itemEditorQuickMode}
        showPlannedTime
        pending={mutations.createItem.isPending || mutations.updateItem.isPending}
        mealTypeOptions={sectionTypes.map((type) => ({ value: type, label: MEAL_TYPE_LABELS[type] }))}
        onSave={onSaveItemEditor}
      />

      <Sheet open={isCustomOrderModalOpen} onOpenChange={setIsCustomOrderModalOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
            isDesktop ? "w-full sm:max-w-md" : "max-h-[88vh] rounded-t-2xl"
          )}
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Custom Order</SheetTitle>
            <SheetDescription>Select meal types in the order you want them displayed.</SheetDescription>
          </SheetHeader>

          <div className="space-y-2 p-5">
            {MEAL_TYPE_DISPLAY_ORDER.map((type) => {
              const sequence = customOrderRank.get(type) || null;
              const active = sequence !== null;
              return (
                <button
                  key={type}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                    active ? "border-chart-2/60 bg-chart-2/10" : "border-border/60 bg-muted/20 hover:bg-muted/35"
                  )}
                  onClick={() => toggleCustomOrderType(type)}
                >
                  <span className="inline-flex items-center gap-2">
                    <SectionIcon type={type} className="h-4 w-4 text-chart-2" />
                    <span className="text-sm font-medium">{MEAL_TYPE_LABELS[type]}</span>
                  </span>
                  {sequence ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-chart-2 px-1 text-xs font-semibold text-black">
                      {sequence}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not selected</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/60 p-5">
            <Button variant="outline" className="w-full rounded-xl border-border/60" onClick={clearCustomOrder} disabled={customSectionOrder.length === 0}>
              Clear Order
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
            isDesktop ? "w-full sm:max-w-md" : "max-h-[88vh] rounded-t-2xl"
          )}
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Copy Meals From Day</SheetTitle>
            <SheetDescription>Copy all meal cards and entries from one weekday into the selected day.</SheetDescription>
          </SheetHeader>

          <div className="grid gap-3 px-5 py-4">
            <div className="space-y-2">
              <Label>Source Day</Label>
              <Select value={copyFromDay} onValueChange={(value) => setCopyFromDay(value as MealDayOfWeek)}>
                <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_ORDER.filter((day) => day !== selectedDay).map((day) => (
                    <SelectItem key={day} value={day}>
                      {MEAL_DAY_LABELS[day]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Target day: <span className="font-medium text-foreground">{MEAL_DAY_LABELS[selectedDay]}</span>
            </p>
          </div>

          <div className="border-t border-border/60 px-5 py-4">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => setIsCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="accent-strong flex-1 rounded-xl" onClick={() => void onCopyFromDay()} disabled={mutations.copyDay.isPending}>
                {mutations.copyDay.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Copy Meals
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConfirmSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        itemName={deleteTarget?.name}
        pending={mutations.deleteItem.isPending}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}
