"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Copy, Edit, Loader2, MoreVertical, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import type { MealGroupListRow, MealGroupStatus } from "@/app/actions/meal-groups";
import {
  useNutritionGroupMutations,
  useNutritionMealGroups,
} from "@/hooks/use-nutrition-data";
import {
  useSetNutritionNavigationSource,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { AssignMealGroupDialog } from "@/components/nutrition/meal-groups/assign-meal-group-dialog";
import { MEAL_DAY_LABELS, MEAL_DAY_ORDER, MEAL_GROUP_STATUS_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/utils";

type StatusFilter = "all" | MealGroupStatus;

type GroupDraft = {
  id?: string;
  name: string;
  description: string;
  notes: string;
  start_date: string;
  end_date: string;
  status: MealGroupStatus;
};

const EMPTY_DRAFT: GroupDraft = {
  name: "",
  description: "",
  notes: "",
  start_date: "",
  end_date: "",
  status: "draft",
};

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

function DayTabsPreview() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MEAL_DAY_ORDER.map((day, index) => (
        <span
          key={day}
          className={cn(
            "segmented-tab h-8 min-w-10 px-2 py-1.5 text-[11px]",
            index === 0 ? "active" : undefined
          )}
        >
          {MEAL_DAY_LABELS[day].slice(0, 3).toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export function MealGroupsDashboard() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<GroupDraft>(EMPTY_DRAFT);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<MealGroupListRow | null>(null);
  const [actionTarget, setActionTarget] = useState<MealGroupListRow | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<MealGroupListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealGroupListRow | null>(null);

  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();

  const debouncedSearch = useDebounce(search, 250);
  const query = useNutritionMealGroups({
    page,
    pageSize: 12,
    status,
    search: debouncedSearch,
    includeSnapshots: false,
  });
  const mutations = useNutritionGroupMutations();

  useEffect(() => {
    setViewMode("groups");
    setNavigationSource("groups");
  }, [setNavigationSource, setViewMode]);

  const rows = useMemo(() => query.data?.rows || [], [query.data?.rows]);

  const openCreateDialog = () => {
    setDraft(EMPTY_DRAFT);
    setIsGroupDialogOpen(true);
  };

  const openEditDialog = (row: MealGroupListRow) => {
    setDraft({
      id: row.id,
      name: row.name,
      description: row.description || "",
      notes: row.notes || "",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      status: row.status,
    });
    setIsGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!draft.name.trim()) {
      toast.error("Group name is required.");
      return;
    }
    try {
      await mutations.upsertGroup.mutateAsync({
        id: draft.id,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        notes: draft.notes.trim() || null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        status: draft.status,
      });
      toast.success(draft.id ? "Meal group updated" : "Meal group created");
      setIsGroupDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal group");
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await mutations.deleteGroup.mutateAsync({ meal_group_id: groupId });
      toast.success("Meal group removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete meal group");
    }
  };

  const duplicateGroup = async (groupId: string) => {
    try {
      await mutations.duplicateGroup.mutateAsync({ meal_group_id: groupId });
      toast.success("Meal group duplicated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal group");
    }
  };

  const confirmDuplicateGroup = async () => {
    if (!duplicateTarget) return;
    await duplicateGroup(duplicateTarget.id);
    setDuplicateTarget(null);
  };

  const confirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    await deleteGroup(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="rounded-xl border-border/60 bg-muted/20 pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search meal groups"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as StatusFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20 sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button className="accent-strong rounded-xl px-3 sm:px-4" onClick={openCreateDialog} aria-label="New group">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline">New Group</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.isLoading && !query.data
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 w-full rounded-3xl" />)
          : null}

        {!query.isLoading && rows.length === 0 ? (
          <article className="glass-surface surface-pad md:col-span-2 xl:col-span-3">
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-medium">No meal groups found</p>
              <p className="max-w-lg text-sm text-muted-foreground">Create your first weekly template to assign nutrition structures quickly.</p>
              <Button className="accent-strong rounded-xl" onClick={openCreateDialog}>Create Meal Group</Button>
            </div>
          </article>
        ) : null}

        {rows.map((row) => (
          <article key={row.id} className="glass-surface surface-pad flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl font-semibold leading-tight">{row.name}</h3>
                <Badge className={cn("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusChipStyle(row.status))}>
                  {MEAL_GROUP_STATUS_LABELS[row.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{row.description || "7-day template structure"}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {formatDateRange(row.start_date, row.end_date)}
                </span>
                <span>{row.plans_count} day plans</span>
                <span>{row.assignment_count} assignments</span>
              </div>
            </div>

            <DayTabsPreview />

            <div className="glass-subtle p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Monday totals preview</p>
              <p className="mt-1 text-xl font-semibold">Template ready for edits</p>
              <p className="text-sm text-muted-foreground">Open group to manage meal items, notes, and assignment snapshots.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild className="flex-1 rounded-xl accent-strong">
                <Link href={`/nutrition/groups/${row.id}`}>Open</Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-border/60"
                aria-label={`More actions for ${row.name}`}
                onClick={() => setActionTarget(row)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </section>

      {query.data?.total ? (
        <section className="glass-subtle flex items-center justify-between p-3 text-sm">
          <span className="text-muted-foreground">Showing {rows.length} of {query.data.total}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl border-border/60" disabled={page === 0} onClick={() => setPage((previous) => Math.max(0, previous - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl border-border/60" disabled={!query.data.has_more} onClick={() => setPage((previous) => previous + 1)}>
              Next
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Meal Group" : "Create Meal Group"}</DialogTitle>
            <DialogDescription>Configure metadata, duration, status, and notes for this weekly template.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} className="rounded-xl border-border/60 bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={draft.description} onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))} className="rounded-xl border-border/60 bg-muted/20" />
            </div>
            <div className="space-y-2">
              <Label>Group Notes</Label>
              <Textarea value={draft.notes} onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))} className="min-h-20 rounded-xl border-border/60 bg-muted/20" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={draft.start_date} onChange={(event) => setDraft((previous) => ({ ...previous, start_date: event.target.value }))} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={draft.end_date} onChange={(event) => setDraft((previous) => ({ ...previous, end_date: event.target.value }))} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(value) => setDraft((previous) => ({ ...previous, status: value as MealGroupStatus }))}>
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
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setIsGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => void saveGroup()} disabled={mutations.upsertGroup.isPending}>
              {mutations.upsertGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(actionTarget)}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Group Actions</DialogTitle>
            <DialogDescription>{actionTarget?.name || "Meal group"}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-1">
            <Button
              variant="outline"
              className="justify-start rounded-xl border-border/60"
              onClick={() => {
                if (!actionTarget) return;
                openEditDialog(actionTarget);
                setActionTarget(null);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-xl border-border/60"
              onClick={() => {
                if (!actionTarget) return;
                setDuplicateTarget(actionTarget);
                setActionTarget(null);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              className="justify-start rounded-xl border-border/60"
              onClick={() => {
                if (!actionTarget) return;
                setAssignTarget(actionTarget);
                setActionTarget(null);
              }}
            >
              Assign
            </Button>
            <Button
              variant="destructive"
              className="justify-start rounded-xl"
              onClick={() => {
                if (!actionTarget) return;
                setDeleteTarget(actionTarget);
                setActionTarget(null);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(duplicateTarget)}
        onOpenChange={(open) => {
          if (!open) setDuplicateTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Meal Group?</DialogTitle>
            <DialogDescription>
              This will create a copy of {duplicateTarget?.name || "this meal group"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setDuplicateTarget(null)}>
              Cancel
            </Button>
            <Button className="accent-strong rounded-xl" onClick={() => void confirmDuplicateGroup()} disabled={mutations.duplicateGroup.isPending}>
              {mutations.duplicateGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Meal Group?</DialogTitle>
            <DialogDescription>
              This action cannot be undone for {deleteTarget?.name || "this meal group"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => void confirmDeleteGroup()} disabled={mutations.deleteGroup.isPending}>
              {mutations.deleteGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignTarget ? (
        <AssignMealGroupDialog
          mealGroupId={assignTarget.id}
          mealGroupName={assignTarget.name}
          open={Boolean(assignTarget)}
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null);
          }}
          defaultStartDate={assignTarget.start_date}
          defaultEndDate={assignTarget.end_date}
        />
      ) : null}
    </div>
  );
}
