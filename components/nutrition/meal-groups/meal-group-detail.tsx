"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { CalendarDays, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { MealGroupStatus, MealItemType } from "@/app/actions/meal-groups";
import { AssignMealGroupDialog } from "@/components/nutrition/meal-groups/assign-meal-group-dialog";
import { MealItemEditorDialog } from "@/components/nutrition/meal-groups/meal-item-editor-dialog";
import { MEAL_DAY_LABELS, MEAL_DAY_ORDER, MEAL_GROUP_STATUS_LABELS, MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMealGroupMutations, useMealGroupDetail } from "@/hooks/use-meal-groups";
import type { Database } from "@/types/database";

type MealItemRow = Database["public"]["Tables"]["meal_group_items"]["Row"];

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No duration";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

function statusVariant(status: MealGroupStatus): "secondary" | "default" | "outline" {
  if (status === "active") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

function SummaryRing({ calories }: { calories: number }) {
  const target = 2500;
  const percent = Math.max(0, Math.min(100, Math.round((calories / target) * 100)));
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${percent}%, hsl(var(--muted)) ${percent}% 100%)`,
        }}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-background text-center">
          <p className="text-sm font-semibold">{percent}%</p>
          <p className="text-[10px] text-muted-foreground">of 2500</p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Daily Calories</p>
        <p className="text-2xl font-semibold">{calories}</p>
      </div>
    </div>
  );
}

export function MealGroupDetail({ mealGroupId }: { mealGroupId: string }) {
  const detailQuery = useMealGroupDetail(mealGroupId);
  const mutations = useMealGroupMutations();

  const [selectedDay, setSelectedDay] = useState<(typeof MEAL_DAY_ORDER)[number]>("mon");
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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !group) {
    return (
      <div className="native-surface surface-pad text-sm text-destructive">
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load meal group."}
      </div>
    );
  }

  const saveGroup = async () => {
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
      toast.success("Meal group updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update meal group.");
    }
  };

  const savePlanNotes = async () => {
    if (!dayPlan) return;
    try {
      await mutations.updatePlanNote.mutateAsync({
        meal_plan_id: dayPlan.id,
        notes: dayNotesDraft.trim() || null,
      });
      toast.success("Day notes updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update day notes.");
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
    toast.success("Meal item created.");
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
    toast.success("Meal item updated.");
    setEditItem(null);
  };

  const removeItem = async (itemId: string) => {
    try {
      await mutations.deleteItem.mutateAsync({ meal_item_id: itemId });
      toast.success("Meal item deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete meal item.");
    }
  };

  const duplicateItem = async (itemId: string) => {
    try {
      await mutations.duplicateItem.mutateAsync({ meal_item_id: itemId });
      toast.success("Meal item duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal item.");
    }
  };

  const duplicateGroup = async () => {
    try {
      await mutations.duplicateGroup.mutateAsync({ meal_group_id: group.id });
      toast.success("Meal group duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal group.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{group.name}</h1>
            <p className="text-sm text-muted-foreground">{group.description || "No description provided."}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={statusVariant(group.status)}>{MEAL_GROUP_STATUS_LABELS[group.status]}</Badge>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateRange(group.start_date, group.end_date)}
              </span>
              <span>{data?.assignments.length || 0} assignments</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void duplicateGroup()}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button onClick={() => setAssignOpen(true)}>Assign</Button>
            <Button asChild variant="secondary">
              <Link href="/nutrition/meal-groups">Back</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={groupStatus} onValueChange={(value) => setGroupStatus(value as MealGroupStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Start Date</Label>
            <Input type="date" value={groupStartDate} onChange={(event) => setGroupStartDate(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>End Date</Label>
            <Input type="date" value={groupEndDate} onChange={(event) => setGroupEndDate(event.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Description</Label>
          <Input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Group Notes</Label>
          <Textarea value={groupNotes} onChange={(event) => setGroupNotes(event.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void saveGroup()} disabled={mutations.upsertGroup.isPending}>
            {mutations.upsertGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Group
          </Button>
        </div>
      </section>

      <section className="native-surface surface-pad space-y-4">
        <Tabs value={selectedDay} onValueChange={(value) => setSelectedDay(value as (typeof MEAL_DAY_ORDER)[number])}>
          <TabsList className="grid w-full grid-cols-7">
            {MEAL_DAY_ORDER.map((day) => (
              <TabsTrigger key={day} value={day}>
                {MEAL_DAY_LABELS[day].slice(0, 3)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!dayPlan ? (
          <p className="text-sm text-muted-foreground">No day plan found for {MEAL_DAY_LABELS[selectedDay]}.</p>
        ) : (
          <div className="space-y-4">
            <Card className="native-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{MEAL_DAY_LABELS[dayPlan.day_of_week]} Summary</CardTitle>
                <CardDescription>Daily macro totals from manually configured meal items.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[auto,1fr]">
                <SummaryRing calories={dayPlan.totals.calories} />
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-xl font-semibold">{dayPlan.totals.protein_g}g</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-xl font-semibold">{dayPlan.totals.carbs_g}g</p>
                  </div>
                  <div className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-xl font-semibold">{dayPlan.totals.fat_g}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="native-surface border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Meal Items</CardTitle>
                  <Button size="sm" onClick={() => setAddItemOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Meal Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayPlan.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meal items yet. Add breakfast, lunch, snacks, and more.</p>
                ) : (
                  dayPlan.items.map((item) => {
                    const Icon = MEAL_TYPE_ICONS[item.type];
                    return (
                      <div key={item.id} className="rounded-xl border p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{item.title}</p>
                              <Badge variant="secondary">{MEAL_TYPE_LABELS[item.type]}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.calories} kcal • P {item.protein_g}g • C {item.carbs_g}g • F {item.fat_g}g
                            </p>
                            {item.notes ? <p className="text-sm text-muted-foreground">{item.notes}</p> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditItem(item)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void duplicateItem(item.id)}>
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                              Duplicate
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void removeItem(item.id)}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="native-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Day Notes</CardTitle>
                <CardDescription>Notes at meal-plan/day level for this specific weekday.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={dayNotesDraft}
                  onChange={(event) => setDayNotesDraft(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button onClick={() => void savePlanNotes()} disabled={mutations.updatePlanNote.isPending}>
                    {mutations.updatePlanNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Day Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
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
