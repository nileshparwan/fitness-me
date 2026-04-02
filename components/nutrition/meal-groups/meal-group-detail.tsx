"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, CirclePlus, Copy, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { MealGroupStatus, MealItemType } from "@/app/actions/meal-groups";
import {
  useNutritionGroupMutations,
  useNutritionMealGroup,
} from "@/hooks/use-nutrition-data";
import { useFavoriteMealItems, useNutritionMutations } from "@/hooks/use-nutrition-manual";
import {
  useClearNutritionMealGroupMealTypeOrder,
  useNutritionMealGroupMealTypeOrder,
  useSetNutritionMealGroupMealTypeOrder,
  useSetNutritionSelectedMealGroupId,
} from "@/stores/use-nutrition-ui-store";
import { MealGroupAssigneeDropdown } from "@/components/nutrition/meal-groups/meal-group-assignee-dropdown";
import {
  MEAL_TYPE_ACCENTS,
  MEAL_DAY_LABELS,
  MEAL_DAY_ORDER,
  MEAL_GROUP_STATUS_LABELS,
  MEAL_TYPE_DISPLAY_ORDER,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_LABELS,
} from "@/components/nutrition/meal-groups/meal-group-types";
import { ShareMealGroupSheet } from "@/components/nutrition/share-meal-group-sheet";
import { DeleteConfirmSheet } from "@/components/nutrition/shared/delete-confirm-sheet";
import { MealItemEditorSheet, type MealItemEditorValue } from "@/components/nutrition/shared/meal-item-editor-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/use-media-query";
import { normalizeMealUnit } from "@/lib/nutrition/meal-units";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import type { Database } from "@/types/database";
import { cn } from "@/utils";

type MealItemRow = Database["public"]["Tables"]["nutrition_plan_items"]["Row"];
type MealDayOfWeek = Database["public"]["Enums"]["day_of_week"];

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No duration";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

function statusChipStyle(status: MealGroupStatus) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/15 text-chart-2";
  if (status === "archived") return "border-chart-4/40 bg-chart-4/15 text-chart-4";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isMealItemType(value: string): value is MealItemType {
  return MEAL_TYPE_DISPLAY_ORDER.includes(value as MealItemType);
}

function defaultCopySourceDay(targetDay: MealDayOfWeek): MealDayOfWeek {
  const index = MEAL_DAY_ORDER.indexOf(targetDay);
  if (index <= 0) return MEAL_DAY_ORDER[MEAL_DAY_ORDER.length - 1];
  return MEAL_DAY_ORDER[index - 1];
}

function favoriteItemKey(itemName: string, unit: string | null | undefined, mealType: MealItemType) {
  const normalizedUnit = normalizeMealUnit(unit);
  return `${itemName.trim().toLowerCase()}::${normalizedUnit || unit || ""}::${mealType}`;
}

