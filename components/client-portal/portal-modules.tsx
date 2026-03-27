"use client";

import { useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReadOnlyBanner } from "@/components/client-portal/read-only-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientPortalCheckins,
  useClientPortalDashboard,
  useClientPortalFavoriteMeals,
  useClientPortalGoals,
  useClientPortalMealDiary,
  useClientPortalMealPlan,
  useClientPortalMutations,
  useClientPortalNotes,
  useClientPortalRecentMeals,
  useClientPortalSteps,
  useClientPortalTasks,
  useClientPortalTrainingPlan,
  useClientPortalWorkouts,
} from "@/hooks/use-client-portal";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { normalizeMealUnit } from "@/lib/nutrition/meal-units";
import { cn } from "@/utils";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks", "other"] as const;
type MealType = (typeof MEAL_TYPES)[number];

export function ClientPortalDashboardView() {
  const query = useClientPortalDashboard();

  if (query.isLoading && !query.data) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : "Unable to load dashboard"}
      </div>
    );
  }

  const dashboard = query.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today&apos;s Sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.today_sessions}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.pending_tasks}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Next Training Session</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.next_session ? (
            <div className="space-y-1">
              <p className="font-medium">
                Session #{dashboard.next_session.sequence_no}: {dashboard.next_session.title}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {dashboard.next_session.session_type}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pending session in your active plan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalTasksView({ readOnly }: { readOnly: boolean }) {
  const query = useClientPortalTasks();
  const mutations = useClientPortalMutations(todayIso());

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading && !query.data ? (
            <Skeleton className="h-24 w-full" />
          ) : query.data && query.data.length > 0 ? (
            <div className="space-y-2">
              {query.data.map((task) => {
                const completed = task.status === "completed";
                return (
                  <div key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className={cn("font-medium", completed && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.due_date ? `Due ${task.due_date}` : "No due date"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={completed ? "outline" : "default"}
                      disabled={readOnly || mutations.completeTask.isPending}
                      onClick={() =>
                        void withToastFeedback(mutations.completeTask.mutateAsync({ task_id: task.id, completed: !completed }), {
                          loading: completed ? "Marking task pending..." : "Marking task complete...",
                          success: completed ? "Task marked pending" : "Task marked complete",
                          error: "Unable to update task",
                        }).catch(() => null)
                      }
                    >
                      {completed ? "Mark Pending" : "Mark Done"}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalWorkoutsView({ readOnly }: { readOnly: boolean }) {
  const [performedOn, setPerformedOn] = useState(todayIso());
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<"morning" | "afternoon" | "evening" | "other">("other");
  const [locationType, setLocationType] = useState<"gym" | "home" | "outdoor" | "travel" | "other">("gym");
  const [locationLabel, setLocationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const query = useClientPortalWorkouts(performedOn);
  const mutations = useClientPortalMutations(performedOn);

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Log Workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Session Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Upper Body / Morning Run" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Slot</Label>
              <Select value={slot} onValueChange={(value) => setSlot(value as typeof slot)}>
                <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">morning</SelectItem>
                  <SelectItem value="afternoon">afternoon</SelectItem>
                  <SelectItem value="evening">evening</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Location Type</Label>
              <Select value={locationType} onValueChange={(value) => setLocationType(value as typeof locationType)}>
                <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym">gym</SelectItem>
                  <SelectItem value="home">home</SelectItem>
                  <SelectItem value="outdoor">outdoor</SelectItem>
                  <SelectItem value="travel">travel</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Location Label</Label>
              <Input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Downtown Gym" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </div>
          <Button
            disabled={readOnly || mutations.createWorkout.isPending}
            onClick={() =>
              void mutations.createWorkout
                .mutateAsync({
                  name: name.trim() || "Training Session",
                  performed_on: performedOn,
                  session_slot: slot,
                  location_type: locationType,
                  location_label: locationLabel.trim() || null,
                  notes: notes.trim() || null,
                  started_at: new Date().toISOString(),
                })
                .then(() => {
                  setName("");
                  setNotes("");
                  setLocationLabel("");
                  toast.success("Workout logged");
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to log workout"))
            }
          >
            {mutations.createWorkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Workout
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sessions on {performedOn}</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading && !query.data ? (
            <Skeleton className="h-24 w-full" />
          ) : query.data && query.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.name}</TableCell>
                    <TableCell className="capitalize">{session.session_slot}</TableCell>
                    <TableCell>
                      {session.started_at ? new Date(session.started_at).toLocaleTimeString() : "-"}
                    </TableCell>
                    <TableCell>{session.location_label || session.location_type || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No workouts logged for this date.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalTrainingView({ readOnly }: { readOnly: boolean }) {
  const query = useClientPortalTrainingPlan();
  const mutations = useClientPortalMutations(todayIso());

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Active Training Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading && !query.data ? (
            <Skeleton className="h-24 w-full" />
          ) : query.data?.assignment ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium">{query.data.assignment.name}</p>
                <p className="text-xs text-muted-foreground">
                  Started: {query.data.assignment.started_on || "-"}
                </p>
              </div>
              <div className="space-y-2">
                {query.data.sessions.map((session) => {
                  const done = Boolean(session.completed_at || session.is_skipped);
                  return (
                    <div key={session.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className={cn("font-medium", done && "text-muted-foreground")}>
                          #{session.sequence_no} {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{session.session_type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {done ? <Badge variant="secondary">Completed</Badge> : <Badge>Pending</Badge>}
                        {!done && !readOnly ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void mutations.createWorkout
                                .mutateAsync({
                                  name: session.title,
                                  performed_on: todayIso(),
                                  session_slot: session.default_slot,
                                  notes: session.notes || null,
                                  plan_assignment_id: query.data.assignment?.id || null,
                                  plan_session_id: session.id,
                                  mark_plan_session_resolved: true,
                                  started_at: new Date().toISOString(),
                                })
                                .then(() => toast.success("Session logged"))
                                .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to log session"))
                            }
                          >
                            Log
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active training plan assigned.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalMealPlanView() {
  const [performedOn, setPerformedOn] = useState(todayIso());
  const query = useClientPortalMealPlan(performedOn);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Meal Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:max-w-[220px]">
            <Label>Date</Label>
            <Input type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} />
          </div>
          {query.isLoading && !query.data ? (
            <Skeleton className="h-24 w-full" />
          ) : query.data?.plan ? (
            <div className="space-y-2">
              <p className="font-medium">{query.data.plan.name}</p>
              <p className="text-xs text-muted-foreground">
                {query.data.plan.start_date} to {query.data.plan.end_date}
              </p>
              <div className="grid gap-2 md:grid-cols-4">
                <Metric label="Calories" value={query.data.plan.daily_calorie_target} />
                <Metric label="Protein (g)" value={query.data.plan.daily_protein_target_g} />
                <Metric label="Carbs (g)" value={query.data.plan.daily_carbs_target_g} />
                <Metric label="Fat (g)" value={query.data.plan.daily_fat_target_g} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active meal plan for this date.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value ?? "-"}</p>
    </div>
  );
}

export function ClientPortalNutritionView({ readOnly }: { readOnly: boolean }) {
  const [performedOn, setPerformedOn] = useState(todayIso());
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [itemName, setItemName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [openRecent, setOpenRecent] = useState(false);
  const [openFavorites, setOpenFavorites] = useState(false);
  const [copyDate, setCopyDate] = useState(format(subDays(new Date(), 1), "yyyy-MM-dd"));

  const diaryQuery = useClientPortalMealDiary(performedOn);
  const recentQuery = useClientPortalRecentMeals(30);
  const favoritesQuery = useClientPortalFavoriteMeals(30);
  const mutations = useClientPortalMutations(performedOn);

  const logsByType = useMemo(() => {
    const map = new Map<MealType, NonNullable<typeof diaryQuery.data>["logs"][number]>();
    for (const log of diaryQuery.data?.logs || []) {
      map.set(log.meal_type as MealType, log);
    }
    return map;
  }, [diaryQuery]);

  const saveItem = async () => {
    await mutations.addMealItem.mutateAsync({
      performed_on: performedOn,
      meal_type: mealType,
      item: {
        item_name: itemName.trim() || "Quick Add",
        unit: null,
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
        is_quick_add: !itemName.trim(),
      },
    });
    setItemName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Meal Diary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input type="date" className="w-[170px]" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} />
            <Button variant="outline" onClick={() => setOpenRecent(true)}>Recent</Button>
            <Button variant="outline" onClick={() => setOpenFavorites(true)}>Favorites</Button>
            <Button
              variant="outline"
              disabled={readOnly || mutations.copyMeals.isPending}
              onClick={() =>
                void mutations.copyMeals
                  .mutateAsync({ source_date: copyDate, target_date: performedOn })
                  .then(() => toast.success("Meals copied"))
                  .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to copy meals"))
              }
            >
              Copy From Date
            </Button>
            <Input type="date" className="w-[170px]" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} />
          </div>

          {diaryQuery.isLoading && !diaryQuery.data ? (
            <Skeleton className="h-20 w-full" />
          ) : diaryQuery.data ? (
            <div className="grid gap-2 md:grid-cols-5">
              <Metric label="Calories" value={Math.round(diaryQuery.data.totals.calories)} />
              <Metric label="Protein (g)" value={Math.round(diaryQuery.data.totals.protein_g)} />
              <Metric label="Carbs (g)" value={Math.round(diaryQuery.data.totals.carbs_g)} />
              <Metric label="Fat (g)" value={Math.round(diaryQuery.data.totals.fat_g)} />
              <Metric label="Fiber (g)" value={Math.round(diaryQuery.data.totals.fiber_g)} />
            </div>
          ) : null}

          <div className="rounded-md border p-3">
            <div className="grid gap-2 md:grid-cols-6">
              <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
                <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Item name" />
              <Input value={calories} onChange={(event) => setCalories(event.target.value)} type="number" min="0" placeholder="Calories" />
              <Input value={protein} onChange={(event) => setProtein(event.target.value)} type="number" min="0" placeholder="Protein" />
              <Input value={carbs} onChange={(event) => setCarbs(event.target.value)} type="number" min="0" placeholder="Carbs" />
              <Input value={fat} onChange={(event) => setFat(event.target.value)} type="number" min="0" placeholder="Fat" />
            </div>
            <Button
              className="mt-3"
              disabled={readOnly || mutations.addMealItem.isPending}
              onClick={() =>
                void saveItem()
                  .then(() => toast.success("Meal item added"))
                  .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to add item"))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {MEAL_TYPES.map((type) => {
              const log = logsByType.get(type);
              const items = log?.items || [];
              return (
                <div key={type} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium capitalize">{type}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(Number(log?.total_calories || 0))} kcal
                    </p>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                          <div>
                            <p className="text-sm font-medium">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(Number(item.calories || 0))} kcal • {Math.round(Number(item.protein_g || 0))}P • {Math.round(Number(item.carbs_g || 0))}C • {Math.round(Number(item.fat_g || 0))}F
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!readOnly ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    void withToastFeedback(
                                      mutations.toggleMealFavorite.mutateAsync({
                                        item: {
                                          item_name: item.item_name,
                                          quantity: item.quantity,
                                          unit: normalizeMealUnit(item.unit),
                                          calories: item.calories,
                                          protein_g: item.protein_g,
                                          carbs_g: item.carbs_g,
                                          fat_g: item.fat_g,
                                          fiber_g: item.fiber_g,
                                          notes: item.notes,
                                        },
                                      }),
                                      {
                                        loading: "Updating favorites...",
                                        success: "Favorites updated",
                                        error: "Unable to update favorites",
                                      }
                                    ).catch(() => null)
                                  }
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() =>
                                    void withToastFeedback(mutations.removeMealItem.mutateAsync({ item_id: item.id }), {
                                      loading: "Deleting meal item...",
                                      success: "Meal item deleted",
                                      error: "Unable to delete item",
                                    }).catch(() => null)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openRecent} onOpenChange={setOpenRecent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recent Items</DialogTitle>
          </DialogHeader>
          <div className="max-h-[340px] space-y-2 overflow-auto">
            {(recentQuery.data || []).map((item, index) => (
              <div key={`${item.item_name}-${index}`} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(Number(item.calories || 0))} kcal
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    void mutations.addMealItem
                      .mutateAsync({
                        performed_on: performedOn,
                        meal_type: mealType,
                        item: {
                          item_name: item.item_name,
                          quantity: item.quantity,
                          unit: normalizeMealUnit(item.unit),
                          calories: item.calories,
                          protein_g: item.protein_g,
                          carbs_g: item.carbs_g,
                          fat_g: item.fat_g,
                          fiber_g: item.fiber_g,
                          notes: item.notes,
                        },
                      })
                      .then(() => toast.success("Item added"))
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to add item"))
                  }
                >
                  Add
                </Button>
              </div>
            ))}
            {(recentQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent items.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openFavorites} onOpenChange={setOpenFavorites}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Favorites</DialogTitle>
            <DialogDescription>Saved by you from logged meals.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[340px] space-y-2 overflow-auto">
            {(favoritesQuery.data || []).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(Number(item.calories || 0))} kcal
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    void mutations.addMealItem
                      .mutateAsync({
                        performed_on: performedOn,
                        meal_type: mealType,
                        item: {
                          item_name: item.item_name,
                          quantity: item.quantity,
                          unit: normalizeMealUnit(item.unit),
                          calories: item.calories,
                          protein_g: item.protein_g,
                          carbs_g: item.carbs_g,
                          fat_g: item.fat_g,
                          fiber_g: item.fiber_g,
                          notes: item.notes,
                        },
                      })
                      .then(() => toast.success("Item added"))
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to add item"))
                  }
                >
                  Add
                </Button>
              </div>
            ))}
            {(favoritesQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No favorites yet.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ClientPortalStepsView({ readOnly }: { readOnly: boolean }) {
  const [performedOn, setPerformedOn] = useState(todayIso());
  const [stepsInput, setStepsInput] = useState("");
  const [notes, setNotes] = useState("");
  const query = useClientPortalSteps(performedOn);
  const mutations = useClientPortalMutations(performedOn);

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Steps</Label>
              <Input
                type="number"
                min="0"
                value={stepsInput}
                onChange={(event) => setStepsInput(event.target.value)}
                placeholder={(query.data?.steps ?? "").toString() || "0"}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={query.data?.notes || ""}
            />
          </div>
          <Button
            disabled={readOnly || mutations.upsertSteps.isPending}
            onClick={() =>
              void withToastFeedback(
                mutations.upsertSteps.mutateAsync({
                  performed_on: performedOn,
                  steps: Number(stepsInput || query.data?.steps || 0),
                  notes: notes.trim() || null,
                }),
                {
                  loading: "Saving steps...",
                  success: "Steps saved",
                  error: "Unable to save steps",
                }
              ).catch(() => null)
            }
          >
            {mutations.upsertSteps.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Steps
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalNotesView() {
  const query = useClientPortalNotes();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Coach Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {query.isLoading && !query.data ? (
          <Skeleton className="h-24 w-full" />
        ) : query.data && query.data.length > 0 ? (
          query.data.map((note) => (
            <article key={note.id} className="rounded-md border px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{note.tag}</p>
              <h3 className="font-medium">{note.title || "Note"}</h3>
              <p className="text-sm text-muted-foreground">{note.content}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No notes visible yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientPortalCheckinsView({ readOnly }: { readOnly: boolean }) {
  const [urgent, setUrgent] = useState(false);
  const [notes, setNotes] = useState("");
  const query = useClientPortalCheckins();
  const mutations = useClientPortalMutations(todayIso());

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Submit Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="How are you feeling, and what should your coach know?"
            disabled={readOnly}
          />
          <Label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(event) => setUrgent(event.target.checked)}
              disabled={readOnly}
            />
            Mark as urgent
          </Label>
          <Button
            disabled={readOnly || mutations.createCheckin.isPending}
            onClick={() =>
              void mutations.createCheckin
                .mutateAsync({ urgent, notes: notes.trim() || null, checkin_data: {} })
                .then(() => {
                  toast.success("Check-in submitted");
                  setNotes("");
                  setUrgent(false);
                })
                .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to submit check-in"))
            }
          >
            {mutations.createCheckin.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Check-in
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(query.data || []).map((checkin) => (
            <div key={checkin.id} className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize">{checkin.status}</Badge>
                <p className="text-xs text-muted-foreground">
                  {new Date(checkin.submitted_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{checkin.notes || "No notes"}</p>
            </div>
          ))}
          {(query.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientPortalGoalsView({ readOnly }: { readOnly: boolean }) {
  const query = useClientPortalGoals();
  const mutations = useClientPortalMutations(todayIso());
  const [draftGoals, setDraftGoals] = useState("");

  return (
    <div className="space-y-3">
      {readOnly ? <ReadOnlyBanner /> : null}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={draftGoals || query.data?.goals || ""}
            onChange={(event) => setDraftGoals(event.target.value)}
            placeholder="Set your short and long term goals"
            disabled={readOnly}
          />
          <Button
            disabled={readOnly || mutations.updateGoals.isPending}
            onClick={() =>
              void withToastFeedback(mutations.updateGoals.mutateAsync({ goals: draftGoals || query.data?.goals || "" }), {
                loading: "Updating goals...",
                success: "Goals updated",
                error: "Unable to update goals",
              }).catch(() => null)
            }
          >
            {mutations.updateGoals.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Goals
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
