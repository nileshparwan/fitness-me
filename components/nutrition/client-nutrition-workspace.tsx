"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Lock } from "lucide-react";

import { listClientDetailAction } from "@/app/actions/coach-tools";
import {
  useNutritionMealGroup,
  useNutritionMealGroupAssignments,
} from "@/hooks/use-nutrition-data";
import {
  useSetNutritionActiveSubject,
  useSetNutritionNavigationSource,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { MEAL_DAY_LABELS, MEAL_DAY_ORDER } from "@/components/nutrition/meal-groups/meal-group-types";
import { ManualNutritionDiary } from "@/components/nutrition/manual-nutrition-diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoachClientPortalSettings } from "@/hooks/use-client-portal";
import { useClientNotes } from "@/hooks/use-coach-tools";
import { coachKeys } from "@/lib/query-keys-coach";
import { cn } from "@/utils";

type DayOfWeek = (typeof MEAL_DAY_ORDER)[number];

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No duration";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

function accessBannerTone(accessLevel: "disabled" | "read_only" | "enabled") {
  if (accessLevel === "disabled") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (accessLevel === "read_only") return "border-chart-3/40 bg-chart-3/10 text-chart-3";
  return "border-chart-2/40 bg-chart-2/10 text-chart-2";
}

export function ClientNutritionWorkspace({ clientId }: { clientId: string }) {
  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();
  const setActiveSubject = useSetNutritionActiveSubject();

  const clientQuery = useQuery({
    queryKey: coachKeys.clientDetail(clientId),
    queryFn: () => listClientDetailAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const assignmentsQuery = useNutritionMealGroupAssignments({
    status: "active",
    subject: { subject_client_id: clientId },
  });

  const portalSettingsQuery = useCoachClientPortalSettings(clientId);
  const notesQuery = useClientNotes(clientId);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("mon");

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

  const assignedSnapshotId = selectedAssignment?.meal_group_id || "";
  const assignedDetailQuery = useNutritionMealGroup(assignedSnapshotId);

  const assignedPlanByDay = useMemo(
    () => new Map((assignedDetailQuery.data?.plans ?? []).map((plan) => [plan.day_of_week, plan])),
    [assignedDetailQuery.data?.plans]
  );

  const selectedDayPlan = assignedPlanByDay.get(selectedDay) || null;

  const moduleAccess = useMemo(() => {
    const rows = portalSettingsQuery.data?.module_access || [];
    return rows.find((row) => row.module_key === "meal_logging")?.access_level || "enabled";
  }, [portalSettingsQuery.data?.module_access]);

  const nutritionNotes = useMemo(() => {
    const rows = notesQuery.data || [];
    return rows.filter((note) => note.tag === "nutrition").slice(0, 6);
  }, [notesQuery.data]);

  if (clientQuery.isLoading && !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data?.client) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {clientQuery.error instanceof Error ? clientQuery.error.message : "Unable to load client nutrition workspace"}
      </div>
    );
  }

  const client = clientQuery.data.client;
  const displayName = client.display_name || `${client.first_name} ${client.last_name || ""}`.trim();

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="glass-surface surface-pad space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{displayName} • Nutrition Hub</h2>
            <p className="text-sm text-muted-foreground">Assigned meal groups, active diary, and coach/client nutrition notes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl border-border/60">
              <Link href="/nutrition/groups">
                Manage Groups
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-border/60">
              <Link href={`/clients/${clientId}/access`}>Access Controls</Link>
            </Button>
          </div>
        </div>

        <div className={cn("rounded-2xl border px-3 py-2 text-sm", accessBannerTone(moduleAccess))}>
          <div className="flex items-center gap-2 font-medium">
            <Lock className="h-4 w-4" />
            Meal logging access: {moduleAccess.replace("_", " ")}
          </div>
          <p className="mt-1 text-xs text-current/90">
            {moduleAccess === "disabled"
              ? "Client portal meal logging is disabled. Coach can still log on behalf of client from this workspace."
              : moduleAccess === "read_only"
                ? "Client can only view nutrition logs. Coach entries remain enabled."
                : "Client can view and log meals in the client portal."}
          </p>
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-3">
        {assignmentsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl md:w-80" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : (assignmentsQuery.data?.length || 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No active meal group assignment for this client yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Active Assignment</Label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {(assignmentsQuery.data || []).map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {formatDateRange(assignment.start_date, assignment.end_date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssignment ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge className={cn(
                    "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]",
                    selectedAssignment.status === "active"
                      ? "border-chart-2/40 bg-chart-2/15 text-chart-2"
                      : "border-border/60 bg-muted/40 text-muted-foreground"
                  )}>
                    {selectedAssignment.status}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateRange(selectedAssignment.start_date, selectedAssignment.end_date)}
                  </span>
                </div>
              ) : null}
            </div>

            {assignedSnapshotId ? (
              assignedDetailQuery.isLoading && !assignedDetailQuery.data ? (
                <Skeleton className="h-56 w-full rounded-2xl" />
              ) : assignedDetailQuery.data ? (
                <div className="glass-subtle space-y-3 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-semibold">{assignedDetailQuery.data.group.name}</p>
                    <Button asChild size="sm" variant="outline" className="rounded-xl border-border/60">
                      <Link href={`/nutrition/groups/${assignedSnapshotId}`}>Open Snapshot</Link>
                    </Button>
                  </div>

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

                  {selectedDayPlan ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="glass-subtle p-3">
                          <p className="text-xs text-muted-foreground">Calories</p>
                          <p className="text-xl font-semibold text-chart-1">{selectedDayPlan.totals.calories}</p>
                        </div>
                        <div className="glass-subtle p-3">
                          <p className="text-xs text-muted-foreground">Protein</p>
                          <p className="text-xl font-semibold text-chart-2">{selectedDayPlan.totals.protein_g}g</p>
                        </div>
                        <div className="glass-subtle p-3">
                          <p className="text-xs text-muted-foreground">Carbs</p>
                          <p className="text-xl font-semibold text-chart-3">{selectedDayPlan.totals.carbs_g}g</p>
                        </div>
                        <div className="glass-subtle p-3">
                          <p className="text-xs text-muted-foreground">Fat</p>
                          <p className="text-xl font-semibold text-chart-4">{selectedDayPlan.totals.fat_g}g</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {selectedDayPlan.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No items for this day yet.</p>
                        ) : (
                          selectedDayPlan.items.map((item) => (
                            <div key={item.id} className="rounded-xl border border-border/50 bg-background/30 p-3 text-sm">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.calories} kcal • P {item.protein_g}g • C {item.carbs_g}g • F {item.fat_g}g
                              </p>
                              {item.notes ? <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p> : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No plan available for this weekday.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  Unable to load assigned meal group detail.
                </div>
              )
            ) : null}
          </div>
        )}
      </section>

      <section className="glass-surface surface-pad space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Nutrition Notes</h3>
          <Badge variant="secondary" className="rounded-full border border-border/60 bg-background/40">
            {nutritionNotes.length} recent
          </Badge>
        </div>
        {notesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : nutritionNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nutrition notes yet.</p>
        ) : (
          <div className="space-y-2">
            {nutritionNotes.map((note) => (
              <div key={note.id} className="rounded-xl border border-border/50 bg-background/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{note.title || "Nutrition note"}</p>
                  <Badge
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                      note.visibility === "visible_to_client"
                        ? "border-chart-2/40 bg-chart-2/15 text-chart-2"
                        : "border-border/60 bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {note.visibility === "visible_to_client" ? "Visible to client" : "Private"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <ManualNutritionDiary
        title={`${displayName} • Nutrition Diary`}
        subject={{ subject_client_id: clientId }}
        timezone={client.timezone}
        showAssignmentTools
        clientIdForSummary={clientId}
      />
    </div>
  );
}
