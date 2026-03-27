"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useClientDetail, useClientNotes } from "@/hooks/use-coach-tools";
import { useCoachClientPortalMutations, useCoachClientPortalSettings } from "@/hooks/use-client-portal";
import { useNutritionMealGroup, useNutritionMealGroupAssignments } from "@/hooks/use-nutrition-data";
import {
  useSetNutritionActiveSubject,
  useSetNutritionNavigationSource,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { MEAL_DAY_LABELS, MEAL_DAY_ORDER } from "@/components/nutrition/meal-groups/meal-group-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/app-sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/types/database";
import { cn } from "@/utils";

type DayOfWeek = (typeof MEAL_DAY_ORDER)[number];
type MealRow = Database["public"]["Tables"]["meal_group_items"]["Row"];

function accessBannerTone(accessLevel: "disabled" | "read_only" | "enabled") {
  if (accessLevel === "disabled") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (accessLevel === "read_only") return "border-chart-3/40 bg-chart-3/10 text-chart-3";
  return "border-chart-2/40 bg-chart-2/10 text-chart-2";
}

function dateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
}

function badgeColorForTag(tag: string) {
  if (tag === "injury") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (tag === "nutrition") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (tag === "milestone") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-chart-5/40 bg-chart-5/10 text-chart-5";
}

