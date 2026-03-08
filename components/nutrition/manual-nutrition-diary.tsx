"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Copy,
  Flame,
  Loader2,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { ManualDiaryItem, ManualDiaryLog, MealType } from "@/app/actions/nutrition-manual";
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { NutritionScopeControls } from "@/components/nutrition/nutrition-scope-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientNutritionSummary7d,
  useFavoriteMealItems,
  useMealPlanTemplates,
  useNutritionDiary,
  useNutritionMutations,
} from "@/hooks/use-nutrition-manual";
import { resolveNutritionSubject, useNutritionAutoMealGroupSelection } from "@/hooks/use-nutrition-data";
import {
  useNutritionActiveSubject,
  useSetNutritionActiveSubject,
  useNutritionSelectedDate,
  useNutritionSelectedMealGroupId,
  useSetNutritionDiaryFilters,
  useSetNutritionNavigationSource,
  useNutritionRecentDiaryItems,
  usePushNutritionRecentDiaryItem,
  useSetNutritionSelectedDate,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { getMealUnitOptions, normalizeMealUnit } from "@/lib/nutrition/meal-units";
import type { NutritionSubject } from "@/lib/query-keys-nutrition";
import { applyMacroQuickAction, canNavigateDate, isMealGroupSelected, mealTypeOrderRank, type MacroQuickAction } from "@/lib/nutrition/meal-ui";
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

const NO_UNIT_SELECT_VALUE = "__no_unit__";

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
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

function MetricControl({
  label,
  value,
  onChange,
  max,
  step,
  unit,
  accent,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  max: number;
  step: number;
  unit?: string;
  accent?: string;
}) {
  const roundedValue = Math.max(0, Math.min(max, toSafeInt(value)));

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground", accent)}>{label}</span>
        <div className="flex items-center gap-1">
          <Input
            className="h-8 w-24 border-border/60 bg-muted/40 text-right"
            type="number"
            min={0}
            max={max}
            step={step}
            value={roundedValue}
            onChange={(event) => onChange(toSafeInt(event.target.value))}
          />
          {unit ? <span className="text-xs text-muted-foreground">{unit}</span> : null}
        </div>
      </div>
      <Slider
        value={[roundedValue]}
        min={0}
        max={max}
        step={step}
        onValueChange={(values) => onChange(toSafeInt(values[0]))}
      />
    </div>
  );
}

