"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  CalendarDays,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import type { ManualDiaryItem, ManualDiaryLog, MealType } from "@/app/actions/nutrition-manual";
import { useClientNutritionSummary7d, useFavoriteMealItems, useMealPlanTemplates, useNutritionDiary, useNutritionMutations, useRecentMealItems } from "@/hooks/use-nutrition-manual";
import type { NutritionSubject } from "@/lib/query-keys-nutrition";
import { cn } from "@/utils";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snacks", "other"];

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function progressWidth(progress: number | null) {
  if (progress === null || Number.isNaN(progress)) return "0%";
  const clamped = Math.max(0, Math.min(progress, 160));
  return `${clamped}%`;
}

function ProgressBar({ label, value, target, pct }: { label: string; value: number; target: number | null; pct: number | null }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {Math.round(value)}
          {target ? ` / ${Math.round(target)}` : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted">
        <div
          className={cn(
            "h-full rounded transition-all",
            pct !== null && pct > 110 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: progressWidth(pct) }}
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
  title = "Daily Nutrition Diary",
}: ManualNutritionDiaryProps) {
  const [performedOn, setPerformedOn] = useState(() => toDateInput(new Date()));
  const [sourceDate, setSourceDate] = useState(() => toDateInput(subDays(new Date(), 1)));
  const [copyMealTypes, setCopyMealTypes] = useState<MealType[]>([]);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [recentDialogOpen, setRecentDialogOpen] = useState(false);
  const [favoritesDialogOpen, setFavoritesDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const [selectedMealType, setSelectedMealType] = useState<MealType>("breakfast");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  const [quickCalories, setQuickCalories] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");
  const [quickFiber, setQuickFiber] = useState("");
  const [mealNotesDraft, setMealNotesDraft] = useState<Record<string, string>>({});

  const [planTemplateId, setPlanTemplateId] = useState("");

  const diaryQuery = useNutritionDiary(performedOn, subject, timezone);
  const recentQuery = useRecentMealItems(subject, 30);
  const favoritesQuery = useFavoriteMealItems(30);
  const templatesQuery = useMealPlanTemplates();
  const summaryQuery = useClientNutritionSummary7d(clientIdForSummary || "", performedOn);

  const mutations = useNutritionMutations(performedOn, subject);

  const favoriteMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const favorite of favoritesQuery.data || []) {
      map.set(`${favorite.item_name.toLowerCase()}::${favorite.unit || ""}`, true);
    }
    return map;
  }, [favoritesQuery.data]);

  const logsByMeal = useMemo(() => {
    const map = new Map<MealType, ManualDiaryLog>();
    for (const log of diaryQuery.data?.logs || []) {
      map.set(log.meal_type as MealType, log);
    }
    return map;
  }, [diaryQuery.data?.logs]);

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemName("");
    setQuantity("");
    setUnit("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setItemNotes("");
  };

  const openAddDialog = (mealType: MealType) => {
    resetItemForm();
    setSelectedMealType(mealType);
    setItemDialogOpen(true);
  };

  const openQuickDialog = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setQuickCalories("");
    setQuickProtein("");
    setQuickCarbs("");
    setQuickFat("");
    setQuickFiber("");
    setQuickDialogOpen(true);
  };

  const onSaveItem = async () => {
    if (!itemName.trim()) {
      toast.error("Item name is required.");
      return;
    }

    try {
      if (editingItemId) {
        await mutations.updateItem.mutateAsync({
          item_id: editingItemId,
          item: {
            item_name: itemName.trim(),
            quantity: quantity ? Number(quantity) : null,
            unit: unit.trim() || null,
            calories: calories ? Number(calories) : null,
            protein_g: protein ? Number(protein) : null,
            carbs_g: carbs ? Number(carbs) : null,
            fat_g: fat ? Number(fat) : null,
            fiber_g: fiber ? Number(fiber) : null,
            notes: itemNotes.trim() || null,
          },
        });
      } else {
        await mutations.addItem.mutateAsync({
          performed_on: performedOn,
          meal_type: selectedMealType,
          timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          subject,
          item: {
            item_name: itemName.trim(),
            quantity: quantity ? Number(quantity) : null,
            unit: unit.trim() || null,
            calories: calories ? Number(calories) : null,
            protein_g: protein ? Number(protein) : null,
            carbs_g: carbs ? Number(carbs) : null,
            fat_g: fat ? Number(fat) : null,
            fiber_g: fiber ? Number(fiber) : null,
            notes: itemNotes.trim() || null,
            is_quick_add: false,
          },
        });
      }

      toast.success(editingItemId ? "Meal item updated" : "Meal item added");
      setItemDialogOpen(false);
      resetItemForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal item");
    }
  };

  const onSaveQuickItem = async () => {
    if (!quickCalories && !quickProtein && !quickCarbs && !quickFat && !quickFiber) {
      toast.error("Enter at least one nutrition value.");
      return;
    }

    try {
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: selectedMealType,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        subject,
        item: {
          item_name: "Quick Add",
          calories: quickCalories ? Number(quickCalories) : null,
          protein_g: quickProtein ? Number(quickProtein) : null,
          carbs_g: quickCarbs ? Number(quickCarbs) : null,
          fat_g: quickFat ? Number(quickFat) : null,
          fiber_g: quickFiber ? Number(quickFiber) : null,
          is_quick_add: true,
        },
      });
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

  const onEditItem = (mealType: MealType, item: ManualDiaryItem) => {
    setSelectedMealType(mealType);
    setEditingItemId(item.id);
    setItemName(item.item_name || "");
    setQuantity(item.quantity?.toString() || "");
    setUnit(item.unit || "");
    setCalories(item.calories?.toString() || "");
    setProtein(item.protein_g?.toString() || "");
    setCarbs(item.carbs_g?.toString() || "");
    setFat(item.fat_g?.toString() || "");
    setFiber(item.fiber_g?.toString() || "");
    setItemNotes(item.notes || "");
    setItemDialogOpen(true);
  };

  const onCopyMeals = async () => {
    try {
      await mutations.copyFromDate.mutateAsync({
        source_date: sourceDate,
        target_date: performedOn,
        meal_types: copyMealTypes.length > 0 ? copyMealTypes : undefined,
        subject,
      });
      toast.success("Meals copied successfully");
      setCopyDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to copy meals");
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
      const result = await mutations.toggleFavorite.mutateAsync({ item });
      toast.success(result.favorited ? "Added to favorites" : "Removed from favorites");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to toggle favorite");
    }
  };

  const addPresetItemToMeal = async (
    mealType: MealType,
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
      await mutations.addItem.mutateAsync({
        performed_on: performedOn,
        meal_type: mealType,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        subject,
        item: {
          ...item,
          is_quick_add: false,
        },
      });
      toast.success("Item added to diary");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add item");
    }
  };

  const assignTemplateToClient = async () => {
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
      toast.success("Meal plan assigned to client");
      setPlanTemplateId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to assign plan");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">Manual logging by meal type using performed date.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!subject?.subject_client_id ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/nutrition/plans">Manage Plans</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/nutrition/meal-groups">Meal Groups</Link>
                </Button>
              </>
            ) : null}
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="w-[170px] pl-9"
                value={performedOn}
                onChange={(event) => setPerformedOn(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy from date
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSourceDate(toDateInput(subDays(new Date(performedOn), 1)));
                setCopyMealTypes([]);
                setCopyDialogOpen(true);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Copy yesterday
            </Button>
            <Button variant="outline" onClick={() => setRecentDialogOpen(true)}>
              Recent
            </Button>
            <Button variant="outline" onClick={() => setFavoritesDialogOpen(true)}>
              Favorites
            </Button>
          </div>
        </div>

        {showAssignmentTools && subject?.subject_client_id ? (
          <div className="grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Assign Meal Plan Template</Label>
              <Select value={planTemplateId} onValueChange={setPlanTemplateId}>
                <SelectTrigger>
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
            <Button onClick={() => void assignTemplateToClient()} disabled={mutations.assignPlan.isPending}>
              {mutations.assignPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Plan
            </Button>
          </div>
        ) : null}

        {showAssignmentTools && subject?.subject_client_id ? (
          <Card className="border-border/60 bg-background/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Last 7 Days Adherence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {summaryQuery.isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : (
                <>
                  <div className="rounded-md border border-border/60 p-2">
                    <p className="text-xs text-muted-foreground">Days Logged</p>
                    <p className="text-lg font-semibold">{summaryQuery.data?.days_logged_count ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 p-2">
                    <p className="text-xs text-muted-foreground">Avg Calories</p>
                    <p className="text-lg font-semibold">{summaryQuery.data?.average_calories ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 p-2">
                    <p className="text-xs text-muted-foreground">On Target</p>
                    <p className="text-lg font-semibold text-emerald-600">{summaryQuery.data?.on_target_count ?? 0}</p>
                  </div>
                  <div className="rounded-md border border-border/60 p-2">
                    <p className="text-xs text-muted-foreground">Off Target</p>
                    <p className="text-lg font-semibold text-amber-600">{summaryQuery.data?.off_target_count ?? 0}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {diaryQuery.isLoading && !diaryQuery.data ? (
        <section className="native-surface surface-pad space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </section>
      ) : null}

      {diaryQuery.data ? (
        <>
          {diaryQuery.data.active_plan ? (
            <section className="native-surface surface-pad space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Active Plan: {diaryQuery.data.active_plan.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {diaryQuery.data.active_plan.start_date} to {diaryQuery.data.active_plan.end_date}
                  </p>
                </div>
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
          ) : (
            <section className="native-surface surface-pad">
              <h2 className="text-sm font-semibold">No active plan for this day</h2>
              <p className="text-xs text-muted-foreground">Totals are shown without target comparison.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-md border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Calories</p>
                  <p className="font-semibold">{Math.round(diaryQuery.data.totals.calories)}</p>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Protein</p>
                  <p className="font-semibold">{Math.round(diaryQuery.data.totals.protein_g)} g</p>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Carbs</p>
                  <p className="font-semibold">{Math.round(diaryQuery.data.totals.carbs_g)} g</p>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Fat</p>
                  <p className="font-semibold">{Math.round(diaryQuery.data.totals.fat_g)} g</p>
                </div>
                <div className="rounded-md border border-border/60 p-2">
                  <p className="text-xs text-muted-foreground">Fiber</p>
                  <p className="font-semibold">{Math.round(diaryQuery.data.totals.fiber_g)} g</p>
                </div>
              </div>
            </section>
          )}

          {MEAL_TYPES.map((mealType) => {
            const log = logsByMeal.get(mealType);
            const items = log?.items || [];
            return (
              <section key={mealType} className="native-surface surface-pad space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold capitalize">{mealType}</h3>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(Number(log?.total_calories || 0))} kcal • {Math.round(Number(log?.total_protein_g || 0))}P • {Math.round(Number(log?.total_carbs_g || 0))}C • {Math.round(Number(log?.total_fat_g || 0))}F
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openQuickDialog(mealType)}>
                      Quick Add
                    </Button>
                    <Button size="sm" onClick={() => openAddDialog(mealType)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    No items logged for {mealType} on {performedOn}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="hidden sm:table-cell">Qty</TableHead>
                          <TableHead>Calories</TableHead>
                          <TableHead className="hidden md:table-cell">P/C/F</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const favoriteKey = `${item.item_name.toLowerCase()}::${item.unit || ""}`;
                          const isFavorite = favoriteMap.has(favoriteKey);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <p className="font-medium">{item.item_name}</p>
                                {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {item.quantity ?? "-"} {item.unit || ""}
                              </TableCell>
                              <TableCell>{Math.round(Number(item.calories || 0))}</TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                {Math.round(Number(item.protein_g || 0))}/
                                {Math.round(Number(item.carbs_g || 0))}/
                                {Math.round(Number(item.fat_g || 0))}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
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
                                    <Star className={cn("h-4 w-4", isFavorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditItem(mealType, item)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => void onDeleteItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={`notes-${mealType}`} className="text-xs text-muted-foreground">
                    Meal notes
                  </Label>
                  <Textarea
                    id={`notes-${mealType}`}
                    value={log ? mealNotesDraft[log.id] ?? log.notes ?? "" : ""}
                    placeholder="Optional notes for this meal section"
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
                        disabled={mutations.saveNotes.isPending}
                        onClick={() =>
                          void mutations.saveNotes
                            .mutateAsync({ meal_log_id: log.id, notes: (mealNotesDraft[log.id] ?? log.notes) || null })
                            .then(() => {
                              toast.success("Meal notes saved");
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
                        Save notes
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </>
      ) : null}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit Meal Item" : "Add Meal Item"}</DialogTitle>
            <DialogDescription className="capitalize">Meal type: {selectedMealType}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Item name</Label>
              <Input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. Greek Yogurt" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="g, ml, serving" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="grid gap-2">
                <Label>Cal</Label>
                <Input type="number" min="0" value={calories} onChange={(event) => setCalories(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>P</Label>
                <Input type="number" min="0" value={protein} onChange={(event) => setProtein(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>C</Label>
                <Input type="number" min="0" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>F</Label>
                <Input type="number" min="0" value={fat} onChange={(event) => setFat(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Fiber</Label>
                <Input type="number" min="0" value={fiber} onChange={(event) => setFiber(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSaveItem()} disabled={mutations.addItem.isPending || mutations.updateItem.isPending}>
              {mutations.addItem.isPending || mutations.updateItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quickDialogOpen} onOpenChange={setQuickDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Add</DialogTitle>
            <DialogDescription>Log macros/calories without a named food item.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5 py-2">
            <div className="grid gap-2">
              <Label>Cal</Label>
              <Input type="number" min="0" value={quickCalories} onChange={(event) => setQuickCalories(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>P</Label>
              <Input type="number" min="0" value={quickProtein} onChange={(event) => setQuickProtein(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>C</Label>
              <Input type="number" min="0" value={quickCarbs} onChange={(event) => setQuickCarbs(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>F</Label>
              <Input type="number" min="0" value={quickFat} onChange={(event) => setQuickFat(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fiber</Label>
              <Input type="number" min="0" value={quickFiber} onChange={(event) => setQuickFiber(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSaveQuickItem()} disabled={mutations.addItem.isPending}>
              {mutations.addItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recentDialogOpen} onOpenChange={setRecentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recent Items</DialogTitle>
            <DialogDescription>Reuse recently logged items in one tap.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Target meal</Label>
              <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((mealType) => (
                    <SelectItem key={mealType} value={mealType} className="capitalize">
                      {mealType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[340px] overflow-auto rounded-md border border-border/60">
              {(recentQuery.data || []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No recent items yet.</p>
              ) : (
                <div className="divide-y">
                  {(recentQuery.data || []).map((item, index) => (
                    <div key={`${item.item_name}-${index}`} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(Number(item.calories || 0))} kcal • {Math.round(Number(item.protein_g || 0))}P • {Math.round(Number(item.carbs_g || 0))}C • {Math.round(Number(item.fat_g || 0))}F
                        </p>
                      </div>
                      <Button size="sm" onClick={() => void addPresetItemToMeal(selectedMealType, item)}>
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

      <Dialog open={favoritesDialogOpen} onOpenChange={setFavoritesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Favorites</DialogTitle>
            <DialogDescription>Quick access to your saved meal item templates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Target meal</Label>
              <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((mealType) => (
                    <SelectItem key={mealType} value={mealType} className="capitalize">
                      {mealType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[340px] overflow-auto rounded-md border border-border/60">
              {(favoritesQuery.data || []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No favorites yet.</p>
              ) : (
                <div className="divide-y">
                  {(favoritesQuery.data || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(Number(item.calories || 0))} kcal • {Math.round(Number(item.protein_g || 0))}P • {Math.round(Number(item.carbs_g || 0))}C • {Math.round(Number(item.fat_g || 0))}F
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          void addPresetItemToMeal(selectedMealType, {
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

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Meals</DialogTitle>
            <DialogDescription>Copy selected meal sections from a previous day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Source date</Label>
              <Input type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meal sections (leave empty to copy all)</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((mealType) => {
                  const active = copyMealTypes.includes(mealType);
                  return (
                    <Button
                      key={mealType}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="capitalize"
                      onClick={() => {
                        setCopyMealTypes((previous) =>
                          previous.includes(mealType)
                            ? previous.filter((value) => value !== mealType)
                            : [...previous, mealType]
                        );
                      }}
                    >
                      {mealType}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCopyMeals()} disabled={mutations.copyFromDate.isPending}>
              {mutations.copyFromDate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
