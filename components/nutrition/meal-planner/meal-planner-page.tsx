"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, MoreVertical, Plus } from "lucide-react";
import { toast } from "sonner";

import type { MealDayOfWeek, MealGroupDetail, MealItemType } from "@/app/actions/meal-groups";
import { MEAL_DAY_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useMealGroupDetail, useMealGroupMutations, useMealGroups } from "@/hooks/use-meal-groups";
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

type MealItemFormState = {
  mode: "create" | "edit";
  mealItemId: string | null;
  day: MealDayOfWeek;
  type: MealItemType;
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string;
};

function defaultItemForm(day: MealDayOfWeek, type: MealItemType = "breakfast"): MealItemFormState {
  return {
    mode: "create",
    mealItemId: null,
    day,
    type,
    title: "",
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    notes: "",
  };
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
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

export function MealPlannerPage() {
  const groupsQuery = useMealGroups({
    page: 0,
    pageSize: 25,
    status: "all",
    includeSnapshots: false,
  });
  const mutations = useMealGroupMutations();

  const groups = useMemo(() => groupsQuery.data?.rows ?? [], [groupsQuery.data?.rows]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<MealDayOfWeek>("mon");
  const [notesDraft, setNotesDraft] = useState("");

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<MealItemFormState>(() => defaultItemForm("mon", "breakfast"));

  useEffect(() => {
    if (groups.length === 0) {
      setGroupId(null);
      return;
    }

    if (!groupId || !groups.some((row) => row.id === groupId)) {
      setGroupId(groups[0].id);
    }
  }, [groupId, groups]);

  const detailQuery = useMealGroupDetail(groupId ?? "");
  const detail = detailQuery.data;

  const selectedPlan = useMemo(() => findDayPlan(detail, selectedDay), [detail, selectedDay]);

  useEffect(() => {
    setNotesDraft(selectedPlan?.notes ?? "");
  }, [selectedPlan?.id, selectedPlan?.notes]);

  const itemsByType = useMemo(() => {
    const map = new Map<MealItemType, MealGroupDetail["plans"][number]["items"]>();
    for (const type of SECTION_ORDER) map.set(type, []);
    for (const item of selectedPlan?.items ?? []) {
      const current = map.get(item.type) ?? [];
      map.set(item.type, [...current, item]);
    }
    return map;
  }, [selectedPlan?.items]);

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
      title: item.title || "",
      calories: item.calories || 0,
      protein_g: item.protein_g || 0,
      carbs_g: item.carbs_g || 0,
      fat_g: item.fat_g || 0,
      notes: item.notes || "",
    });
    setIsItemModalOpen(true);
  };

  const saveMealItem = async () => {
    const dayPlan = findDayPlan(detail, itemForm.day);
    if (!dayPlan) {
      toast.error("No day plan available. Create a meal group first.");
      return;
    }

    try {
      if (itemForm.mode === "create") {
        await mutations.createItem.mutateAsync({
          meal_plan_id: dayPlan.id,
          type: itemForm.type,
          title: itemForm.title.trim() || SECTION_LABELS[itemForm.type],
          calories: itemForm.calories,
          protein_g: itemForm.protein_g,
          carbs_g: itemForm.carbs_g,
          fat_g: itemForm.fat_g,
          notes: itemForm.notes.trim() || null,
        });
        toast.success("Meal item added");
      } else if (itemForm.mealItemId) {
        await mutations.updateItem.mutateAsync({
          meal_item_id: itemForm.mealItemId,
          changes: {
            type: itemForm.type,
            title: itemForm.title.trim() || SECTION_LABELS[itemForm.type],
            calories: itemForm.calories,
            protein_g: itemForm.protein_g,
            carbs_g: itemForm.carbs_g,
            fat_g: itemForm.fat_g,
            notes: itemForm.notes.trim() || null,
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
        setGroupId(result.id);
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
      if (result?.id) setGroupId(result.id);
      toast.success("Meal planner created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create planner");
    }
  };

  if (groupsQuery.isLoading || (groupId && detailQuery.isLoading)) {
    return <MealPlannerSkeleton />;
  }

  if (!groupId || !detail || !selectedPlan) {
    return (
      <section className="glass-surface surface-pad">
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Meal Planner</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Build your week with structured meal sections and editable macro targets.
          </p>
          <Button
            onClick={() => void createDefaultGroup()}
            className="h-12 rounded-full bg-chart-2 px-6 text-black hover:bg-chart-2/90"
            disabled={mutations.upsertGroup.isPending}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Planner
          </Button>
        </div>
      </section>
    );
  }

  const mealCount = selectedPlan.items.length;
  const dayLabel = MEAL_DAY_LABELS[selectedPlan.day_of_week];
  const kcal = selectedPlan.totals.calories ?? 0;

  return (
    <div className="section-gap">
      <section className="glass-surface surface-pad space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Meal Planner</h1>
            <p className="text-sm text-muted-foreground">{detail.group.name || "Lean Bulk — Week 1"}</p>
          </div>

          <div className="flex items-center gap-2">
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
              size="icon"
              className="h-11 w-11 rounded-full bg-chart-2 text-black hover:bg-chart-2/90"
              onClick={() => openCreateItem(selectedDay, "breakfast")}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

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
      </section>

      <section className="glass-subtle flex items-center justify-between px-4 py-4 sm:px-5">
        <p className="text-base font-medium sm:text-xl">
          {dayLabel} — {mealCount} {mealCount === 1 ? "meal" : "meals"}
        </p>
        <p className="text-lg font-semibold text-chart-2 sm:text-2xl">{kcal} kcal</p>
      </section>

      <section className="space-y-3">
        {SECTION_ORDER.map((type) => {
          const sectionItems = itemsByType.get(type) ?? [];
          const primary = sectionItems[0] ?? null;
          const extraCount = Math.max(sectionItems.length - 1, 0);
          const macroCalories = primary?.calories ?? 0;
          const macroProtein = primary?.protein_g ?? 0;
          const macroCarbs = primary?.carbs_g ?? 0;
          const macroFat = primary?.fat_g ?? 0;

          return (
            <article key={type} className="glass-surface relative overflow-hidden rounded-3xl px-5 py-4">
              <div className="pr-12">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chart-2">{SECTION_LABELS[type]}</p>
                <p className={cn("mt-3 text-2xl font-medium tracking-tight", primary ? "text-foreground" : "text-muted-foreground")}>
                  {primary?.title || "Tap + to add"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>{macroCalories} kcal</span>
                  <span>P: {macroProtein}g</span>
                  <span>C: {macroCarbs}g</span>
                  <span>F: {macroFat}g</span>
                </div>
                {extraCount > 0 ? <p className="mt-2 text-xs text-muted-foreground">+{extraCount} additional item{extraCount > 1 ? "s" : ""}</p> : null}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 h-10 w-10 rounded-xl border border-border/60 bg-muted/35 hover:bg-muted/60"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => openCreateItem(selectedDay, type)}>Add item</DropdownMenuItem>
                  {primary ? (
                    <>
                      <DropdownMenuItem onClick={() => openEditItem(selectedDay, primary)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void mutations.duplicateItem
                            .mutateAsync({ meal_item_id: primary.id })
                            .then(() => toast.success("Meal item duplicated"))
                            .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to duplicate item"));
                        }}
                      >
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setPendingDeleteItemId(primary.id);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
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
        <DialogContent size={{ tablet: "md", desktop: "md" }}>
          <DialogHeader>
            <DialogTitle>{itemForm.mode === "create" ? "Add Meal Item" : "Edit Meal Item"}</DialogTitle>
            <DialogDescription>
              {itemForm.mode === "create" ? "Choose day and meal type, then set calories and macros." : "Update item details and macros."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {itemForm.mode === "create" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select
                    value={itemForm.day}
                    onValueChange={(value) => setItemForm((prev) => ({ ...prev, day: value as MealDayOfWeek }))}
                  >
                    <SelectTrigger className="border-border/70 bg-muted/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_ORDER.map((day) => (
                        <SelectItem key={day} value={day}>
                          {MEAL_DAY_LABELS[day]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Meal Type</Label>
                  <Select
                    value={itemForm.type}
                    onValueChange={(value) => setItemForm((prev) => ({ ...prev, type: value as MealItemType }))}
                  >
                    <SelectTrigger className="border-border/70 bg-muted/20">
                      <SelectValue />
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
            ) : (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {MEAL_DAY_LABELS[itemForm.day]} • {SECTION_LABELS[itemForm.type]}
              </div>
            )}

            <div className="space-y-2">
              <Label>Item Title</Label>
              <Input
                value={itemForm.title}
                onChange={(event) => setItemForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g. Oatmeal & Banana"
                className="border-border/70 bg-muted/20"
              />
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={itemForm.notes}
                onChange={(event) => setItemForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes..."
                className="min-h-24 border-border/70 bg-muted/20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveMealItem()} disabled={mutations.createItem.isPending || mutations.updateItem.isPending}>
              {itemForm.mode === "create" ? "Add Item" : "Save Item"}
            </Button>
          </DialogFooter>
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