function DailyMacroCard({
  title,
  value,
  unit,
  accent,
}: {
  title: string;
  value: number;
  unit?: string;
  accent: string;
}) {
  return (
    <div className="glass-subtle p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <p className={cn("mt-2 text-3xl font-semibold leading-none", accent)}>
        {Math.round(value)}
        {unit ? <span className="ml-1 text-lg text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  target,
  pct,
}: {
  label: string;
  value: number;
  target: number | null;
  pct: number | null;
}) {
  const percent = Math.max(0, Math.min(160, Math.round(pct ?? 0)));
  const warning = pct !== null && pct > 110;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {target ? ` / ${Math.round(target)}` : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70">
        <div
          className={cn("h-full rounded-full transition-all", warning ? "bg-chart-4" : "bg-chart-2")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

type ManualNutritionDiaryProps = {
  subject?: NutritionSubject;
  timezone?: string;
  showAssignmentTools?: boolean;
  clientIdForSummary?: string;
  title?: string;
};

export function ManualNutritionDiary({
  subject,
  timezone,
  showAssignmentTools = false,
  clientIdForSummary,
}: ManualNutritionDiaryProps) {
  const performedOn = useNutritionSelectedDate();
  const setPerformedOn = useSetNutritionSelectedDate();
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();
  const setDiaryFilters = useSetNutritionDiaryFilters();
  const setActiveSubject = useSetNutritionActiveSubject();

  const [sourceDate, setSourceDate] = useState(() => toDateInput(subDays(new Date(), 1)));
  const [copySections, setCopySections] = useState<DiaryMealSection[]>([]);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [recentDialogOpen, setRecentDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [addMealTypeDialogOpen, setAddMealTypeDialogOpen] = useState(false);
  const [newMealType, setNewMealType] = useState<DiaryMealSection>("water");

  const [selectedSection, setSelectedSection] = useState<DiaryMealSection>("water");
  const [favoriteSection, setFavoriteSection] = useState<DiaryMealSection>("breakfast");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOriginalUnit, setEditingOriginalUnit] = useState<string | null>(null);
  const [itemTime, setItemTime] = useState("");

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [itemNotes, setItemNotes] = useState("");
  const [saveToFavorites, setSaveToFavorites] = useState(false);

  const [quickCalories, setQuickCalories] = useState(0);
  const [quickProtein, setQuickProtein] = useState(0);
  const [quickCarbs, setQuickCarbs] = useState(0);
  const [quickFat, setQuickFat] = useState(0);
  const [quickFiber, setQuickFiber] = useState(0);

  const [mealNotesDraft, setMealNotesDraft] = useState<Record<string, string>>({});
  const [planTemplateId, setPlanTemplateId] = useState("");
  const lastDateNavAtRef = useRef(0);

  const resolvedSubject = useMemo(() => {
    if (subject?.subject_client_id || subject?.subject_user_id) return subject;
    return resolveNutritionSubject(activeSubjectType, activeSubjectId);
  }, [activeSubjectId, activeSubjectType, subject]);
  useNutritionAutoMealGroupSelection({
    subject: resolvedSubject,
    enabled: Boolean(subject?.subject_client_id || subject?.subject_user_id),
  });

  const mealGroupSelected = isMealGroupSelected(selectedMealGroupId);
  const selectedFavoriteMealType = toActionMealType(favoriteSection);
  const recentItems = useNutritionRecentDiaryItems();
  const pushRecentDiaryItem = usePushNutritionRecentDiaryItem();

  const diaryQuery = useNutritionDiary(performedOn, resolvedSubject, timezone, selectedMealGroupId || null);
  const allFavoritesQuery = useFavoriteMealItems(200, null);
  const favoritesQuery = useFavoriteMealItems(40, selectedFavoriteMealType);
  const templatesQuery = useMealPlanTemplates();
  const summaryQuery = useClientNutritionSummary7d(clientIdForSummary || resolvedSubject?.subject_client_id || "", performedOn);

  const mutations = useNutritionMutations(performedOn, resolvedSubject, selectedMealGroupId || null);

  useEffect(() => {
    setViewMode("diary");
    setNavigationSource("diary");
  }, [setNavigationSource, setViewMode]);

  useEffect(() => {
    if (!subject?.subject_client_id && !subject?.subject_user_id) return;
    if (subject?.subject_client_id) {
      setActiveSubject("client", subject.subject_client_id);
      return;
    }
    if (subject?.subject_user_id) {
      setActiveSubject("user", subject.subject_user_id);
      return;
    }
  }, [setActiveSubject, subject?.subject_client_id, subject?.subject_user_id]);

  useEffect(() => {
    setDiaryFilters({
      favorites_meal_type: selectedFavoriteMealType,
    });
  }, [selectedFavoriteMealType, setDiaryFilters]);

  const favoriteMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const favorite of allFavoritesQuery.data || []) {
      map.set(`${favorite.item_name.toLowerCase()}::${favorite.unit || ""}`, true);
    }
    return map;
  }, [allFavoritesQuery.data]);

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

    return [...configuredSections, ...inferredSections].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return mealTypeOrderRank(a.key) - mealTypeOrderRank(b.key);
    });
  }, [diaryQuery.data?.meal_sections, logsBySection]);

  const visibleSectionTypeOptions = useMemo(() => {
    const byType = new Map<DiaryMealSection, { key: DiaryMealSection; label: string; accent: string }>();
    for (const section of visibleSections) {
      if (byType.has(section.key)) continue;
      byType.set(section.key, {
        key: section.key,
        label: section.label,
        accent: section.accent,
      });
    }
    return Array.from(byType.values());
  }, [visibleSections]);

  const unitOptions = useMemo(() => getMealUnitOptions(unit), [unit]);
  const favoriteSectionOptions = useMemo(
    () => DIARY_SECTIONS.filter((section) => section.key !== "other"),
    []
  );

  useEffect(() => {
    if (visibleSectionTypeOptions.length === 0) return;
    if (visibleSectionTypeOptions.some((section) => section.key === selectedSection)) return;
    setSelectedSection(visibleSectionTypeOptions[0].key);
  }, [selectedSection, visibleSectionTypeOptions]);

  useEffect(() => {
    if (favoriteSectionOptions.some((section) => section.key === favoriteSection)) return;
    setFavoriteSection("breakfast");
  }, [favoriteSection, favoriteSectionOptions]);

  const resetItemForm = () => {
    setEditingItemId(null);
    setEditingOriginalUnit(null);
    setItemTime("");
    setItemName("");
    setQuantity("");
    setUnit("");
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setFiber(0);
    setItemNotes("");
    setSaveToFavorites(false);
  };

  const openAddDialog = (section: DiaryMealSection) => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }
    resetItemForm();
    setSelectedSection(section);
    setItemDialogOpen(true);
  };

  const openQuickDialog = (section: DiaryMealSection) => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }
    setSelectedSection(section);
    setQuickCalories(0);
    setQuickProtein(0);
    setQuickCarbs(0);
    setQuickFat(0);
    setQuickFiber(0);
    setQuickDialogOpen(true);
  };

  const onEditItem = (section: DiaryMealSection, item: ManualDiaryItem) => {
    setSelectedSection(section);
    setEditingItemId(item.id);
    setEditingOriginalUnit(item.unit || null);
    setItemTime(item.consumed_time || "");
    setItemName(item.item_name || "");
    setQuantity(item.quantity?.toString() || "");
    setUnit(normalizeMealUnit(item.unit) || item.unit || "");
    setCalories(toSafeInt(item.calories));
    setProtein(toSafeInt(item.protein_g));
    setCarbs(toSafeInt(item.carbs_g));
    setFat(toSafeInt(item.fat_g));
    setFiber(toSafeInt(item.fiber_g));
    setItemNotes(item.notes || "");
    setSaveToFavorites(false);
    setItemDialogOpen(true);
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

  const onSaveItem = async () => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    if (!itemName.trim()) {
      toast.error("Item name is required.");
      return;
    }
    const normalizedName = itemName.trim();
    const selectedUnit = unit.trim();
    const canonicalUnit = normalizeMealUnit(selectedUnit);
    const isPreservingLegacyUnit =
      Boolean(editingItemId) &&
      Boolean(selectedUnit) &&
      !canonicalUnit &&
      selectedUnit === (editingOriginalUnit || "").trim();

    if (selectedUnit && !canonicalUnit && !isPreservingLegacyUnit) {
      toast.error("Select a valid unit.");
      return;
    }

    const unitForCreate = canonicalUnit || null;
    const unitForUpdate = isPreservingLegacyUnit ? undefined : canonicalUnit || null;

    try {
      if (editingItemId) {
        await mutations.updateItem.mutateAsync({
          item_id: editingItemId,
          item: {
            item_name: normalizedName,
            quantity: quantity ? Number(quantity) : null,
            unit: unitForUpdate,
            calories,
            protein_g: protein,
            carbs_g: carbs,
            fat_g: fat,
            fiber_g: fiber,
            notes: itemNotes.trim() || null,
            consumed_time: itemTime.trim() || null,
          },
        });
      } else {
        const recentItem = {
          item_name: normalizedName,
          quantity: quantity ? Number(quantity) : null,
          unit: unitForCreate,
          calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
          fiber_g: fiber,
          notes: itemNotes.trim() || null,
        };
        await mutations.addItem.mutateAsync({
          performed_on: performedOn,
          meal_type: toActionMealType(selectedSection),
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          subject: resolvedSubject,
          meal_group_id: selectedMealGroupId,
          item: {
            ...recentItem,
            is_quick_add: false,
            consumed_time: itemTime.trim() || null,
          },
        });
        rememberRecentItem(recentItem);
      }

      if (saveToFavorites) {
        const key = `${normalizedName.toLowerCase()}::${unitForCreate || ""}`;
        if (!favoriteMap.has(key)) {
          await mutations.toggleFavorite.mutateAsync({
            item: {
              item_name: normalizedName,
              quantity: quantity ? Number(quantity) : null,
              unit: unitForCreate,
              calories,
              protein_g: protein,
                  carbs_g: carbs,
                  fat_g: fat,
                  fiber_g: fiber,
                  notes: itemNotes.trim() || null,
                },
                meal_type: toActionMealType(selectedSection),
              });
            }
          }

      toast.success(editingItemId ? "Meal item updated" : "Meal item added");
      setItemDialogOpen(false);
      resetItemForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal item");
    }
  };

  const onSaveQuickItem = async () => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    if (quickCalories + quickProtein + quickCarbs + quickFat + quickFiber <= 0) {
      toast.error("Add at least one value before saving.");
      return;
    }

    try {
      const recentItem = {
        item_name: "Quick Add",
        quantity: null,
        unit: null,
        calories: quickCalories || null,
        protein_g: quickProtein || null,
        carbs_g: quickCarbs || null,
        fat_g: quickFat || null,
        fiber_g: quickFiber || null,
        notes: null,
      };
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: toActionMealType(selectedSection),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId,
        item: {
          ...recentItem,
          is_quick_add: true,
        },
      });
      rememberRecentItem(recentItem);
      toast.success("Quick add saved");
      setQuickDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save quick add");
    }
  };

  const onDeleteItem = async (itemId: string) => {
    try {
      await mutations.removeItem.mutateAsync({ item_id: itemId });
      toast.success("Meal item removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove item");
    }
  };

  const onToggleFavorite = async (item: {
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
    try {
      const result = await mutations.toggleFavorite.mutateAsync({
        item: {
          ...item,
          unit: normalizeMealUnit(item.unit),
        },
        meal_type: toActionMealType(selectedSection),
      });
      toast.success(result.favorited ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update favorites");
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
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    try {
      const recentItem = {
        ...item,
        unit: normalizeMealUnit(item.unit),
      };
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: toActionMealType(section),
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId,
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
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    const defaultSections = visibleSectionTypeOptions
      .map((section) => section.key)
      .filter((section): section is DiaryMealSection => section !== "other");

    try {
      await mutations.copyFromDate.mutateAsync({
        source_date: sourceDate,
        target_date: performedOn,
        meal_types: (copySections.length > 0 ? copySections : defaultSections).map((section) => toActionMealType(section)),
        subject: resolvedSubject,
        meal_group_id: selectedMealGroupId,
      });
      toast.success("Meals copied successfully");
      setCopyDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy meals");
    }
  };

  const onAssignTemplateToClient = async () => {
    if (!showAssignmentTools || !subject?.subject_client_id) return;
    if (!planTemplateId) {
      toast.error("Select a plan template first.");
      return;
    }

    try {
      await mutations.assignPlan.mutateAsync({
        plan_id: planTemplateId,
        subject: { subject_client_id: subject.subject_client_id },
      });
      setPlanTemplateId("");
      toast.success("Meal plan assigned to client");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign plan");
    }
  };

  const onAddMealType = async () => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    const targetType = newMealType;
    if (targetType === "other") {
      toast.error("Please select a meal type.");
      return;
    }

    try {
      await mutations.addSection.mutateAsync({
        meal_group_id: selectedMealGroupId,
        performed_on: performedOn,
        meal_type: toActionMealType(targetType),
        subject: resolvedSubject,
      });
      setSelectedSection(targetType);
      setAddMealTypeDialogOpen(false);
      toast.success("Meal type added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add meal type");
    }
  };

  const applyQuickActionToItemForm = (action: MacroQuickAction) => {
    const next = applyMacroQuickAction(
      {
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      },
      action
    );
    setCalories(next.calories);
    setProtein(next.protein_g);
    setCarbs(next.carbs_g);
    setFat(next.fat_g);
  };

  const applyQuickActionToQuickAdd = (action: MacroQuickAction) => {
    const next = applyMacroQuickAction(
      {
        calories: quickCalories,
        protein_g: quickProtein,
        carbs_g: quickCarbs,
        fat_g: quickFat,
      },
      action
    );
    setQuickCalories(next.calories);
    setQuickProtein(next.protein_g);
    setQuickCarbs(next.carbs_g);
    setQuickFat(next.fat_g);
  };

  const currentDate = new Date(`${performedOn}T00:00:00`);

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
            Select a meal group to enable diary actions, meal type cards, and item modals.
          </div>
        ) : null}

        <div className="glass-subtle flex items-center justify-between gap-2 px-2 py-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl"
            onClick={() => navigateDateBy(-1)}
            disabled={!mealGroupSelected || diaryQuery.isFetching}
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
                disabled={!mealGroupSelected}
              />
            </div>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl"
            onClick={() => navigateDateBy(1)}
            disabled={!mealGroupSelected || diaryQuery.isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => setOptionsDialogOpen(true)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Options
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => setCopyDialogOpen(true)}
            disabled={!mealGroupSelected}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => {
              setSourceDate(toDateInput(subDays(currentDate, 1)));
              setCopySections([]);
              setCopyDialogOpen(true);
            }}
            disabled={!mealGroupSelected}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Yesterday
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/60"
            onClick={() => setRecentDialogOpen(true)}
            disabled={!mealGroupSelected}
          >
            Recent
          </Button>
        </div>

        {showAssignmentTools && subject?.subject_client_id ? (
          <div className="glass-subtle grid gap-3 p-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Assign meal plan template</Label>
              <Select value={planTemplateId} onValueChange={setPlanTemplateId}>
                <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                  <SelectValue placeholder="Select template plan" />
                </SelectTrigger>
                <SelectContent>
                  {(templatesQuery.data || []).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="accent-strong rounded-xl"
              onClick={() => void onAssignTemplateToClient()}
              disabled={mutations.assignPlan.isPending || !mealGroupSelected}
            >
              {mutations.assignPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Plan
            </Button>
          </div>
        ) : null}
      </section>

      {diaryQuery.isLoading && !diaryQuery.data ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-36 w-full rounded-3xl" />
        </section>
      ) : null}

      {diaryQuery.data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DailyMacroCard title="Calories" value={diaryQuery.data.totals.calories} accent="text-chart-2" />
            <DailyMacroCard title="Protein" value={diaryQuery.data.totals.protein_g} unit="g" accent="text-chart-3" />
            <DailyMacroCard title="Carbs" value={diaryQuery.data.totals.carbs_g} unit="g" accent="text-chart-4" />
            <DailyMacroCard title="Fat" value={diaryQuery.data.totals.fat_g} unit="g" accent="text-chart-1" />
          </section>

          {diaryQuery.data.active_plan ? (
            <section className="glass-surface surface-pad space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Active plan progress</h2>
                  <p className="text-base font-medium">{diaryQuery.data.active_plan.name}</p>
                </div>
                <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/40">
                  {diaryQuery.data.active_plan.start_date} → {diaryQuery.data.active_plan.end_date}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ProgressBar
                  label="Calories"
                  value={diaryQuery.data.totals.calories}
                  target={diaryQuery.data.active_plan.daily_calorie_target}
                  pct={diaryQuery.data.progress.calories_pct}
                />
                <ProgressBar
                  label="Protein (g)"
                  value={diaryQuery.data.totals.protein_g}
                  target={diaryQuery.data.active_plan.daily_protein_target_g}
                  pct={diaryQuery.data.progress.protein_pct}
                />
                <ProgressBar
                  label="Carbs (g)"
                  value={diaryQuery.data.totals.carbs_g}
                  target={diaryQuery.data.active_plan.daily_carbs_target_g}
                  pct={diaryQuery.data.progress.carbs_pct}
                />
                <ProgressBar
                  label="Fat (g)"
                  value={diaryQuery.data.totals.fat_g}
                  target={diaryQuery.data.active_plan.daily_fat_target_g}
                  pct={diaryQuery.data.progress.fat_pct}
                />
              </div>
            </section>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-border/60"
                onClick={() => {
                  setNewMealType("water");
                  setAddMealTypeDialogOpen(true);
                }}
                disabled={!mealGroupSelected}
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Add Meal Type
              </Button>
            </div>

            {visibleSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                No meal types added for this date yet.
              </div>
            ) : null}

            {visibleSections.map((section) => {
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
                        onClick={() => openQuickDialog(section.key)}
                        disabled={!mealGroupSelected}
                      >
                        Quick Add
                      </Button>
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-full accent-strong"
                        onClick={() => openAddDialog(section.key)}
                        aria-label={`Add item to ${section.label}`}
                        disabled={!mealGroupSelected}
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
                      disabled={!mealGroupSelected}
                    >
                      Tap + to add
                    </button>
                  ) : (
                    <div className="divide-y divide-border/30 px-4 md:px-5">
                      {items
                        .slice()
                        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
                        .map((item) => {
                          const favoriteKey = `${item.item_name.toLowerCase()}::${item.unit || ""}`;
                          const isFavorite = favoriteMap.has(favoriteKey);

                          return (
                            <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-medium leading-tight">{item.item_name}</p>
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
                                    void onToggleFavorite({
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
                                  className="h-8 w-8 rounded-lg text-destructive"
                                  onClick={() => void onDeleteItem(item.id)}
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
                              void mutations.saveNotes
                                .mutateAsync({ meal_log_id: log.id, notes: (mealNotesDraft[log.id] ?? log.notes) || null })
                                .then(() => {
                                  toast.success("Section notes saved");
                                  setMealNotesDraft((previous) => {
                                    const next = { ...previous };
                                    delete next[log.id];
                                    return next;
                                  });
                                })
                                .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to save notes"))
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
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-chart-4" />
                <p className="text-sm font-semibold">Favorites</p>
              </div>
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
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
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
              {(favoritesQuery.data || []).length === 0 ? (
                <span className="text-sm text-muted-foreground">No favorites yet</span>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit Meal Item" : "Add Meal Item"}</DialogTitle>
            <DialogDescription>
              {editingItemId ? "Update values and notes for this entry." : "Manual entry only. Adjust metrics using slider + input."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Meal Section</Label>
                <Select value={selectedSection} onValueChange={(value) => setSelectedSection(value as DiaryMealSection)} disabled={Boolean(editingItemId)}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleSectionTypeOptions.map((section) => (
                      <SelectItem key={section.key} value={section.key}>
                        {getSectionLabel(section.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={itemTime}
                  onChange={(event) => setItemTime(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="e.g. Greek Yogurt Bowl"
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={unit || NO_UNIT_SELECT_VALUE}
                  onValueChange={(value) => setUnit(value === NO_UNIT_SELECT_VALUE ? "" : value)}
                >
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_UNIT_SELECT_VALUE}>No unit</SelectItem>
                    {unitOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <MetricControl label="Calories" value={calories} onChange={setCalories} max={2000} step={5} accent="text-chart-1" />
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricControl label="Protein" value={protein} onChange={setProtein} max={300} step={1} unit="g" accent="text-chart-2" />
              <MetricControl label="Carbs" value={carbs} onChange={setCarbs} max={300} step={1} unit="g" accent="text-chart-3" />
              <MetricControl label="Fat" value={fat} onChange={setFat} max={300} step={1} unit="g" accent="text-chart-4" />
              <MetricControl label="Fiber" value={fiber} onChange={setFiber} max={120} step={1} unit="g" accent="text-chart-5" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToItemForm("plus_50_kcal")}>
                +50 kcal
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToItemForm("plus_100_kcal")}>
                +100 kcal
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToItemForm("plus_10_protein")}>
                +10g protein
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToItemForm("plus_10_carbs")}>
                +10g carbs
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToItemForm("plus_5_fat")}>
                +5g fat
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={itemNotes}
                onChange={(event) => setItemNotes(event.target.value)}
                placeholder="Optional context, prep notes, or compliance cues"
                className="min-h-20 rounded-xl border-border/60 bg-muted/20"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
              <Checkbox id="save-favorite" checked={saveToFavorites} onCheckedChange={(checked) => setSaveToFavorites(Boolean(checked))} />
              <Label htmlFor="save-favorite" className="text-sm">
                Save to favorites for quick reuse
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="accent-strong rounded-xl"
              onClick={() => void onSaveItem()}
              disabled={mutations.addItem.isPending || mutations.updateItem.isPending || !mealGroupSelected}
            >
              {mutations.addItem.isPending || mutations.updateItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickDialogOpen} onOpenChange={setQuickDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Quick Add Macros</DialogTitle>
            <DialogDescription>Fast manual logging without naming an item.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label>Meal Section</Label>
              <Select value={selectedSection} onValueChange={(value) => setSelectedSection(value as DiaryMealSection)}>
                <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleSectionTypeOptions.map((section) => (
                    <SelectItem key={section.key} value={section.key}>
                      {getSectionLabel(section.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MetricControl label="Calories" value={quickCalories} onChange={setQuickCalories} max={2000} step={5} accent="text-chart-1" />
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricControl label="Protein" value={quickProtein} onChange={setQuickProtein} max={300} step={1} unit="g" accent="text-chart-2" />
              <MetricControl label="Carbs" value={quickCarbs} onChange={setQuickCarbs} max={300} step={1} unit="g" accent="text-chart-3" />
              <MetricControl label="Fat" value={quickFat} onChange={setQuickFat} max={300} step={1} unit="g" accent="text-chart-4" />
              <MetricControl label="Fiber" value={quickFiber} onChange={setQuickFiber} max={120} step={1} unit="g" accent="text-chart-5" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToQuickAdd("plus_50_kcal")}>
                +50 kcal
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToQuickAdd("plus_100_kcal")}>
                +100 kcal
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToQuickAdd("plus_10_protein")}>
                +10g protein
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToQuickAdd("plus_10_carbs")}>
                +10g carbs
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyQuickActionToQuickAdd("plus_5_fat")}>
                +5g fat
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setQuickDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => void onSaveQuickItem()} disabled={mutations.addItem.isPending || !mealGroupSelected}>
              {mutations.addItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Quick Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Diary Options</DialogTitle>
            <DialogDescription>Manage user and meal group context for this diary day.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {!subject?.subject_client_id && !subject?.subject_user_id ? (
              <NutritionScopeControls showHelperText fullWidthOnMobile />
            ) : (
              <p className="text-sm text-muted-foreground">Context is fixed for this view.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recentDialogOpen} onOpenChange={setRecentDialogOpen}>
        <DialogContent className="rounded-2xl border-border/70 bg-card/95">
          <DialogHeader>
            <DialogTitle>Recent Items</DialogTitle>
            <DialogDescription>Your latest 10 meal items.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-[360px] overflow-auto rounded-xl border border-border/60 bg-background/40">
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
        </DialogContent>
      </Dialog>

      <Dialog open={addMealTypeDialogOpen} onOpenChange={setAddMealTypeDialogOpen}>
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meal Type</DialogTitle>
            <DialogDescription>Add a meal type card to the end of the day sequence.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="shrink-0">Meal Type</Label>
              <Select value={newMealType} onValueChange={(value) => setNewMealType(value as DiaryMealSection)}>
                <SelectTrigger className="w-[200px] rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIARY_SECTIONS.filter((section) => section.key !== "other").map((section) => (
                    <SelectItem key={section.key} value={section.key}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setAddMealTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => void onAddMealType()} disabled={mutations.addSection.isPending || !mealGroupSelected}>
              {mutations.addSection.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="rounded-2xl border-border/70 bg-card/95">
          <DialogHeader>
            <DialogTitle>Copy Meals</DialogTitle>
            <DialogDescription>Copy selected sections from a previous date.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
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

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => void onCopyMeals()} disabled={mutations.copyFromDate.isPending}>
              {mutations.copyFromDate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Copy Meals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
