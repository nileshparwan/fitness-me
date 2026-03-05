"use client";

import { useMemo, useState } from "react";
import { Copy, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useNutritionMutations, useNutritionPlans } from "@/hooks/use-nutrition-manual";
import type { NutritionSubject } from "@/lib/query-keys-nutrition";

const PLAN_STATUSES = ["all", "draft", "active", "archived"] as const;

type PlanStatusFilter = (typeof PLAN_STATUSES)[number];

type ManualMealPlansManagerProps = {
  subject?: NutritionSubject;
  title?: string;
};

type PlanDraft = {
  id?: string;
  name: string;
  description: string;
  notes: string;
  start_date: string;
  end_date: string;
  timezone: string;
  status: "draft" | "active" | "archived";
  daily_calorie_target: string;
  daily_protein_target_g: string;
  daily_carbs_target_g: string;
  daily_fat_target_g: string;
  meal_targets: Record<string, string>;
};

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  description: "",
  notes: "",
  start_date: "",
  end_date: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  status: "draft",
  daily_calorie_target: "",
  daily_protein_target_g: "",
  daily_carbs_target_g: "",
  daily_fat_target_g: "",
  meal_targets: {
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
    other: "",
  },
};

export function ManualMealPlansManager({ subject, title = "Meal Plans" }: ManualMealPlansManagerProps) {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<PlanStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);

  const debouncedSearch = useDebounce(search, 250);

  const plansQuery = useNutritionPlans({
    page,
    pageSize: 12,
    status,
    search: debouncedSearch,
    subject,
  });

  const mutations = useNutritionMutations(new Date().toISOString().slice(0, 10), subject);

  const rows = useMemo(() => plansQuery.data?.rows || [], [plansQuery.data?.rows]);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
    setIsDialogOpen(true);
  };

  const openEdit = (row: (typeof rows)[number]) => {
    const mealTargets = (row.meal_targets_json || {}) as Record<string, unknown>;
    setDraft({
      id: row.id,
      name: row.name,
      description: row.description || "",
      notes: row.notes || "",
      start_date: row.start_date,
      end_date: row.end_date,
      timezone: row.timezone || "UTC",
      status: (row.status as "draft" | "active" | "archived") || "draft",
      daily_calorie_target: row.daily_calorie_target?.toString() || "",
      daily_protein_target_g: row.daily_protein_target_g?.toString() || "",
      daily_carbs_target_g: row.daily_carbs_target_g?.toString() || "",
      daily_fat_target_g: row.daily_fat_target_g?.toString() || "",
      meal_targets: {
        breakfast: typeof mealTargets.breakfast === "number" ? String(mealTargets.breakfast) : "",
        lunch: typeof mealTargets.lunch === "number" ? String(mealTargets.lunch) : "",
        dinner: typeof mealTargets.dinner === "number" ? String(mealTargets.dinner) : "",
        snacks: typeof mealTargets.snacks === "number" ? String(mealTargets.snacks) : "",
        other: typeof mealTargets.other === "number" ? String(mealTargets.other) : "",
      },
    });
    setIsDialogOpen(true);
  };

  const savePlan = async () => {
    if (!draft.name.trim()) {
      toast.error("Plan name is required.");
      return;
    }
    if (!draft.start_date || !draft.end_date) {
      toast.error("Start and end dates are required.");
      return;
    }

    try {
      const mealTargetsJson = Object.entries(draft.meal_targets).reduce<Record<string, number>>((acc, [key, value]) => {
        if (!value) return acc;
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= 0) acc[key] = parsed;
        return acc;
      }, {});

      await mutations.upsertPlan.mutateAsync({
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        notes: draft.notes.trim() || null,
        start_date: draft.start_date,
        end_date: draft.end_date,
        timezone: draft.timezone,
        status: draft.status,
        is_public: false,
        subject,
        targets: {
          daily_calorie_target: draft.daily_calorie_target ? Number(draft.daily_calorie_target) : null,
          daily_protein_target_g: draft.daily_protein_target_g ? Number(draft.daily_protein_target_g) : null,
          daily_carbs_target_g: draft.daily_carbs_target_g ? Number(draft.daily_carbs_target_g) : null,
          daily_fat_target_g: draft.daily_fat_target_g ? Number(draft.daily_fat_target_g) : null,
          meal_targets_json: mealTargetsJson,
        },
      });

      toast.success(draft.id ? "Meal plan updated" : "Meal plan created");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal plan");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">Manage draft, active, and archived plans with date-range overlap protection.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{draft.id ? "Edit Meal Plan" : "Create Meal Plan"}</DialogTitle>
              <DialogDescription>Manual targets and date range for this subject.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={draft.description}
                  onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={draft.notes} onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={draft.start_date}
                    onChange={(event) => setDraft((previous) => ({ ...previous, start_date: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>End date</Label>
                  <Input type="date" value={draft.end_date} onChange={(event) => setDraft((previous) => ({ ...previous, end_date: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={draft.status} onValueChange={(value) => setDraft((previous) => ({ ...previous, status: value as PlanDraft["status"] }))}>
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
                  <Label>Timezone</Label>
                  <Input value={draft.timezone} onChange={(event) => setDraft((previous) => ({ ...previous, timezone: event.target.value }))} />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-4">
                <div className="grid gap-2">
                  <Label>Daily Calories</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.daily_calorie_target}
                    onChange={(event) => setDraft((previous) => ({ ...previous, daily_calorie_target: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.daily_protein_target_g}
                    onChange={(event) => setDraft((previous) => ({ ...previous, daily_protein_target_g: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.daily_carbs_target_g}
                    onChange={(event) => setDraft((previous) => ({ ...previous, daily_carbs_target_g: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fat (g)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.daily_fat_target_g}
                    onChange={(event) => setDraft((previous) => ({ ...previous, daily_fat_target_g: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Per-meal calorie targets (optional)</Label>
                <div className="grid gap-2 md:grid-cols-5">
                  {Object.keys(draft.meal_targets).map((mealType) => (
                    <div key={mealType} className="grid gap-1">
                      <Label className="text-xs capitalize text-muted-foreground">{mealType}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={draft.meal_targets[mealType] || ""}
                        onChange={(event) =>
                          setDraft((previous) => ({
                            ...previous,
                            meal_targets: {
                              ...previous.meal_targets,
                              [mealType]: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void savePlan()} disabled={mutations.upsertPlan.isPending}>
                {mutations.upsertPlan.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="native-surface surface-pad flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search meal plans"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as PlanStatusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="native-surface surface-pad">
        {plansQuery.isLoading && !plansQuery.data ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No meal plans found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date range</TableHead>
                    <TableHead>Daily target</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium">{row.name}</p>
                        {row.description ? <p className="text-xs text-muted-foreground">{row.description}</p> : null}
                      </TableCell>
                      <TableCell className="capitalize">{row.status}</TableCell>
                      <TableCell>
                        {row.start_date} to {row.end_date}
                      </TableCell>
                      <TableCell>{row.daily_calorie_target || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void mutations.duplicatePlan
                                .mutateAsync({ plan_id: row.id })
                                .then(() => toast.success("Meal plan duplicated"))
                                .catch((error) =>
                                  toast.error(error instanceof Error ? error.message : "Unable to duplicate plan")
                                )
                            }
                            disabled={mutations.duplicatePlan.isPending}
                          >
                            <Copy className="mr-1.5 h-4 w-4" />
                            Duplicate
                          </Button>
                          {row.status !== "archived" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void mutations.archivePlan
                                  .mutateAsync({ plan_id: row.id })
                                  .then(() => toast.success("Meal plan archived"))
                                  .catch((error) =>
                                    toast.error(error instanceof Error ? error.message : "Unable to archive plan")
                                  )
                              }
                              disabled={mutations.archivePlan.isPending}
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((previous) => Math.max(previous - 1, 0))}>
                Previous
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {page + 1} • {plansQuery.data?.total ?? 0} total
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={!plansQuery.data?.has_more}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
