"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { MealGroupStatus, MealItemType } from "@/app/actions/meal-groups";
import { AssignMealGroupDialog } from "@/components/nutrition/meal-groups/assign-meal-group-dialog";
import { MealItemEditorDialog } from "@/components/nutrition/meal-groups/meal-item-editor-dialog";
import {
  MEAL_DAY_LABELS,
  MEAL_DAY_ORDER,
  MEAL_GROUP_STATUS_LABELS,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_LABELS,
} from "@/components/nutrition/meal-groups/meal-group-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMealGroupDetail, useMealGroupMutations } from "@/hooks/use-meal-groups";
import type { Database } from "@/types/database";
import { cn } from "@/utils";

type MealItemRow = Database["public"]["Tables"]["meal_group_items"]["Row"];
type MealDayOfWeek = Database["public"]["Enums"]["meal_day_of_week"];

const MEAL_TYPE_ORDER: MealItemType[] = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
];

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

function toSafeNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function MacroTotalCard({ label, value, unit, accent }: { label: string; value: number; unit?: string; accent: string }) {
  return (
    <div className="glass-subtle p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold leading-none", accent)}>
        {Math.round(value)}
        {unit ? <span className="ml-1 text-lg text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

export function MealGroupDetail({ mealGroupId }: { mealGroupId: string }) {
  const detailQuery = useMealGroupDetail(mealGroupId);
  const mutations = useMealGroupMutations();

  const [selectedDay, setSelectedDay] = useState<MealDayOfWeek>("mon");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupNotes, setGroupNotes] = useState("");
  const [groupStartDate, setGroupStartDate] = useState("");
  const [groupEndDate, setGroupEndDate] = useState("");
  const [groupStatus, setGroupStatus] = useState<MealGroupStatus>("draft");

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<MealItemRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [dayNotesDraft, setDayNotesDraft] = useState("");

  const data = detailQuery.data;
  const group = data?.group || null;
  const plansByDay = useMemo(() => new Map((data?.plans || []).map((plan) => [plan.day_of_week, plan])), [data?.plans]);
  const dayPlan = plansByDay.get(selectedDay) || null;

  const itemsByType = useMemo(() => {
    if (!dayPlan) return new Map<MealItemType, MealItemRow[]>();
    const map = new Map<MealItemType, MealItemRow[]>();
    for (const type of MEAL_TYPE_ORDER) map.set(type, []);
    for (const item of dayPlan.items) {
      const list = map.get(item.type as MealItemType) || [];
      list.push(item);
      map.set(item.type as MealItemType, list);
    }

    for (const type of MEAL_TYPE_ORDER) {
      const sorted = (map.get(type) || []).slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
      map.set(type, sorted);
    }

    return map;
  }, [dayPlan]);

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

  if (detailQuery.isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
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

    try {
      await mutations.upsertGroup.mutateAsync({
        id: group.id,
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        notes: groupNotes.trim() || null,
        start_date: groupStartDate || null,
        end_date: groupEndDate || null,
        status: groupStatus,
      });
      toast.success("Meal group updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update meal group");
    }
  };

  const savePlanNotes = async () => {
    if (!dayPlan) return;
    try {
      await mutations.updatePlanNote.mutateAsync({
        meal_plan_id: dayPlan.id,
        notes: dayNotesDraft.trim() || null,
      });
      toast.success("Day notes updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update day notes");
    }
  };

  const createItem = async (payload: {
    type: MealItemType;
    title: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    notes: string | null;
  }) => {
    if (!dayPlan) return;

    await mutations.createItem.mutateAsync({
      meal_plan_id: dayPlan.id,
      ...payload,
    });
    toast.success("Meal item created");
    setAddItemOpen(false);
  };

  const updateItem = async (payload: {
    type: MealItemType;
    title: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    notes: string | null;
  }) => {
    if (!editItem) return;

    await mutations.updateItem.mutateAsync({
      meal_item_id: editItem.id,
      changes: payload,
    });
    toast.success("Meal item updated");
    setEditItem(null);
  };

  const removeItem = async (itemId: string) => {
    try {
      await mutations.deleteItem.mutateAsync({ meal_item_id: itemId });
      toast.success("Meal item deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete meal item");
    }
  };

  const duplicateItem = async (itemId: string) => {
    try {
      await mutations.duplicateItem.mutateAsync({ meal_item_id: itemId });
      toast.success("Meal item duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal item");
    }
  };

  const duplicateGroup = async () => {
    try {
      await mutations.duplicateGroup.mutateAsync({ meal_group_id: group.id });
      toast.success("Meal group duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal group");
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="glass-surface surface-pad space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{group.name}</h1>
              <Badge className={cn("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusChipStyle(group.status))}>
                {MEAL_GROUP_STATUS_LABELS[group.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{group.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(group.start_date, group.end_date)}
              </span>
              <span>{data?.assignments.length || 0} assignments</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void duplicateGroup()}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => setAssignOpen(true)}>
              Assign
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-border/60">
              <Link href="/nutrition/groups">Back</Link>
            </Button>
          </div>
        </div>

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
          <Textarea value={groupNotes} onChange={(event) => setGroupNotes(event.target.value)} className="min-h-20 rounded-xl border-border/60 bg-muted/20" />
        </div>

        <div className="flex justify-end">
          <Button className="accent-strong rounded-xl" onClick={() => void saveGroup()} disabled={mutations.upsertGroup.isPending}>
            {mutations.upsertGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Group
          </Button>
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-4">
        <div className="flex flex-wrap gap-2">
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

        {!dayPlan ? (
          <p className="text-sm text-muted-foreground">No day plan found for {MEAL_DAY_LABELS[selectedDay]}.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MacroTotalCard label="Calories" value={dayPlan.totals.calories} accent="text-chart-1" />
              <MacroTotalCard label="Protein" value={dayPlan.totals.protein_g} accent="text-chart-2" unit="g" />
              <MacroTotalCard label="Carbs" value={dayPlan.totals.carbs_g} accent="text-chart-3" unit="g" />
              <MacroTotalCard label="Fat" value={dayPlan.totals.fat_g} accent="text-chart-4" unit="g" />
            </div>

            <div className="glass-subtle p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Meal Items — {MEAL_DAY_LABELS[dayPlan.day_of_week]}</h2>
                <Button className="accent-strong rounded-xl" size="sm" onClick={() => setAddItemOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Meal Item
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                {MEAL_TYPE_ORDER.map((type) => {
                  const items = itemsByType.get(type) || [];
                  const Icon = MEAL_TYPE_ICONS[type];
                  return (
                    <div key={type} className="rounded-xl border border-border/50 bg-background/40">
                      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-semibold">{MEAL_TYPE_LABELS[type]}</p>
                      </div>
                      {items.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">Tap + to add</p>
                      ) : (
                        <div className="divide-y divide-border/30">
                          {items.map((item) => (
                            <div key={item.id} className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <p className="font-medium leading-tight">{item.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.calories} kcal • P {item.protein_g}g • C {item.carbs_g}g • F {item.fat_g}g
                                </p>
                                {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" className="rounded-lg border-border/60" onClick={() => setEditItem(item)}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-lg border-border/60" onClick={() => void duplicateItem(item.id)}>
                                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                                  Duplicate
                                </Button>
                                <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => void removeItem(item.id)}>
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

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

      <MealItemEditorDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        title={`Add Meal Item • ${MEAL_DAY_LABELS[selectedDay]}`}
        pending={mutations.createItem.isPending}
        onSubmit={createItem}
      />

      <MealItemEditorDialog
        open={Boolean(editItem)}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        title="Edit Meal Item"
        pending={mutations.updateItem.isPending}
        defaultValue={editItem || undefined}
        onSubmit={updateItem}
      />

      <AssignMealGroupDialog
        mealGroupId={group.id}
        mealGroupName={group.name}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        defaultStartDate={group.start_date}
        defaultEndDate={group.end_date}
      />
    </div>
  );
}
