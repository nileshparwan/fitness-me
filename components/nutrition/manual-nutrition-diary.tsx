"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  ClipboardCopy,
  Copy,
  History,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { ManualDiaryItem, ManualDiaryLog, MealType } from "@/app/actions/nutrition-manual";
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { DeleteConfirmSheet } from "@/components/nutrition/shared/delete-confirm-sheet";
import { MealItemEditorSheet, type MealItemEditorValue } from "@/components/nutrition/shared/meal-item-editor-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientNutritionSummary7d,
  useFavoriteMealItems,
  useLogFromPlan,
  useMealPlanTemplates,
  useNutritionDiary,
  useNutritionMutations,
} from "@/hooks/use-nutrition-manual";
import {
  useNutritionAutoMealGroupSelection,
  useNutritionMealGroupOptions,
} from "@/hooks/use-nutrition-data";
import {
  useNutritionDiaryMealTypeOrder,
  useClearNutritionDiaryMealTypeOrder,
  useNutritionRecentDiaryItems,
  usePushNutritionRecentDiaryItem,
  useNutritionSelectedDate,
  useNutritionSelectedMealGroupId,
  useSetNutritionActiveSubject,
  useSetNutritionDiaryFilters,
  useSetNutritionDiaryMealTypeOrder,
  useSetNutritionSelectedDate,
  useSetNutritionSelectedMealGroupId,
} from "@/stores/use-nutrition-ui-store";
import { useUnitLabels } from "@/stores/use-settings-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { computeNutritionVisualPercent, type NutritionProgressMetric } from "@/lib/nutrition/progress-bars";
import { normalizeMealUnit } from "@/lib/nutrition/meal-units";
import type { NutritionSubject } from "@/lib/query-keys-nutrition";
import { canNavigateDate, isMealGroupSelected, mealTypeOrderRank } from "@/lib/nutrition/meal-ui";
import { toDateInput } from "@/lib/utils/date";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

type DiaryMealSection =
  | "breakfast"
  | "snack"
  | "lunch"
  | "pre_workout_meal"
  | "post_workout_meal"
  | "dinner"
  | "protein_drink"
  | "water"
  | "other";
type OrderableMealType = Exclude<DiaryMealSection, "other">;

const DIARY_SECTIONS: Array<{ key: DiaryMealSection; label: string; accent: string }> = [
  { key: "water", label: "Water", accent: "text-chart-3" },
  { key: "breakfast", label: "Breakfast", accent: "text-chart-1" },
  { key: "snack", label: "Snack", accent: "text-chart-4" },
  { key: "lunch", label: "Lunch", accent: "text-chart-2" },
  { key: "pre_workout_meal", label: "Pre-workout", accent: "text-chart-3" },
  { key: "post_workout_meal", label: "Post-workout", accent: "text-chart-5" },
  { key: "dinner", label: "Dinner", accent: "text-chart-4" },
  { key: "protein_drink", label: "Protein Drink", accent: "text-chart-1" },
  { key: "other", label: "Other", accent: "text-muted-foreground" },
];

type VisibleSectionCard = {
  id: string;
  key: DiaryMealSection;
  label: string;
  accent: string;
  position: number;
};

const ORDERABLE_DIARY_MEAL_TYPES: OrderableMealType[] = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
];
const DEFAULT_DIARY_SECTION_ORDER: DiaryMealSection[] = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
];

function isOrderableMealType(value: string): value is OrderableMealType {
  return ORDERABLE_DIARY_MEAL_TYPES.includes(value as OrderableMealType);
}

function favoriteItemKey(itemName: string, unit: string | null | undefined) {
  const canonicalUnit = normalizeMealUnit(unit);
  return `${itemName.trim().toLowerCase()}::${canonicalUnit || unit || ""}`;
}

