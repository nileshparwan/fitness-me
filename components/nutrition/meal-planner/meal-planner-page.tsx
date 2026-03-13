"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePlus, Copy, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { MealDayOfWeek, MealGroupDetail, MealItemType } from "@/app/actions/meal-groups";
import { MEAL_DAY_LABELS, MEAL_TYPE_ICONS } from "@/components/nutrition/meal-groups/meal-group-types";
import { NutritionScopeControls } from "@/components/nutrition/nutrition-scope-controls";
import { MealPlannerSkeleton } from "@/components/nutrition/meal-planner/meal-planner-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  useNutritionGroupMutations,
  useNutritionMealGroup,
  useNutritionMealGroupOptions,
} from "@/hooks/use-nutrition-data";
import { getMealUnitOptions } from "@/lib/nutrition/meal-units";
import {
  useNutritionSelectedMealGroupId,
  useNutritionSelectedPlannerDay,
  useSetNutritionNavigationSource,
  useSetNutritionSelectedMealGroupId,
  useSetNutritionSelectedPlannerDay,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { applyMacroQuickAction, currentMealDay, isMealGroupSelected, type MacroQuickAction } from "@/lib/nutrition/meal-ui";
import { cn } from "@/utils";

const DAY_ORDER: MealDayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SECTION_ORDER: MealItemType[] = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
];

const SECTION_LABELS: Record<MealItemType, string> = {
  breakfast: "Breakfast",
  snack: "Snack",
  lunch: "Lunch",
  pre_workout_meal: "Pre-workout meal",
  post_workout_meal: "Post-workout meal",
  dinner: "Dinner",
  protein_drink: "Protein drink",
  water: "Water",
};
const NO_UNIT_SELECT_VALUE = "__no_unit__";

type MealItemFormState = {
  mode: "create" | "edit";
  mealItemId: string | null;
  day: MealDayOfWeek;
  type: MealItemType;
  planned_date: string;
  planned_time: string;
  title: string;
  quantity: string;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string;
};

type MealTypeFormState = {
  type: MealItemType;
};

function defaultItemForm(day: MealDayOfWeek, type: MealItemType = "breakfast"): MealItemFormState {
  return {
    mode: "create",
    mealItemId: null,
    day,
    type,
    planned_date: "",
    planned_time: "",
    title: "",
    quantity: "",
    unit: "",
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    notes: "",
  };
}

function defaultMealTypeForm(): MealTypeFormState {
  return {
    type: "water",
  };
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeQuantityInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(10000, Math.round(parsed * 100) / 100));
}

function MetricControl({
  label,
  value,
  onChange,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  max: number;
  unit: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={max}
            value={value}
            onChange={(event) => onChange(clampInt(Number(event.target.value), 0, max))}
            className="h-8 w-24 border-border/60 bg-background/80 text-right"
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={(values) => onChange(clampInt(values[0] ?? 0, 0, max))} />
    </div>
  );
}

function findDayPlan(detail: MealGroupDetail | undefined, day: MealDayOfWeek) {
  return detail?.plans.find((plan) => plan.day_of_week === day) ?? detail?.plans[0] ?? null;
}

function SectionIcon({ type, className }: { type: MealItemType; className?: string }) {
  const Icon = MEAL_TYPE_ICONS[type] ?? MEAL_TYPE_ICONS.breakfast;
  return <Icon className={className} />;
}

