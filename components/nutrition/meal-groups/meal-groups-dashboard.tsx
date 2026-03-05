"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CalendarRange, Copy, Edit, Loader2, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import type { MealGroupStatus, MealGroupListRow } from "@/app/actions/meal-groups";
import { AssignMealGroupDialog } from "@/components/nutrition/meal-groups/assign-meal-group-dialog";
import { MEAL_GROUP_STATUS_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useMealGroupMutations, useMealGroups } from "@/hooks/use-meal-groups";

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

function statusVariant(status: MealGroupStatus): "secondary" | "default" | "outline" {
  if (status === "active") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}

export function MealGroupsDashboard() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<GroupDraft>(EMPTY_DRAFT);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<MealGroupListRow | null>(null);

  const debouncedSearch = useDebounce(search, 250);
  const query = useMealGroups({
    page,
    pageSize: 12,
    status,
    search: debouncedSearch,
    includeSnapshots: false,
  });
  const mutations = useMealGroupMutations();

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
      toast.success(draft.id ? "Meal group updated." : "Meal group created.");
      setIsGroupDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save meal group.");
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await mutations.deleteGroup.mutateAsync({ meal_group_id: groupId });
      toast.success("Meal group removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete meal group.");
    }
  };

  const duplicateGroup = async (groupId: string) => {
    try {
      await mutations.duplicateGroup.mutateAsync({ meal_group_id: groupId });
      toast.success("Meal group duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate meal group.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Meal Groups</h1>
          <p className="text-sm text-muted-foreground">
            Build 7-day manual meal structures, then assign snapshot copies to users or clients.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Meal Group
        </Button>
      </section>

      <section className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search meal groups"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full md:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.isLoading && !query.data
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)
          : null}

        {!query.isLoading && rows.length === 0 ? (
          <Card className="native-surface md:col-span-2 xl:col-span-3">
            <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No meal groups found.</p>
              <p className="text-sm text-muted-foreground">Create your first 7-day structure to start assigning meal plans.</p>
              <Button onClick={openCreateDialog}>Create Meal Group</Button>
            </CardContent>
          </Card>
        ) : null}

        {rows.map((row) => (
          <Card key={row.id} className="native-surface">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-2 text-base">{row.name}</CardTitle>
                <Badge variant={statusVariant(row.status)}>{MEAL_GROUP_STATUS_LABELS[row.status]}</Badge>
              </div>
              <CardDescription className="line-clamp-2">{row.description || "No description provided."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  <span>{formatDateRange(row.start_date, row.end_date)}</span>
                </div>
                <div className="flex gap-4">
                  <span>{row.plans_count} day plans</span>
                  <span>{row.assignment_count} assignments</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/nutrition/meal-groups/${row.id}`}>View</Link>
                </Button>
                <Button variant="outline" onClick={() => openEditDialog(row)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => void duplicateGroup(row.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button variant="outline" onClick={() => setAssignTarget(row)}>
                  Assign
                </Button>
                <Button className="col-span-2" variant="destructive" onClick={() => void deleteGroup(row.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {query.data?.total ? (
        <section className="flex items-center justify-between rounded-xl border p-3 text-sm">
          <span className="text-muted-foreground">
            Showing {rows.length} of {query.data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((previous) => Math.max(0, previous - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!query.data.has_more}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Next
            </Button>
          </div>
        </section>
      ) : null}

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Meal Group" : "Create Meal Group"}</DialogTitle>
            <DialogDescription>Configure your 7-day template metadata and lifecycle status.</DialogDescription>
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
              <Label>Group Notes</Label>
              <Textarea value={draft.notes} onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={draft.start_date} onChange={(event) => setDraft((previous) => ({ ...previous, start_date: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={draft.end_date} onChange={(event) => setDraft((previous) => ({ ...previous, end_date: event.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(value) => setDraft((previous) => ({ ...previous, status: value as MealGroupStatus }))}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveGroup()} disabled={mutations.upsertGroup.isPending}>
              {mutations.upsertGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
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