function toSafeInt(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function normalizeMealSection(value: MealType): DiaryMealSection {
  if (value === "snacks") return "snack";
  if (
    value === "breakfast" ||
    value === "snack" ||
    value === "lunch" ||
    value === "pre_workout_meal" ||
    value === "post_workout_meal" ||
    value === "dinner" ||
    value === "protein_drink" ||
    value === "water"
  ) {
    return value;
  }
  return "other";
}

function toActionMealType(section: DiaryMealSection): MealType {
  if (section === "snack") return "snack";
  return section as MealType;
}

function getSectionLabel(section: DiaryMealSection) {
  if (section === "other") return "Other";
  return MEAL_TYPE_LABELS[section as keyof typeof MEAL_TYPE_LABELS] || section;
}

function SectionIcon({ section, className }: { section: DiaryMealSection; className?: string }) {
  const fallback = MEAL_TYPE_ICONS.breakfast;
  const Icon =
    section === "other"
      ? fallback
      : MEAL_TYPE_ICONS[section as keyof typeof MEAL_TYPE_ICONS] || fallback;
  return <Icon className={className} />;
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

type ManualNutritionDiaryProps = {
  subject?: NutritionSubject;
  showAssignmentTools?: boolean;
  clientIdForSummary?: string;
};

export function ManualNutritionDiary({
  subject,
  showAssignmentTools = false,
  clientIdForSummary,
}: ManualNutritionDiaryProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const units = useUnitLabels();
  const performedOn = useNutritionSelectedDate();
  const setPerformedOn = useSetNutritionSelectedDate();
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();
  const setDiaryFilters = useSetNutritionDiaryFilters();
  const setActiveSubject = useSetNutritionActiveSubject();

  const [sourceDate, setSourceDate] = useState(() => toDateInput(subDays(new Date(), 1)));
  const [copySections, setCopySections] = useState<DiaryMealSection[]>([]);

  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [itemEditorQuickMode, setItemEditorQuickMode] = useState(false);
  const [itemEditorDefaultValue, setItemEditorDefaultValue] = useState<Partial<MealItemEditorValue> | null>(null);
  const [recentDialogOpen, setRecentDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [customOrderModalOpen, setCustomOrderModalOpen] = useState(false);

  const [selectedSection, setSelectedSection] = useState<DiaryMealSection>("water");
  const [favoriteSection, setFavoriteSection] = useState<DiaryMealSection>("breakfast");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string | null } | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLookupEnabled, setFavoritesLookupEnabled] = useState(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  const [mealNotesDraft, setMealNotesDraft] = useState<Record<string, string>>({});
  const [mealTemplateId, setMealTemplateId] = useState("");
  const lastDateNavAtRef = useRef(0);
  const autoFillFiredRef = useRef<string | null>(null);

  const resolvedSubject = useMemo(() => {
    if (subject?.subject_client_id || subject?.subject_user_id) return subject;
    return undefined;
  }, [subject]);
  useNutritionAutoMealGroupSelection({
    subject: resolvedSubject,
    enabled: Boolean(subject?.subject_client_id || subject?.subject_user_id),
  });
  const groupsQuery = useNutritionMealGroupOptions();
  const groups = useMemo(() => groupsQuery.data?.rows || [], [groupsQuery.data?.rows]);

  const mealGroupSelected = isMealGroupSelected(selectedMealGroupId);
  const storedCustomSectionOrder = useNutritionDiaryMealTypeOrder();
  const setStoredCustomSectionOrder = useSetNutritionDiaryMealTypeOrder();
  const clearStoredCustomSectionOrder = useClearNutritionDiaryMealTypeOrder();
  const customSectionOrder = useMemo(
    () => storedCustomSectionOrder.filter(isOrderableMealType),
    [storedCustomSectionOrder]
  );
  const selectedFavoriteMealType = toActionMealType(favoriteSection);
  const recentItems = useNutritionRecentDiaryItems();
  const pushRecentDiaryItem = usePushNutritionRecentDiaryItem();

  const diaryQuery = useNutritionDiary(performedOn, resolvedSubject, selectedMealGroupId || null);
  const allFavoritesQuery = useFavoriteMealItems(100, null, { enabled: favoritesLookupEnabled || favoritesOpen });
  const favoritesQuery = useFavoriteMealItems(40, selectedFavoriteMealType, { enabled: favoritesOpen });
  const templatesQuery = useMealPlanTemplates();
  const summaryQuery = useClientNutritionSummary7d(clientIdForSummary || resolvedSubject?.subject_client_id || "", performedOn);

  const mutations = useNutritionMutations(performedOn, resolvedSubject, selectedMealGroupId || null);
  const logFromPlan = useLogFromPlan(performedOn, resolvedSubject);

  useEffect(() => {
    if (!selectedMealGroupId) return;
    if (groups.some((row) => row.id === selectedMealGroupId)) return;
    if (groupsQuery.data?.has_more) return;
    setSelectedMealGroupId("");
  }, [selectedMealGroupId, groups, groupsQuery.data?.has_more, setSelectedMealGroupId]);

  useEffect(() => {
    if (subject?.subject_client_id) {
      setActiveSubject("client", subject.subject_client_id);
      return;
    }
    if (subject?.subject_user_id) {
      setActiveSubject("user", subject.subject_user_id);
      return;
    }
    setActiveSubject("self", null);
  }, [setActiveSubject, subject?.subject_client_id, subject?.subject_user_id]);

  useEffect(() => {
    setDiaryFilters({
      favorites_meal_type: selectedFavoriteMealType,
    });
  }, [selectedFavoriteMealType, setDiaryFilters]);

  useEffect(() => {
    if (!favoritesOpen) return;
    setFavoritesLookupEnabled(true);
  }, [favoritesOpen]);

  useEffect(() => {
    if (!allFavoritesQuery.data) return;
    setFavoriteOverrides((previous) => (Object.keys(previous).length > 0 ? {} : previous));
  }, [allFavoritesQuery.data]);

  useEffect(() => {
    if (!diaryQuery.isSuccess || diaryQuery.isFetching) return;
    if (logFromPlan.isPending) return;
    if ((diaryQuery.data?.logs.length || 0) > 0) return;
    if (!diaryQuery.data?.active_plan) return;
    if (autoFillFiredRef.current === performedOn) return;

    autoFillFiredRef.current = performedOn;
    const mealGroupId = selectedMealGroupId || diaryQuery.data.active_plan.meal_group_id;
    if (!mealGroupId) return;

    void logFromPlan.mutateAsync({
      performed_on: performedOn,
      meal_group_id: mealGroupId,
      subject: resolvedSubject,
    }).catch(() => null);
  }, [
    diaryQuery.data,
    diaryQuery.isFetching,
    diaryQuery.isSuccess,
    logFromPlan,
    performedOn,
    resolvedSubject,
    selectedMealGroupId,
  ]);

  const favoriteMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const favorite of allFavoritesQuery.data || []) {
      map.set(favoriteItemKey(favorite.item_name, favorite.unit), true);
    }
    for (const [key, value] of Object.entries(favoriteOverrides)) {
      map.set(key, value);
    }
    return map;
  }, [allFavoritesQuery.data, favoriteOverrides]);

  const logsBySection = useMemo(() => {
    const map = new Map<DiaryMealSection, ManualDiaryLog>();
    for (const log of diaryQuery.data?.logs || []) {
      const section = normalizeMealSection(log.meal_type as MealType);
      const previous = map.get(section);
      if (!previous) {
        map.set(section, log);
        continue;
      }

      map.set(section, {
        ...previous,
        items: [...previous.items, ...log.items],
        total_calories: Number(previous.total_calories || 0) + Number(log.total_calories || 0),
        total_protein_g: Number(previous.total_protein_g || 0) + Number(log.total_protein_g || 0),
        total_carbs_g: Number(previous.total_carbs_g || 0) + Number(log.total_carbs_g || 0),
        total_fat_g: Number(previous.total_fat_g || 0) + Number(log.total_fat_g || 0),
        total_fiber_g: Number(previous.total_fiber_g || 0) + Number(log.total_fiber_g || 0),
      });
    }
    return map;
  }, [diaryQuery.data?.logs]);

  const visibleSections = useMemo<VisibleSectionCard[]>(() => {
    const sectionMeta = new Map(DIARY_SECTIONS.map((section) => [section.key, section]));

    const configuredSections: VisibleSectionCard[] = (diaryQuery.data?.meal_sections || [])
      .map((section, index) => {
        const key = normalizeMealSection(section.meal_type);
        const meta = sectionMeta.get(key) || sectionMeta.get("other");
        return {
          id: `${section.source}-${section.meal_type}-${section.position}-${index}`,
          key,
          label: meta?.label || getSectionLabel(key),
          accent: meta?.accent || "text-muted-foreground",
          position: section.position,
        };
      })
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return mealTypeOrderRank(a.key) - mealTypeOrderRank(b.key);
      });

    const configuredTypes = new Set(configuredSections.map((section) => section.key));
    const inferredSections: VisibleSectionCard[] = [];

    for (const key of logsBySection.keys()) {
      if (configuredTypes.has(key)) continue;
      const meta = sectionMeta.get(key) || sectionMeta.get("other");
      inferredSections.push({
        id: `inferred-${key}`,
        key,
        label: meta?.label || getSectionLabel(key),
        accent: meta?.accent || "text-muted-foreground",
        position: (configuredSections.at(-1)?.position ?? 0) + inferredSections.length + 1,
      });
    }

    const mergedSections = [...configuredSections, ...inferredSections].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return mealTypeOrderRank(a.key) - mealTypeOrderRank(b.key);
    });
    const mergedByType = new Map<DiaryMealSection, VisibleSectionCard>();
    for (const section of mergedSections) {
      if (mergedByType.has(section.key)) continue;
      mergedByType.set(section.key, section);
    }

    const baseSections = DEFAULT_DIARY_SECTION_ORDER.map((sectionKey, index) => {
      const existing = mergedByType.get(sectionKey);
      if (existing) {
        mergedByType.delete(sectionKey);
        return existing;
      }
      const meta = sectionMeta.get(sectionKey);
      return {
        id: `default-${sectionKey}`,
        key: sectionKey,
        label: meta?.label || getSectionLabel(sectionKey),
        accent: meta?.accent || "text-muted-foreground",
        position: index + 1,
      };
    });

    const remainingSections = Array.from(mergedByType.values()).sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return mealTypeOrderRank(a.key) - mealTypeOrderRank(b.key);
    });

    return [...baseSections, ...remainingSections];
  }, [diaryQuery.data?.meal_sections, logsBySection]);

  const customOrderRank = useMemo(() => {
    const map = new Map<OrderableMealType, number>();
    for (const [index, type] of customSectionOrder.entries()) {
      map.set(type, index + 1);
    }
    return map;
  }, [customSectionOrder]);

  const orderedVisibleSections = useMemo(() => {
    if (customSectionOrder.length === 0) return visibleSections;

    const orderedBySelection: VisibleSectionCard[] = [];
    for (const type of customSectionOrder) {
      for (const section of visibleSections) {
        if (section.key !== type) continue;
        orderedBySelection.push(section);
      }
    }

    // Keep non-orderable sections that already contain logged items, so legacy/other data stays accessible.
    const nonOrderableWithData = visibleSections.filter((section) => {
      if (isOrderableMealType(section.key)) return false;
      const items = logsBySection.get(section.key)?.items || [];
      return items.length > 0;
    });

    return [...orderedBySelection, ...nonOrderableWithData];
  }, [customSectionOrder, logsBySection, visibleSections]);

  const visibleSectionTypeOptions = useMemo(() => {
    const byType = new Map<DiaryMealSection, { key: DiaryMealSection; label: string; accent: string }>();
    for (const section of orderedVisibleSections) {
      if (byType.has(section.key)) continue;
      byType.set(section.key, {
        key: section.key,
        label: section.label,
        accent: section.accent,
      });
    }
    return Array.from(byType.values());
  }, [orderedVisibleSections]);

  const favoriteSectionOptions = useMemo(
    () => DIARY_SECTIONS.filter((section) => section.key !== "other"),
    []
  );
  const mealTypeOptionsForEditor = useMemo(() => {
    if (visibleSectionTypeOptions.length > 0) {
      return visibleSectionTypeOptions.map((section) => ({
        value: section.key,
        label: section.label,
      }));
    }
    return DIARY_SECTIONS.map((section) => ({
      value: section.key,
      label: section.label,
    }));
  }, [visibleSectionTypeOptions]);

  useEffect(() => {
    if (visibleSectionTypeOptions.length === 0) return;
    if (visibleSectionTypeOptions.some((section) => section.key === selectedSection)) return;
    setSelectedSection(visibleSectionTypeOptions[0].key);
  }, [selectedSection, visibleSectionTypeOptions]);

  useEffect(() => {
    if (favoriteSectionOptions.some((section) => section.key === favoriteSection)) return;
    setFavoriteSection("breakfast");
  }, [favoriteSection, favoriteSectionOptions]);

  const resetItemEditor = () => {
    setEditingItemId(null);
    setItemEditorDefaultValue(null);
    setItemEditorQuickMode(false);
  };

  const openAddDialog = (section: DiaryMealSection, quickMode = false) => {
    resetItemEditor();
    setSelectedSection(section);
    setItemEditorQuickMode(quickMode);
    setItemEditorDefaultValue({
      type: section,
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
      save_to_favorites: false,
    });
    setItemEditorOpen(true);
  };

  const onEditItem = (section: DiaryMealSection, item: ManualDiaryItem) => {
    resetItemEditor();
    setSelectedSection(section);
    setEditingItemId(item.id);
    setItemEditorDefaultValue({
      type: section,
      title: item.item_name || "",
      quantity: item.quantity,
      unit: normalizeMealUnit(item.unit) || item.unit || null,
      calories: toSafeInt(item.calories),
      protein_g: toSafeInt(item.protein_g),
      carbs_g: toSafeInt(item.carbs_g),
      fat_g: toSafeInt(item.fat_g),
      fiber_g: toSafeInt(item.fiber_g),
      notes: item.notes,
      planned_time: item.consumed_time || null,
      save_to_favorites: false,
    });
    setItemEditorOpen(true);
  };

  const rememberRecentItem = (item: {
    item_name: string;
    quantity: number | null;
    unit: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    notes: string | null;
  }) => {
    pushRecentDiaryItem({
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      notes: item.notes,
    });
  };

  const onSaveItem = async (value: MealItemEditorValue) => {
    const section = visibleSectionTypeOptions.some((option) => option.key === value.type)
      ? (value.type as DiaryMealSection)
      : selectedSection;
    const normalizedName = value.title.trim() || (itemEditorQuickMode ? "Quick Add" : getSectionLabel(section));
    const normalizedUnit = normalizeMealUnit(value.unit);
    const unitForSave = normalizedUnit || value.unit || null;

    try {
      if (editingItemId) {
        const updated = await withToastFeedback(
          mutations.updateItem.mutateAsync({
            item_id: editingItemId,
            item: {
              item_name: normalizedName,
              quantity: value.quantity,
              unit: unitForSave,
              calories: value.calories,
              protein_g: value.protein_g,
              carbs_g: value.carbs_g,
              fat_g: value.fat_g,
              fiber_g: value.fiber_g,
              notes: value.notes,
              consumed_time: value.planned_time,
            },
          }),
          {
            loading: "Updating meal item...",
            success: "Meal item updated",
            error: "Unable to save meal item",
          }
        ).catch(() => null);
        if (!updated) return;
      } else {
        const recentItem = {
          item_name: normalizedName,
          quantity: value.quantity,
          unit: unitForSave,
          calories: value.calories,
          protein_g: value.protein_g,
          carbs_g: value.carbs_g,
          fat_g: value.fat_g,
          fiber_g: value.fiber_g,
          notes: value.notes,
        };
        const created = await withToastFeedback(
          mutations.addItem.mutateAsync({
            performed_on: performedOn,
            meal_type: toActionMealType(section),
            subject: resolvedSubject,
            meal_group_id: selectedMealGroupId || undefined,
            sync_to_plan: Boolean(selectedMealGroupId),
            item: {
              ...recentItem,
              consumed_time: value.planned_time,
              is_quick_add: itemEditorQuickMode,
            },
          }),
          {
            loading: "Adding meal item...",
            success: "Meal item added",
            error: "Unable to save meal item",
          }
        ).catch(() => null);
        if (!created) return;
        rememberRecentItem(recentItem);
      }

      if (value.save_to_favorites) {
        const key = favoriteItemKey(normalizedName, unitForSave);
        let isAlreadyFavorite = favoriteMap.get(key) === true;
        if (!isAlreadyFavorite) {
          setFavoritesLookupEnabled(true);
          const refreshedFavorites = await allFavoritesQuery.refetch();
          if (refreshedFavorites.error) {
            throw refreshedFavorites.error;
          }

          isAlreadyFavorite = (refreshedFavorites.data || []).some(
            (favorite) => favoriteItemKey(favorite.item_name, favorite.unit) === key
          );
        }

        if (!isAlreadyFavorite) {
          const favoriteResult = await mutations.toggleFavorite.mutateAsync({
            item: {
              item_name: normalizedName,
              quantity: value.quantity,
              unit: unitForSave,
              calories: value.calories,
              protein_g: value.protein_g,
              carbs_g: value.carbs_g,
              fat_g: value.fat_g,
              fiber_g: value.fiber_g,
              notes: value.notes,
            },
            meal_type: toActionMealType(section),
          });
          setFavoriteOverrides((previous) => ({
            ...previous,
            [key]: favoriteResult.favorited,
          }));
        }
      }

      setSelectedSection(section);
      setItemEditorOpen(false);
      resetItemEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal item");
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    const result = await withToastFeedback(mutations.removeItem.mutateAsync({ item_id: deleteTarget.id }), {
      loading: "Removing meal item...",
      success: "Meal item removed",
      error: "Unable to remove item",
    }).catch(() => null);
    if (!result) return;
    setDeleteTarget(null);
  };

  const onToggleFavorite = async (section: DiaryMealSection, item: {
    item_name: string;
    quantity: number | null;
    unit: string | null;
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    notes: string | null;
  }) => {
    const normalizedUnit = normalizeMealUnit(item.unit);
    const key = favoriteItemKey(item.item_name, normalizedUnit);
    setFavoritesLookupEnabled(true);
    const result = await withToastFeedback(
      mutations.toggleFavorite.mutateAsync({
        item: {
          ...item,
          unit: normalizedUnit,
        },
        meal_type: toActionMealType(section),
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

  const onDuplicateItem = async (section: DiaryMealSection, item: ManualDiaryItem) => {
    const unit = normalizeMealUnit(item.unit) || item.unit || null;
    const recentItem = {
      item_name: item.item_name,
      quantity: item.quantity,
      unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g,
      notes: item.notes,
    };
    try {
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: toActionMealType(section),
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId || undefined,
        sync_to_plan: Boolean(selectedMealGroupId),
        item: {
          ...recentItem,
          consumed_time: item.consumed_time || null,
          is_quick_add: item.is_quick_add,
        },
      });
      rememberRecentItem(recentItem);
      toast.success("Meal item duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate item");
    }
  };

  const addPresetItemToMeal = async (
    section: DiaryMealSection,
    item: {
      item_name: string;
      quantity: number | null;
      unit: string | null;
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
      fiber_g: number | null;
      notes: string | null;
    }
  ) => {
    try {
      const recentItem = {
        ...item,
        unit: normalizeMealUnit(item.unit),
      };
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: toActionMealType(section),
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId || undefined,
        sync_to_plan: Boolean(selectedMealGroupId),
        item: {
          ...recentItem,
          is_quick_add: false,
        },
      });
      rememberRecentItem(recentItem);
      toast.success("Item added to diary");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add item");
    }
  };

  const onCopyMeals = async () => {
    const defaultSections = visibleSectionTypeOptions
      .map((section) => section.key)
      .filter((section): section is DiaryMealSection => section !== "other");

    try {
      await mutations.copyFromDate.mutateAsync({
        source_date: sourceDate,
        target_date: performedOn,
        meal_types: (copySections.length > 0 ? copySections : defaultSections).map((section) => toActionMealType(section)),
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId || undefined,
      });
      toast.success("Meals copied successfully");
      setCopyDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy meals");
    }
  };

  const onLogFromPlan = async () => {
    const mealGroupId = selectedMealGroupId || diaryQuery.data?.active_plan?.meal_group_id;
    if (!mealGroupId) return;

    try {
      const result = await logFromPlan.mutateAsync({
        performed_on: performedOn,
        meal_group_id: mealGroupId,
        subject: resolvedSubject,
      });
      if (result.skipped) {
        if (result.reason === "already_logged") {
          toast.message("Meals from this plan are already in your diary.");
          return;
        }
        toast.message("No meals planned for today.");
        return;
      }
      toast.success(`Imported ${result.inserted_count} ${result.inserted_count === 1 ? "meal item" : "meal items"} from today's plan.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import today's plan");
    }
  };

  const onAssignTemplateToClient = async () => {
    if (!showAssignmentTools || !subject?.subject_client_id) return;
    if (!mealTemplateId) {
      toast.error("Select a meal template first.");
      return;
    }

    try {
      await mutations.assignPlan.mutateAsync({
        meal_group_id: mealTemplateId,
        start_date: performedOn,
        end_date: performedOn,
        subject: { subject_client_id: subject.subject_client_id },
      });
      setMealTemplateId("");
      toast.success("Meal template assigned to client");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign meal template");
    }
  };

  const toggleCustomOrderType = (type: OrderableMealType) => {
    setStoredCustomSectionOrder((previous) => {
      const normalizedPrevious = previous.filter(isOrderableMealType);
      if (normalizedPrevious.includes(type)) {
        return normalizedPrevious.filter((entry) => entry !== type);
      }
      return [...normalizedPrevious, type];
    });
  };

  const clearCustomOrder = () => {
    clearStoredCustomSectionOrder();
  };

  const currentDate = new Date(`${performedOn}T00:00:00`);
  const canLogFromPlan = Boolean(selectedMealGroupId || diaryQuery.data?.active_plan?.meal_group_id);
  const hasDiaryEntries = (diaryQuery.data?.logs.length || 0) > 0;

  const navigateDateBy = (offsetDays: number) => {
    const now = Date.now();
    if (!canNavigateDate(lastDateNavAtRef.current, now) || diaryQuery.isFetching) return;
    lastDateNavAtRef.current = now;
    setPerformedOn(toDateInput(offsetDays < 0 ? subDays(currentDate, Math.abs(offsetDays)) : addDays(currentDate, offsetDays)));
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-4">
        {!mealGroupSelected ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Logging in general diary mode.
          </div>
        ) : null}

        <div className="glass-subtle flex items-center justify-between gap-2 px-2 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl"
            onClick={() => navigateDateBy(-1)}
            disabled={diaryQuery.isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold tracking-tight">{format(currentDate, "EEE, MMM d")}</span>
            <div className="relative mt-1">
              <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="h-9 w-[168px] rounded-xl border-border/60 bg-muted/20 pl-9"
                value={performedOn}
                onChange={(event) => setPerformedOn(event.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl"
            onClick={() => navigateDateBy(1)}
            disabled={diaryQuery.isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => setCopyDialogOpen(true)}
          >
            <Copy className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => setRecentDialogOpen(true)}
          >
            <History className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Recent</span>
          </Button>
          {canLogFromPlan && hasDiaryEntries ? (
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-8 shrink-0 text-xs text-muted-foreground"
              disabled={logFromPlan.isPending}
              onClick={() => void onLogFromPlan()}
            >
              {logFromPlan.isPending ? (
                <Loader2 className="mr-0 h-3 w-3 animate-spin sm:mr-1.5" />
              ) : (
                <ClipboardCopy className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline">
                {logFromPlan.isPending ? "Importing..." : "Add from template"}
              </span>
            </Button>
          ) : null}
        </div>

        {showAssignmentTools && subject?.subject_client_id ? (
          <div className="glass-subtle grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Assign meal template</Label>
              <Select value={mealTemplateId} onValueChange={setMealTemplateId}>
                <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                  <SelectValue placeholder="Select meal template" />
                </SelectTrigger>
                <SelectContent>
                  {(templatesQuery.data || []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="accent-strong rounded-xl"
              onClick={() => void onAssignTemplateToClient()}
              disabled={mutations.assignPlan.isPending}
            >
              {mutations.assignPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Template
            </Button>
          </div>
        ) : null}
      </section>

      {diaryQuery.isLoading && !diaryQuery.data ? (
        <section className="space-y-4">
          <Skeleton className="h-36 w-full rounded-[10px]" />
          <Skeleton className="h-36 w-full rounded-[10px]" />
          <Skeleton className="h-36 w-full rounded-[10px]" />
        </section>
      ) : null}

      {diaryQuery.data ? (
        <>
          {diaryQuery.data.active_plan ? (
            <section className="glass-surface surface-pad space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <ProgressBar
                  metric="calories"
                  label="Calories"
                  value={diaryQuery.data.totals.calories}
                  target={diaryQuery.data.active_plan.daily_calorie_target}
                  pct={diaryQuery.data.progress.calories_pct}
                />
                <ProgressBar
                  metric="protein"
                  label={`Protein (${units.macro})`}
                  value={diaryQuery.data.totals.protein_g}
                  target={diaryQuery.data.active_plan.daily_protein_target_g}
                  pct={diaryQuery.data.progress.protein_pct}
                />
                <ProgressBar
                  metric="carbs"
                  label={`Carbs (${units.macro})`}
                  value={diaryQuery.data.totals.carbs_g}
                  target={diaryQuery.data.active_plan.daily_carbs_target_g}
                  pct={diaryQuery.data.progress.carbs_pct}
                />
                <ProgressBar
                  metric="fat"
                  label={`Fat (${units.macro})`}
                  value={diaryQuery.data.totals.fat_g}
                  target={diaryQuery.data.active_plan.daily_fat_target_g}
                  pct={diaryQuery.data.progress.fat_pct}
                />
              </div>
            </section>
          ) : null}

          {canLogFromPlan && !hasDiaryEntries ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{diaryQuery.data.active_plan?.name || "Today's template"} is ready</p>
                <p className="text-xs text-muted-foreground">Import all planned meals into your diary in one tap.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 rounded-xl border-border/60"
                disabled={logFromPlan.isPending}
                onClick={() => void onLogFromPlan()}
              >
                {logFromPlan.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing...
                  </span>
                ) : (
                  "Log Today's Plan"
                )}
              </Button>
            </div>
          ) : null}

          {showAssignmentTools && subject?.subject_client_id ? (
            <section className="glass-surface surface-pad">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Last 7 days adherence</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryQuery.isLoading ? (
                  <>
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <div className="glass-subtle p-3">
                      <p className="text-xs text-muted-foreground">Days logged</p>
                      <p className="text-xl font-semibold">{summaryQuery.data?.days_logged_count ?? 0}</p>
                    </div>
                    <div className="glass-subtle p-3">
                      <p className="text-xs text-muted-foreground">Avg calories</p>
                      <p className="text-xl font-semibold">{summaryQuery.data?.average_calories ?? 0}</p>
                    </div>
                    <div className="glass-subtle p-3">
                      <p className="text-xs text-muted-foreground">On target</p>
                      <p className="text-xl font-semibold text-chart-2">{summaryQuery.data?.on_target_count ?? 0}</p>
                    </div>
                    <div className="glass-subtle p-3">
                      <p className="text-xs text-muted-foreground">Off target</p>
                      <p className="text-xl font-semibold text-chart-4">{summaryQuery.data?.off_target_count ?? 0}</p>
                    </div>
                  </>
                )}
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
                  disabled={customSectionOrder.length === 0}
                >
                  Clear Order
                </Button>
              </div>
            </div>

            {orderedVisibleSections.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No meal types added for this date yet.
              </div>
            ) : null}

            {orderedVisibleSections.map((section) => {
              const log = logsBySection.get(section.key);
              const items = log?.items || [];

              return (
                <article key={section.id} className="glass-surface overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 md:px-5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <SectionIcon section={section.key} className={cn("h-4 w-4", section.accent)} />
                        <h3 className="truncate text-xl font-semibold tracking-tight">{section.label}</h3>
                        <span className="text-sm text-muted-foreground">{Math.round(Number(log?.total_calories || 0))} kcal</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        P {Math.round(Number(log?.total_protein_g || 0))}g • C {Math.round(Number(log?.total_carbs_g || 0))}g • F {Math.round(Number(log?.total_fat_g || 0))}g
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden rounded-xl border-border/60 md:inline-flex"
                        onClick={() => openAddDialog(section.key, true)}
                      >
                        Quick Add
                      </Button>
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-full accent-strong"
                        onClick={() => openAddDialog(section.key)}
                        aria-label={`Add item to ${section.label}`}
                      >
                        <CirclePlus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <button
                      type="button"
                      className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => openAddDialog(section.key)}
                    >
                      Tap + to add your first item
                    </button>
                  ) : (
                    <div className="divide-y divide-border/30 px-4 md:px-5">
                      {items
                        .slice()
                        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
                        .map((item) => {
                          const favoriteKey = favoriteItemKey(item.item_name, item.unit);
                          const isFavorite = favoriteMap.get(favoriteKey) === true;

                          return (
                            <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-medium leading-tight">{item.item_name}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.consumed_time || "No time"}
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
                                    void onToggleFavorite(section.key, {
                                      item_name: item.item_name,
                                      quantity: item.quantity,
                                      unit: item.unit,
                                      calories: item.calories,
                                      protein_g: item.protein_g,
                                      carbs_g: item.carbs_g,
                                      fat_g: item.fat_g,
                                      fiber_g: item.fiber_g,
                                      notes: item.notes,
                                    })
                                  }
                                >
                                  <Star className={cn("h-4 w-4", isFavorite ? "fill-chart-4 text-chart-4" : "text-muted-foreground")} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEditItem(section.key, item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  onClick={() => void onDuplicateItem(section.key, item)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-destructive"
                                  onClick={() => setDeleteTarget({ id: item.id, name: item.item_name })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div className="border-t border-border/30 px-4 py-3 md:px-5">
                    <Label htmlFor={`notes-${section.key}`} className="text-xs text-muted-foreground">
                      Section notes
                    </Label>
                    <div className="mt-2 space-y-2">
                      <Textarea
                        id={`notes-${section.key}`}
                        className="min-h-20 rounded-xl border-border/60 bg-muted/20"
                        value={log ? mealNotesDraft[log.id] ?? log.notes ?? "" : ""}
                        placeholder="Optional strategy and context for this meal section"
                        onChange={(event) => {
                          if (!log) return;
                          const value = event.target.value;
                          setMealNotesDraft((previous) => ({
                            ...previous,
                            [log.id]: value,
                          }));
                        }}
                      />
                      {log ? (
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-border/60"
                            disabled={mutations.saveNotes.isPending}
                            onClick={() =>
                              void withToastFeedback(
                                mutations.saveNotes.mutateAsync({
                                  meal_log_id: log.id,
                                  notes: (mealNotesDraft[log.id] ?? log.notes) || null,
                                }),
                                {
                                  loading: "Saving section notes...",
                                  success: "Section notes saved",
                                  error: "Unable to save notes",
                                }
                              )
                                .then(() => {
                                  setMealNotesDraft((previous) => {
                                    const next = { ...previous };
                                    delete next[log.id];
                                    return next;
                                  });
                                })
                                .catch(() => null)
                            }
                          >
                            {mutations.saveNotes.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Notes
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                <Select value={favoriteSection} onValueChange={(value) => setFavoriteSection(value as DiaryMealSection)}>
                  <SelectTrigger className="h-9 w-[170px] rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {favoriteSectionOptions.map((section) => (
                      <SelectItem key={section.key} value={section.key}>
                        {getSectionLabel(section.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            {!favoritesOpen ? <p className="mt-2 text-xs text-muted-foreground">Open favorites to load reusable meals.</p> : null}
            {favoritesOpen ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {favoritesQuery.isLoading ? (
                  <span className="text-sm text-muted-foreground">Loading favorites...</span>
                ) : null}
                {(favoritesQuery.data || []).slice(0, 10).map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant="outline"
                    className="rounded-full border-border/60 bg-muted/20"
                    onClick={() =>
                      void addPresetItemToMeal(favoriteSection, {
                        item_name: item.item_name,
                        quantity: item.quantity,
                        unit: item.unit,
                        calories: item.calories,
                        protein_g: item.protein_g,
                        carbs_g: item.carbs_g,
                        fat_g: item.fat_g,
                        fiber_g: item.fiber_g,
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
        </>
      ) : null}

      <MealItemEditorSheet
        open={itemEditorOpen}
        onOpenChange={(open) => {
          setItemEditorOpen(open);
          if (!open) resetItemEditor();
        }}
        mode={editingItemId ? "edit" : "create"}
        defaultValue={itemEditorDefaultValue}
        quickMode={itemEditorQuickMode}
        showPlannedTime
        showFiber
        showSaveToFavorites
        pending={mutations.addItem.isPending || mutations.updateItem.isPending}
        mealTypeOptions={mealTypeOptionsForEditor}
        onSave={onSaveItem}
      />

      <DeleteConfirmSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        itemName={deleteTarget?.name}
        pending={mutations.removeItem.isPending}
        onConfirm={confirmDeleteItem}
      />

      <Sheet open={recentDialogOpen} onOpenChange={setRecentDialogOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
            isDesktop ? "w-full sm:max-w-md" : "max-h-[88vh] rounded-t-2xl"
          )}
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Recent Items</SheetTitle>
            <SheetDescription>Your latest 10 meal items.</SheetDescription>
          </SheetHeader>

          <div className="px-5 py-4">
            <div className="max-h-[420px] overflow-auto rounded-xl border border-border/60 bg-background/40">
              {recentItems.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No recent items yet.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentItems.map((item, index) => (
                    <div key={`${item.item_name}-${index}`} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(Number(item.calories || 0))} kcal • P {Math.round(Number(item.protein_g || 0))}g • C {Math.round(Number(item.carbs_g || 0))}g • F {Math.round(Number(item.fat_g || 0))}g
                        </p>
                      </div>
                      <Button size="sm" className="accent-strong rounded-lg" onClick={() => void addPresetItemToMeal(selectedSection, item)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
            {ORDERABLE_DIARY_MEAL_TYPES.map((type) => {
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
                    <SectionIcon section={type} className="h-4 w-4 text-chart-2" />
                    <span className="text-sm font-medium">{getSectionLabel(type)}</span>
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

      <Sheet open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className={cn(
            "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
            isDesktop ? "w-full sm:max-w-md" : "max-h-[88vh] rounded-t-2xl"
          )}
        >
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Copy Meals</SheetTitle>
            <SheetDescription>Copy selected sections from a previous date.</SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-5 py-4">
            <div className="grid gap-2">
              <Label>Source Date</Label>
              <Input
                type="date"
                value={sourceDate}
                onChange={(event) => setSourceDate(event.target.value)}
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <Label>Sections (leave empty to copy all)</Label>
              <div className="flex flex-wrap gap-2">
                {visibleSectionTypeOptions
                  .filter((section) => section.key !== "other")
                  .map((section) => {
                    const active = copySections.includes(section.key);
                    return (
                      <Button
                        key={section.key}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className={cn("rounded-full capitalize", active ? "accent-strong" : "border-border/60")}
                        onClick={() => {
                          setCopySections((previous) =>
                            previous.includes(section.key)
                              ? previous.filter((value) => value !== section.key)
                              : [...previous, section.key]
                          );
                        }}
                      >
                        {section.label}
                      </Button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 px-5 py-4">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => setCopyDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="accent-strong flex-1 rounded-xl" onClick={() => void onCopyMeals()} disabled={mutations.copyFromDate.isPending}>
                {mutations.copyFromDate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Copy Meals
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