export function ClientNutritionWorkspace({ clientId }: { clientId: string }) {
  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();
  const setActiveSubject = useSetNutritionActiveSubject();

  const clientQuery = useClientDetail(clientId);
  const assignmentsQuery = useNutritionMealGroupAssignments({
    status: "active",
    subject: { subject_client_id: clientId },
  });
  const settingsQuery = useCoachClientPortalSettings(clientId);
  const notesQuery = useClientNotes(clientId);
  const portalMutations = useCoachClientPortalMutations(clientId);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("mon");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteVisibility, setNoteVisibility] = useState<"private" | "visible_to_client">("private");
  const [noteContent, setNoteContent] = useState("");
  const [notesPage, setNotesPage] = useState(0);

  useEffect(() => {
    setViewMode("diary");
    setNavigationSource("client-workspace");
    setActiveSubject("client", clientId);
  }, [clientId, setActiveSubject, setNavigationSource, setViewMode]);

  useEffect(() => {
    if (!assignmentsQuery.data?.length) {
      setSelectedAssignmentId("");
      return;
    }

    if (!selectedAssignmentId || !assignmentsQuery.data.some((row) => row.id === selectedAssignmentId)) {
      setSelectedAssignmentId(assignmentsQuery.data[0].id);
    }
  }, [assignmentsQuery.data, selectedAssignmentId]);

  const selectedAssignment = useMemo(
    () => assignmentsQuery.data?.find((row) => row.id === selectedAssignmentId) || null,
    [assignmentsQuery.data, selectedAssignmentId]
  );

  const assignedGroupId = selectedAssignment?.meal_group_id || "";
  const groupDetailQuery = useNutritionMealGroup(assignedGroupId);

  const dayPlansByKey = useMemo(
    () => new Map((groupDetailQuery.data?.plans ?? []).map((plan) => [plan.day_of_week, plan])),
    [groupDetailQuery.data?.plans]
  );
  const selectedDayPlan = dayPlansByKey.get(selectedDay) || null;

  const moduleAccess = useMemo(() => {
    const rows = settingsQuery.data?.module_access || [];
    return rows.find((row) => row.module_key === "meal_logging")?.access_level || "enabled";
  }, [settingsQuery.data?.module_access]);

  const nutritionNotes = useMemo(() => {
    return (notesQuery.data || []).filter((note) => note.tag === "nutrition");
  }, [notesQuery.data]);

  const pagedNotes = useMemo(() => {
    const start = notesPage * 3;
    return nutritionNotes.slice(start, start + 3);
  }, [notesPage, nutritionNotes]);

  const notesMaxPage = Math.max(0, Math.ceil(nutritionNotes.length / 3) - 1);

  const mealRows = useMemo(() => {
    if (!selectedDayPlan) return [] as MealRow[];
    return [...selectedDayPlan.items].sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [selectedDayPlan]);

  const loading = (clientQuery.isLoading && !clientQuery.data) || (assignmentsQuery.isLoading && !assignmentsQuery.data);

  const onSaveNutritionNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Note content is required.");
      return;
    }

    try {
      await portalMutations.createNote.mutateAsync({
        client_id: clientId,
        tag: "nutrition",
        content: noteContent.trim(),
        visibility: noteVisibility,
      });
      setNoteOpen(false);
      setNoteContent("");
      setNoteVisibility("private");
      toast.success("Nutrition note saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save nutrition note");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <Skeleton className="h-28 w-full rounded-[10px]" />
        <Skeleton className="h-24 w-full rounded-[10px]" />
        <Skeleton className="h-72 w-full rounded-[10px]" />
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data?.client) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {clientQuery.error instanceof Error ? clientQuery.error.message : "Unable to load nutrition hub"}
      </div>
    );
  }

  const client = clientQuery.data.client;
  const clientName = client.display_name || `${client.first_name} ${client.last_name || ""}`.trim() || "Client";

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-2">
        <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {clientName}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nutrition Hub</h1>
            <p className="text-sm text-muted-foreground">Manage meal plans and logging</p>
          </div>

          <Button asChild className="accent-strong rounded-xl text-black">
            <Link href="/nutrition/diary">
              <Plus className="mr-2 h-4 w-4" />
              Log Meal
            </Link>
          </Button>
        </div>
      </section>

      <section className={cn("rounded-[10px] border px-4 py-3 text-sm", accessBannerTone(moduleAccess))}>
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          Meal logging is {moduleAccess === "read_only" ? "read-only" : moduleAccess === "disabled" ? "disabled" : "enabled"} for this client
        </div>
        <p className="mt-1 text-xs text-current/90">
          {moduleAccess === "disabled"
            ? "Enable module permissions in Access settings to allow meal logging."
            : moduleAccess === "read_only"
              ? "Client can view meals but cannot create new entries."
              : "Client can log meals according to current module permissions."}
        </p>
      </section>

      <section className="glass-surface rounded-[10px] border border-border/60 p-4">
        {assignmentsQuery.isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (assignmentsQuery.data?.length || 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No active nutrition assignment for this client.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Active Meal Plan</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                    <SelectValue placeholder="Select active assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {(assignmentsQuery.data || []).map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {dateLabel(assignment.start_date)}{assignment.end_date ? ` — ${dateLabel(assignment.end_date)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssignment ? (
                <span className="w-fit rounded-full border border-chart-2/40 bg-chart-2/10 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-chart-2">
                  {selectedAssignment.status}
                </span>
              ) : null}
            </div>

            {groupDetailQuery.data?.group ? (
              <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                <p className="text-sm font-medium">{groupDetailQuery.data.group.name}</p>
                <p className="text-xs text-muted-foreground">{groupDetailQuery.data.group.start_date || ""}{groupDetailQuery.data.group.end_date ? ` — ${groupDetailQuery.data.group.end_date}` : ""}</p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {MEAL_DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm transition-colors",
                selectedDay === day
                  ? "border-chart-1/50 bg-chart-1/15 text-chart-1"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {MEAL_DAY_LABELS[day].slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="glass-surface rounded-[10px] border border-border/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Calories</p>
            <p className="mt-1 text-2xl font-semibold">{selectedDayPlan?.totals.calories || 0}</p>
            <p className="text-xs text-muted-foreground">/ 2200 kcal</p>
          </div>
          <div className="glass-surface rounded-[10px] border border-border/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Protein</p>
            <p className="mt-1 text-2xl font-semibold">{selectedDayPlan?.totals.protein_g || 0}</p>
            <p className="text-xs text-muted-foreground">/ 160g</p>
          </div>
          <div className="glass-surface rounded-[10px] border border-border/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Carbs</p>
            <p className="mt-1 text-2xl font-semibold">{selectedDayPlan?.totals.carbs_g || 0}</p>
            <p className="text-xs text-muted-foreground">/ 240g</p>
          </div>
          <div className="glass-surface rounded-[10px] border border-border/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Fat</p>
            <p className="mt-1 text-2xl font-semibold">{selectedDayPlan?.totals.fat_g || 0}</p>
            <p className="text-xs text-muted-foreground">/ 65g</p>
          </div>
        </div>

        {mealRows.length === 0 ? (
          <div className="glass-surface rounded-[10px] border border-border/60 px-4 py-16 text-center">
            <p className="text-lg font-medium">No meals planned</p>
            <p className="mt-1 text-sm text-muted-foreground">No meals added for {MEAL_DAY_LABELS[selectedDay]} yet.</p>
            <Button asChild className="accent-strong mt-4 rounded-xl text-black">
              <Link href="/nutrition/diary">
                <Plus className="mr-2 h-4 w-4" />
                Add Meal
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {mealRows.map((item) => (
              <article key={item.id} className="glass-surface rounded-[10px] border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.type.replaceAll("_", " ")}</p>
                    <p className="text-lg font-medium">{item.title || "Meal item"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">P {item.protein_g}g • C {item.carbs_g}g • F {item.fat_g}g</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{item.calories}</p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass-surface rounded-[10px] border border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Nutrition Notes</h2>
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-border/60">
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Nutrition Note</DialogTitle>
                <DialogDescription>Save a note related to meal planning or compliance.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={noteVisibility} onValueChange={(value) => setNoteVisibility(value as "private" | "visible_to_client")}>
                    <SelectTrigger className="rounded-xl border-border/60 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="visible_to_client">Visible to client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} rows={5} className="rounded-xl border-border/60 bg-muted/20" placeholder="Write a nutrition note..." />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setNoteOpen(false)}>Cancel</Button>
                <Button className="accent-strong rounded-xl text-black" onClick={() => void onSaveNutritionNote()} disabled={portalMutations.createNote.isPending}>
                  {portalMutations.createNote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {notesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : pagedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nutrition notes yet.</p>
        ) : (
          <div className="space-y-2">
            {pagedNotes.map((note) => (
              <article key={note.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{dateLabel(note.created_at.slice(0, 10))}</p>
                  <Badge className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", badgeColorForTag(note.tag))}>
                    {note.tag}
                  </Badge>
                </div>
                <p className="text-sm">{note.content}</p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {nutritionNotes.length === 0
              ? "0 of 0"
              : `${notesPage * 3 + 1}-${Math.min(notesPage * 3 + 3, nutritionNotes.length)} of ${nutritionNotes.length}`}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl border-border/60" onClick={() => setNotesPage((page) => Math.max(0, page - 1))} disabled={notesPage === 0}>
              Prev
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl border-border/60" onClick={() => setNotesPage((page) => Math.min(notesMaxPage, page + 1))} disabled={notesPage >= notesMaxPage}>
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