export function MealPlannerPage() {
  const groupsQuery = useNutritionMealGroupOptions();
  const mutations = useNutritionGroupMutations();
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const setSelectedMealGroupId = useSetNutritionSelectedMealGroupId();
  const selectedDay = useNutritionSelectedPlannerDay();
  const setSelectedDay = useSetNutritionSelectedPlannerDay();
  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();

  const groups = useMemo(() => groupsQuery.data?.rows ?? [], [groupsQuery.data?.rows]);
  const groupId = selectedMealGroupId || null;
  const [notesDraft, setNotesDraft] = useState("");

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMealTypeModalOpen, setIsMealTypeModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<MealItemFormState>(() => defaultItemForm(currentMealDay(), "water"));
  const [mealTypeForm, setMealTypeForm] = useState<MealTypeFormState>(() => defaultMealTypeForm());

  useEffect(() => {
    setViewMode("planner");
    setNavigationSource("planner");
  }, [setNavigationSource, setViewMode]);

  useEffect(() => {
    if (!groupId) return;
    if (groups.some((row) => row.id === groupId)) return;
    if (groupsQuery.data?.has_more) return;
    setSelectedMealGroupId("");
  }, [groupId, groups, groupsQuery.data?.has_more, setSelectedMealGroupId]);

  const detailQuery = useNutritionMealGroup(groupId ?? "");
  const detail = detailQuery.data;
  const mealGroupSelected = isMealGroupSelected(groupId);

  const selectedPlan = useMemo(() => findDayPlan(detail, selectedDay), [detail, selectedDay]);

  useEffect(() => {
    setNotesDraft(selectedPlan?.notes ?? "");
  }, [selectedPlan?.id, selectedPlan?.notes]);

  const sectionTypes = useMemo(
    () => (selectedPlan?.meal_types || []).map((entry) => entry.type),
    [selectedPlan?.meal_types]
  );

  const itemsByType = useMemo(() => {
    const map = new Map<MealItemType, MealGroupDetail["plans"][number]["items"]>();
    for (const type of sectionTypes) map.set(type, []);
    for (const item of selectedPlan?.items ?? []) {
      const current = map.get(item.type) ?? [];
      map.set(item.type, [...current, item]);
    }
    return map;
  }, [sectionTypes, selectedPlan?.items]);

  const createModeTypeOptions = useMemo(() => {
    const dayPlan = findDayPlan(detail, itemForm.day);
    const plannedTypes = (dayPlan?.meal_types || []).map((entry) => entry.type);
    const uniquePlannedTypes = Array.from(new Set(plannedTypes));
    return uniquePlannedTypes.length > 0 ? uniquePlannedTypes : SECTION_ORDER;
  }, [detail, itemForm.day]);
  const unitOptions = useMemo(() => getMealUnitOptions(itemForm.unit), [itemForm.unit]);

  const openCreateItem = (day: MealDayOfWeek, type: MealItemType) => {
    setItemForm(defaultItemForm(day, type));
    setIsItemModalOpen(true);
  };

  const openEditItem = (day: MealDayOfWeek, item: NonNullable<MealGroupDetail["plans"][number]["items"][number]>) => {
    setItemForm({
      mode: "edit",
      mealItemId: item.id,
      day,
      type: item.type,
      planned_date: item.planned_date || "",
      planned_time: item.planned_time || "",
      title: item.title || "",
      quantity: item.quantity?.toString() || "",
      unit: item.unit || "",
      calories: item.calories || 0,
      protein_g: item.protein_g || 0,
      carbs_g: item.carbs_g || 0,
      fat_g: item.fat_g || 0,
      notes: item.notes || "",
    });
    setIsItemModalOpen(true);
  };

  const saveMealItem = async () => {
    if (!mealGroupSelected) {
      toast.error("Select a meal group to continue.");
      return;
    }

    const dayPlan = findDayPlan(detail, itemForm.day);
    if (!dayPlan) {
      toast.error("No day plan available. Create a meal group first.");
      return;
    }

    const normalizedQuantity = normalizeQuantityInput(itemForm.quantity);
    const normalizedUnit = itemForm.unit.trim() || null;

    try {
      if (itemForm.mode === "create") {
        await mutations.createItem.mutateAsync({
          meal_plan_id: dayPlan.id,
          type: itemForm.type,
          title: itemForm.title.trim() || SECTION_LABELS[itemForm.type],
          quantity: normalizedQuantity,
          unit: normalizedUnit,
          calories: itemForm.calories,
          protein_g: itemForm.protein_g,
          carbs_g: itemForm.carbs_g,
          fat_g: itemForm.fat_g,
          notes: itemForm.notes.trim() || null,
          planned_date: itemForm.planned_date || null,
          planned_time: itemForm.planned_time || null,
        });
        toast.success("Meal item added");
      } else if (itemForm.mealItemId) {
        await mutations.updateItem.mutateAsync({
          meal_item_id: itemForm.mealItemId,
          changes: {
            type: itemForm.type,
            title: itemForm.title.trim() || SECTION_LABELS[itemForm.type],
            quantity: normalizedQuantity,
            unit: normalizedUnit,
            calories: itemForm.calories,
            protein_g: itemForm.protein_g,
            carbs_g: itemForm.carbs_g,
            fat_g: itemForm.fat_g,
            notes: itemForm.notes.trim() || null,
            planned_date: itemForm.planned_date || null,
            planned_time: itemForm.planned_time || null,
          },
        });
        toast.success("Meal item updated");
      }
      setIsItemModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal item");
    }
  };

  const duplicateCurrentGroup = async () => {
    if (!groupId) return;
    try {
      const result = await mutations.duplicateGroup.mutateAsync({ meal_group_id: groupId });
      if (result?.id) {
        setSelectedMealGroupId(result.id);
      }
      toast.success("Meal planner duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate planner");
    }
  };

  const saveNotes = async () => {
    if (!selectedPlan) return;
    try {
      await mutations.updatePlanNote.mutateAsync({
        meal_plan_id: selectedPlan.id,
        notes: notesDraft.trim() || null,
      });
      toast.success("Section notes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save notes");
    }
  };

  const confirmDeleteItem = async () => {
    if (!pendingDeleteItemId) return;
    try {
      await mutations.deleteItem.mutateAsync({ meal_item_id: pendingDeleteItemId });
      toast.success("Meal item deleted");
      setIsDeleteModalOpen(false);
      setPendingDeleteItemId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete item");
    }
  };

  const createDefaultGroup = async () => {
    try {
      const result = await mutations.upsertGroup.mutateAsync({
        name: "Lean Bulk — Week 1",
        description: "Weekly meal planner template",
        status: "draft",
      });
      if (result?.id) {
        setSelectedMealGroupId(result.id);
        toast.success("Meal planner created");
      } else {
        toast.success("Meal planner created");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create planner");
    }
  };

  const addMealType = async () => {
    if (!mealGroupSelected || !detail) {
      toast.error("Select a meal group first.");
      return;
    }

    const targetPlan = findDayPlan(detail, selectedDay);
    if (!targetPlan) {
      toast.error("No plan available for selected day.");
      return;
    }

    try {
      await mutations.createPlanType.mutateAsync({
        meal_plan_id: targetPlan.id,
        type: mealTypeForm.type,
      });
      toast.success("Meal type added");
      setIsMealTypeModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add meal type");
    }
  };

  const applyQuickActionToItemForm = (action: MacroQuickAction) => {
    const next = applyMacroQuickAction(
      {
        calories: itemForm.calories,
        protein_g: itemForm.protein_g,
        carbs_g: itemForm.carbs_g,
        fat_g: itemForm.fat_g,
      },
      action
    );
    setItemForm((prev) => ({
      ...prev,
      calories: next.calories,
      protein_g: next.protein_g,
      carbs_g: next.carbs_g,
      fat_g: next.fat_g,
    }));
  };

  if (groupsQuery.isLoading || (groupId && detailQuery.isLoading)) {
    return <MealPlannerSkeleton />;
  }

  if (!groupId) {
    return (
      <section className="glass-surface surface-pad">
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Meal Planner</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Select a meal group before planner actions are enabled.
          </p>
          <Button variant="outline" onClick={() => setIsScopeModalOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Options
          </Button>
          <Button
            onClick={() => void createDefaultGroup()}
            className="h-12 rounded-full bg-chart-2 px-6 text-black hover:bg-chart-2/90"
            disabled={mutations.upsertGroup.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Planner
          </Button>
        </div>
        <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Planner Options</DialogTitle>
              <DialogDescription>Select user and meal group for this planner.</DialogDescription>
            </DialogHeader>
            <NutritionScopeControls showHelperText fullWidthOnMobile />
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  if (!detail || !selectedPlan) {
    return <MealPlannerSkeleton />;
  }

  const mealCount = selectedPlan.items.length;
  const dayLabel = MEAL_DAY_LABELS[selectedPlan.day_of_week];
  const kcal = selectedPlan.totals.calories ?? 0;

  return (
    <div className="section-gap">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              className={cn(
                "flex h-12 min-w-[58px] flex-col items-center justify-center rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                selectedDay === day
                  ? "border-chart-2/50 bg-chart-2 text-black"
                  : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
              onClick={() => setSelectedDay(day)}
            >
              {MEAL_DAY_LABELS[day].slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-xl border-border/70" onClick={() => setIsScopeModalOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Options
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-border/70"
            onClick={() => void duplicateCurrentGroup()}
            disabled={mutations.duplicateGroup.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-border/70"
            onClick={() => {
              setMealTypeForm({ type: "water" });
              setIsMealTypeModalOpen(true);
            }}
            disabled={!mealGroupSelected}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Meal Type
          </Button>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full bg-chart-2 text-black hover:bg-chart-2/90"
            onClick={() => {
              const defaultType = selectedPlan.meal_types?.[0]?.type || "water";
              openCreateItem(selectedDay, defaultType);
            }}
            disabled={!mealGroupSelected || (selectedPlan.meal_types?.length || 0) === 0}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="glass-subtle flex items-center justify-between px-4 py-4 sm:px-5">
        <p className="text-base font-medium sm:text-xl">
          {dayLabel} — {mealCount} {mealCount === 1 ? "meal" : "meals"}
        </p>
        <p className="text-lg font-semibold text-chart-2 sm:text-2xl">{kcal} kcal</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Meal Types</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-border/60"
            onClick={() => {
              setMealTypeForm({ type: "water" });
              setIsMealTypeModalOpen(true);
            }}
            disabled={!mealGroupSelected}
          >
            <CirclePlus className="mr-2 h-4 w-4" />
            Add Meal Type
          </Button>
        </div>

        {(selectedPlan.meal_types?.length || 0) === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">No meal types added for {dayLabel} yet.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 rounded-xl border-border/70"
              onClick={() => {
                setMealTypeForm({ type: "water" });
                setIsMealTypeModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Meal Type
            </Button>
          </div>
        ) : null}
        {(selectedPlan.meal_types || []).map((mealTypeEntry) => {
          const type = mealTypeEntry.type;
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
            <article key={mealTypeEntry.id} className="glass-surface overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SectionIcon type={type} className="h-4 w-4 text-chart-2" />
                    <h3 className="truncate text-xl font-semibold tracking-tight">{SECTION_LABELS[type]}</h3>
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
                    onClick={() => openCreateItem(selectedDay, type)}
                    disabled={!mealGroupSelected}
                  >
                    Quick Add
                  </Button>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full accent-strong"
                    onClick={() => openCreateItem(selectedDay, type)}
                    aria-label={`Add item to ${SECTION_LABELS[type]}`}
                    disabled={!mealGroupSelected}
                  >
                    <CirclePlus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {sectionItems.length === 0 ? (
                <button
                  type="button"
                  className="w-full px-5 py-8 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => openCreateItem(selectedDay, type)}
                  disabled={!mealGroupSelected}
                >
                  Tap + to add
                </button>
              ) : (
                <div className="divide-y divide-border/30 px-4 md:px-5">
                  {sectionItems
                    .slice()
                    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
                    .map((item) => (
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditItem(selectedDay, item)}>
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
                              setPendingDeleteItemId(item.id);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </article>
          );
        })}
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

      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{itemForm.mode === "create" ? "Add Meal Item" : "Edit Meal Item"}</DialogTitle>
            <DialogDescription>
              {itemForm.mode === "create" ? "Set item details for this planner entry." : "Update values and notes for this entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Meal Section</Label>
                <Select
                  value={itemForm.type}
                  onValueChange={(value) => setItemForm((prev) => ({ ...prev, type: value as MealItemType }))}
                  disabled={itemForm.mode === "edit"}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {createModeTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SECTION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={itemForm.planned_time}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, planned_time: event.target.value }))}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={itemForm.title}
                onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
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
                  step="0.1"
                  value={itemForm.quantity}
                  onChange={(event) => setItemForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  placeholder="e.g. 1"
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={itemForm.unit || NO_UNIT_SELECT_VALUE}
                  onValueChange={(value) =>
                    setItemForm((prev) => ({
                      ...prev,
                      unit: value === NO_UNIT_SELECT_VALUE ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
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

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricControl
                label="Calories"
                value={itemForm.calories}
                onChange={(next) => setItemForm((prev) => ({ ...prev, calories: next }))}
                max={2000}
                unit="kcal"
              />
              <MetricControl
                label="Protein"
                value={itemForm.protein_g}
                onChange={(next) => setItemForm((prev) => ({ ...prev, protein_g: next }))}
                max={300}
                unit="g"
              />
              <MetricControl
                label="Carbs"
                value={itemForm.carbs_g}
                onChange={(next) => setItemForm((prev) => ({ ...prev, carbs_g: next }))}
                max={300}
                unit="g"
              />
              <MetricControl
                label="Fat"
                value={itemForm.fat_g}
                onChange={(next) => setItemForm((prev) => ({ ...prev, fat_g: next }))}
                max={300}
                unit="g"
              />
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
                value={itemForm.notes}
                onChange={(event) => setItemForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes..."
                className="min-h-20 rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl border-border/60" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="accent-strong rounded-xl"
              onClick={() => void saveMealItem()}
              disabled={mutations.createItem.isPending || mutations.updateItem.isPending}
            >
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMealTypeModalOpen} onOpenChange={setIsMealTypeModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Add Meal Type</DialogTitle>
            <DialogDescription>Add a meal type card for {MEAL_DAY_LABELS[selectedDay]}.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="shrink-0">Meal Type</Label>
              <div className="min-w-0 flex-1">
                <Select value={mealTypeForm.type} onValueChange={(value) => setMealTypeForm((prev) => ({ ...prev, type: value as MealItemType }))}>
                  <SelectTrigger className="h-10 w-full border-border/70 bg-muted/20">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_ORDER.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SECTION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMealTypeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void addMealType()} disabled={mutations.createPlanType.isPending}>
              {mutations.createPlanType.isPending ? "Adding..." : "Add Meal Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScopeModalOpen} onOpenChange={setIsScopeModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Planner Options</DialogTitle>
            <DialogDescription>Select user and meal group for this planner.</DialogDescription>
          </DialogHeader>
          <NutritionScopeControls showHelperText fullWidthOnMobile />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete meal item?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDeleteItem()} disabled={mutations.deleteItem.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