export function MealGroupDetail({ mealGroupId }: { mealGroupId: string }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const detailQuery = useNutritionMealGroup(mealGroupId);
  const mutations = useNutritionGroupMutations();
  const nutritionMutations = useNutritionMutations(todayIsoDate(), undefined, mealGroupId);
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();

  const [selectedDay, setSelectedDay] = useState<MealDayOfWeek>("mon");
  const customOrderByDay = useNutritionMealGroupMealTypeOrder(mealGroupId, selectedDay);
  const setCustomOrderByDay = useSetNutritionMealGroupMealTypeOrder();
  const clearCustomOrderByDay = useClearNutritionMealGroupMealTypeOrder();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupNotes, setGroupNotes] = useState("");
  const [groupStartDate, setGroupStartDate] = useState("");
  const [groupEndDate, setGroupEndDate] = useState("");
  const [groupStatus, setGroupStatus] = useState<MealGroupStatus>("draft");

  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [itemEditorQuickMode, setItemEditorQuickMode] = useState(false);
  const [itemEditorDefaultValue, setItemEditorDefaultValue] = useState<Partial<MealItemEditorValue> | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string | null } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [customOrderModalOpen, setCustomOrderModalOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLookupEnabled, setFavoritesLookupEnabled] = useState(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [copyFromDay, setCopyFromDay] = useState<MealDayOfWeek>(() => defaultCopySourceDay("mon"));
  const [favoriteType, setFavoriteType] = useState<MealItemType>("breakfast");
  const [dayNotesDraft, setDayNotesDraft] = useState("");

  useEffect(() => {
    setSelectedMealGroupId(mealGroupId);
  }, [mealGroupId, setSelectedMealGroupId]);

  const data = detailQuery.data;
  const group = data?.group || null;
  const plansByDay = useMemo(() => new Map((data?.plans || []).map((plan) => [plan.day_of_week, plan])), [data?.plans]);
  const dayPlan = plansByDay.get(selectedDay) || null;
  const activeAssignment = useMemo(() => {
    if (!group) return null;
    const rows = data?.assignments || [];
    return (
      rows.find(
        (assignment) =>
          assignment.template_plan_id === group.id &&
          (assignment.status === "active" || assignment.status === "paused")
      ) || null
    );
  }, [data?.assignments, group]);

  const allFavoritesQuery = useFavoriteMealItems(100, null, { enabled: favoritesLookupEnabled || favoritesOpen });
  const favoritesQuery = useFavoriteMealItems(40, favoriteType, { enabled: favoritesOpen });

  const customOrder = useMemo(
    () => customOrderByDay.filter(isMealItemType),
    [customOrderByDay]
  );

  const sectionTypes = useMemo(() => {
    if (!dayPlan) return [...MEAL_TYPE_DISPLAY_ORDER];
    const configuredTypes = Array.from(new Set((dayPlan.meal_types || []).map((entry) => entry.type).filter(isMealItemType)));
    const baseTypes = configuredTypes.length > 0 ? configuredTypes : [...MEAL_TYPE_DISPLAY_ORDER];
    const inferredTypes = Array.from(new Set((dayPlan.items || []).map((item) => item.type).filter(isMealItemType)));
    const merged = [...baseTypes];
    for (const inferredType of inferredTypes) {
      if (merged.includes(inferredType)) continue;
      merged.push(inferredType);
    }
    return merged;
  }, [dayPlan]);

  const orderedVisibleSectionTypes = useMemo(
    () => (customOrder.length > 0 ? customOrder : sectionTypes),
    [customOrder, sectionTypes]
  );

  const customOrderRank = useMemo(() => {
    const map = new Map<MealItemType, number>();
    for (const [index, type] of customOrder.entries()) {
      map.set(type, index + 1);
    }
    return map;
  }, [customOrder]);

  const itemsByType = useMemo(() => {
    if (!dayPlan) return new Map<MealItemType, MealItemRow[]>();
    const map = new Map<MealItemType, MealItemRow[]>();
    for (const type of sectionTypes) map.set(type, []);
    for (const item of dayPlan.items) {
      if (!isMealItemType(item.type)) continue;
      const list = map.get(item.type) || [];
      list.push(item);
      map.set(item.type, list);
    }

    for (const type of sectionTypes) {
      const sorted = (map.get(type) || []).slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
      map.set(type, sorted);
    }

    return map;
  }, [dayPlan, sectionTypes]);

  useEffect(() => {
    if (!group) return;
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupNotes(group.notes || "");
    setGroupStartDate(group.start_date || "");
    setGroupEndDate(group.end_date || "");
    setGroupStatus(group.status);
  }, [group]);

  useEffect(() => {
    setDayNotesDraft(dayPlan?.notes || "");
  }, [dayPlan?.id, dayPlan?.notes]);

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

  if (detailQuery.isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-[10px]" />
        <Skeleton className="h-16 w-full rounded-[10px]" />
        <Skeleton className="h-96 w-full rounded-[10px]" />
      </div>
    );
  }

  if (detailQuery.isError || !group) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load meal group."}
      </div>
    );
  }

  const saveGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required.");
      return;
    }

    await withToastFeedback(
      mutations.upsertGroup.mutateAsync({
        id: group.id,
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        notes: groupNotes.trim() || null,
        start_date: groupStartDate || null,
        end_date: groupEndDate || null,
        status: groupStatus,
      }),
      {
        loading: "Updating meal group...",
        success: "Meal group updated",
        error: "Unable to update meal group",
      }
    ).catch(() => null);
  };

  const savePlanNotes = async () => {
    if (!dayPlan) return;
    await withToastFeedback(
      mutations.updatePlanNote.mutateAsync({
        plan_day_id: dayPlan.id,
        notes: dayNotesDraft.trim() || null,
      }),
      {
        loading: "Updating day notes...",
        success: "Day notes updated",
        error: "Unable to update day notes",
      }
    ).catch(() => null);
  };

  const openCreateItem = (type: MealItemType, quickMode = false) => {
    setEditingItemId(null);
    setItemEditorQuickMode(quickMode);
    setItemEditorDefaultValue({
      type,
      title: quickMode ? "Quick Add" : "",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: null,
      notes: null,
      quantity: null,
      unit: null,
      planned_time: null,
    });
    setItemEditorOpen(true);
  };

  const openEditItem = (item: MealItemRow) => {
    setEditingItemId(item.id);
    setItemEditorQuickMode(false);
    setItemEditorDefaultValue({
      type: item.type,
      title: item.title,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: null,
      notes: item.notes,
      planned_time: item.planned_time,
    });
    setItemEditorOpen(true);
  };

  const onSaveItemEditor = async (value: MealItemEditorValue) => {
    if (!dayPlan) return;
    const mealType = isMealItemType(value.type) ? value.type : "breakfast";
    const fallbackTitle = MEAL_TYPE_LABELS[mealType];
    const normalizedTitle = value.title.trim() || (itemEditorQuickMode ? "Quick Add" : fallbackTitle);

    const saved = editingItemId
      ? await withToastFeedback(
          mutations.updateItem.mutateAsync({
            meal_item_id: editingItemId,
            changes: {
              type: mealType,
              title: normalizedTitle,
              quantity: value.quantity,
              unit: value.unit,
              calories: value.calories,
              protein_g: value.protein_g,
              carbs_g: value.carbs_g,
              fat_g: value.fat_g,
              notes: value.notes,
              planned_time: value.planned_time,
            },
          }),
          {
            loading: "Updating meal item...",
            success: "Meal item updated",
            error: "Unable to save meal item",
          }
        ).catch(() => null)
      : await withToastFeedback(
          mutations.createItem.mutateAsync({
            plan_day_id: dayPlan.id,
            type: mealType,
            title: normalizedTitle,
            quantity: value.quantity,
            unit: value.unit,
            calories: value.calories,
            protein_g: value.protein_g,
            carbs_g: value.carbs_g,
            fat_g: value.fat_g,
            notes: value.notes,
            planned_time: value.planned_time,
          }),
          {
            loading: "Creating meal item...",
            success: "Meal item created",
            error: "Unable to save meal item",
          }
        ).catch(() => null);

    if (!saved) return;
    setItemEditorOpen(false);
    setItemEditorDefaultValue(null);
    setEditingItemId(null);
    setItemEditorQuickMode(false);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    const result = await withToastFeedback(
      mutations.deleteItem.mutateAsync({ meal_item_id: deleteTarget.id }),
      {
        loading: "Deleting meal item...",
        success: "Meal item deleted",
        error: "Unable to delete meal item",
      }
    ).catch(() => null);
    if (!result) return;
    setDeleteTarget(null);
  };

  const duplicateItem = async (itemId: string) => {
    try {
      await mutations.duplicateItem.mutateAsync({ meal_item_id: itemId });
      toast.success("Meal item duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal item");
    }
  };

  const onCopyFromDay = async () => {
    try {
      const result = await mutations.copyDay.mutateAsync({
        nutrition_plan_id: group.id,
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
      setCopyDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy meals");
    }
  };

  const toggleCustomOrderType = (type: MealItemType) => {
    setCustomOrderByDay(mealGroupId, selectedDay, (previous) => {
      const normalized = previous.filter(isMealItemType);
      if (normalized.includes(type)) {
        return normalized.filter((value) => value !== type);
      }
      return [...normalized, type];
    });
  };

  const clearCustomOrder = () => {
    clearCustomOrderByDay(mealGroupId, selectedDay);
  };

  const addFavoriteToDay = async (item: {
    item_name: string;
    quantity: number | null;
    unit: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    notes: string | null;
  }) => {
    if (!dayPlan) return;
    try {
      await mutations.createItem.mutateAsync({
        plan_day_id: dayPlan.id,
        type: favoriteType,
        title: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories ?? 0,
        protein_g: item.protein_g ?? 0,
        carbs_g: item.carbs_g ?? 0,
        fat_g: item.fat_g ?? 0,
        notes: item.notes,
      });
      toast.success("Favorite added");
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

  const assignmentPending = mutations.assignGroup.isPending || mutations.archiveAssignment.isPending;
  const activeAssigneeId = activeAssignment?.subject_client_id || (activeAssignment?.subject_user_id ? "self" : "");
  const activeAssigneeName = activeAssignment?.subject_user_id
    ? "Myself"
    : activeAssignment?.subject_client_id
      ? `Client ${activeAssignment.subject_client_id.slice(0, 8)}`
      : "Unassigned";

  const assignToSubject = async (input: { id: string; name: string; isSelf: boolean; subjectUserId?: string | null }) => {
    if (group.is_snapshot) {
      throw new Error("Snapshots cannot be reassigned.");
    }

    const startDate = groupStartDate || group.start_date || todayIsoDate();
    const endDate = groupEndDate || group.end_date || startDate;
    const nextSubject = input.isSelf
      ? { subject_user_id: input.subjectUserId || null, subject_client_id: null }
      : { subject_user_id: null, subject_client_id: input.id };

    if (input.isSelf && !nextSubject.subject_user_id) {
      throw new Error("Unable to resolve your account for self-assignment.");
    }

    const assignedToSameSubject = Boolean(
      activeAssignment &&
        ((nextSubject.subject_client_id && activeAssignment.subject_client_id === nextSubject.subject_client_id) ||
          (nextSubject.subject_user_id && activeAssignment.subject_user_id === nextSubject.subject_user_id))
    );
    if (assignedToSameSubject) {
      toast.info(`Already assigned to ${input.name}.`);
      return;
    }

    if (activeAssignment) {
      const archived = await withToastFeedback(
        mutations.archiveAssignment.mutateAsync({ assignment_id: activeAssignment.id }),
        {
          loading: "Updating assignment...",
          success: "Previous assignment archived",
          error: "Unable to update assignment",
        }
      );
      if (!archived) return;
    }

    const assigned = await withToastFeedback(
      mutations.assignGroup.mutateAsync({
        nutrition_plan_id: group.id,
        subject: nextSubject,
        start_date: startDate,
        end_date: endDate,
        notes: activeAssignment?.notes || null,
      }),
      {
        loading: `Assigning to ${input.name}...`,
        success: `Assigned to ${input.name}`,
        error: "Unable to update assignment",
      }
    );
    if (!assigned) return;
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full">
                  <Link href="/nutrition/groups" aria-label="Back to meal groups">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{group.name}</h1>
                <Badge className={cn("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusChipStyle(group.status))}>
                  {MEAL_GROUP_STATUS_LABELS[group.status]}
                </Badge>
              </div>

              <MealGroupAssigneeDropdown
                mealGroupId={group.id}
                currentAssigneeId={activeAssigneeId}
                currentAssigneeName={activeAssigneeName}
                pending={assignmentPending}
                disabled={group.is_snapshot}
                onAssign={assignToSubject}
              />
            </div>

            <p className="text-sm text-muted-foreground">{group.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(group.start_date, group.end_date)}
              </span>
              <span>{data?.assignments.length || 0} assignments</span>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {MEAL_DAY_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={cn("segmented-tab min-w-[58px]", selectedDay === day && "active")}
                    onClick={() => setSelectedDay(day)}
                  >
                    {MEAL_DAY_LABELS[day].slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <ShareMealGroupSheet
                  mealGroupId={group.id}
                  mealGroupName={group.name}
                  isPublic={group.is_public}
                  publicShareToken={group.public_share_token}
                />
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setEditorOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Group
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-border/70"
                  onClick={() => setCopyDialogOpen(true)}
                  disabled={mutations.copyDay.isPending}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy From Day
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-4">
        {!dayPlan ? (
          <p className="text-sm text-muted-foreground">No day plan found for {MEAL_DAY_LABELS[selectedDay]}.</p>
        ) : (
          <div className="space-y-4">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meal Types</h2>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-border/60"
                    onClick={() => setCustomOrderModalOpen(true)}
                  >
                    Custom Order
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={clearCustomOrder}
                    disabled={customOrder.length === 0}
                  >
                    Clear Order
                  </Button>
                </div>
              </div>

              {orderedVisibleSectionTypes.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  No meal types added for this day yet.
                </div>
              ) : null}

              {orderedVisibleSectionTypes.map((type) => {
                const items = itemsByType.get(type) || [];
                const Icon = MEAL_TYPE_ICONS[type];
                const macroTotals = items.reduce(
                  (acc, item) => {
                    acc.calories += Number(item.calories || 0);
                    acc.protein_g += Number(item.protein_g || 0);
                    acc.carbs_g += Number(item.carbs_g || 0);
                    acc.fat_g += Number(item.fat_g || 0);
                    return acc;
                  },
                  { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
                );

                return (
                  <article key={`${dayPlan.id}-${type}`} className="glass-surface overflow-hidden">
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 md:px-5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", MEAL_TYPE_ACCENTS[type])} />
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
                        >
                          Quick Add
                        </Button>
                        <Button
                          size="icon"
                          className="h-10 w-10 rounded-full accent-strong"
                          onClick={() => openCreateItem(type)}
                          aria-label={`Add item to ${MEAL_TYPE_LABELS[type]}`}
                        >
                          <CirclePlus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    {items.length === 0 ? (
                      <button
                        type="button"
                        className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => openCreateItem(type)}
                      >
                        Tap + to add your first item
                      </button>
                    ) : (
                      <div className="divide-y divide-border/30 px-4 md:px-5">
                        {items.map((item) => {
                          const itemName = (item.title || MEAL_TYPE_LABELS[type]).trim();
                          const favoriteKey = favoriteItemKey(itemName, item.unit, type);
                          const isFavorite = favoriteMap.get(favoriteKey) === true;
                          return (
                            <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-medium leading-tight">{item.title}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.quantity !== null && item.quantity !== undefined ? `${item.quantity}` : "No qty"}
                                  {item.unit ? ` ${item.unit}` : ""}
                                  {item.planned_time ? ` • ${item.planned_time}` : ""}
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
                                  onClick={() => void duplicateItem(item.id)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive"
                                  onClick={() => setDeleteTarget({ id: item.id, name: item.title })}
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
                        void addFavoriteToDay({
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

            <div className="glass-subtle space-y-2 p-3">
              <Label>Day Notes</Label>
              <Textarea
                value={dayNotesDraft}
                onChange={(event) => setDayNotesDraft(event.target.value)}
                className="min-h-20 rounded-xl border-border/60 bg-muted/20"
                placeholder="Day-specific notes for strategy, meal timing, and guidance"
              />
              <div className="flex justify-end">
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void savePlanNotes()} disabled={mutations.updatePlanNote.isPending}>
                  {mutations.updatePlanNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Day Notes
                </Button>
              </div>
            </div>
          </div>
        )}
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
        pending={mutations.createItem.isPending || mutations.updateItem.isPending}
        title={editingItemId ? "Edit Meal Item" : `Add Meal Item • ${MEAL_DAY_LABELS[selectedDay]}`}
        description={itemEditorQuickMode ? "Fast macro entry for this meal type." : undefined}
        mealTypeOptions={orderedVisibleSectionTypes.map((type) => ({ value: type, label: MEAL_TYPE_LABELS[type] }))}
        onSave={onSaveItemEditor}
      />

      <DeleteConfirmSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        itemName={deleteTarget?.name}
        pending={mutations.deleteItem.isPending}
        onConfirm={confirmDeleteItem}
      />

      <Sheet open={customOrderModalOpen} onOpenChange={setCustomOrderModalOpen}>
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
              const Icon = MEAL_TYPE_ICONS[type];
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
                    <Icon className="h-4 w-4 text-chart-2" />
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
            <Button variant="outline" className="w-full rounded-xl border-border/60" onClick={clearCustomOrder} disabled={customOrder.length === 0}>
              Clear Order
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
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
                  {MEAL_DAY_ORDER.filter((day) => day !== selectedDay).map((day) => (
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
              <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => setCopyDialogOpen(false)}>
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

      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
            isDesktop ? "w-full sm:max-w-2xl" : "max-h-[88vh] rounded-t-2xl"
          )}
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Edit Meal Group</SheetTitle>
            <SheetDescription>Update details and scheduling for this meal group.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={groupStatus} onValueChange={(value) => setGroupStatus(value as MealGroupStatus)}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={groupStartDate} onChange={(event) => setGroupStartDate(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={groupEndDate} onChange={(event) => setGroupEndDate(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
            </div>

            <div className="space-y-2">
              <Label>Group Notes</Label>
              <Textarea value={groupNotes} onChange={(event) => setGroupNotes(event.target.value)} className="min-h-24 rounded-xl border-border/60 bg-muted/20" />
            </div>

            <div className="flex justify-end">
              <Button
                className="accent-strong rounded-xl"
                onClick={() => void saveGroup()}
                disabled={mutations.upsertGroup.isPending}
              >
                {mutations.upsertGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Group
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
