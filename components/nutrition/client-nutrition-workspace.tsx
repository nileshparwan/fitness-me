"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";

import { listClientDetailAction } from "@/app/actions/coach-tools";
import { MEAL_DAY_LABELS, MEAL_DAY_ORDER } from "@/components/nutrition/meal-groups/meal-group-types";
import { ManualNutritionDiary } from "@/components/nutrition/manual-nutrition-diary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMealGroupAssignments, useMealGroupDetail } from "@/hooks/use-meal-groups";

type DayOfWeek = (typeof MEAL_DAY_ORDER)[number];

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "No duration";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

export function ClientNutritionWorkspace({ clientId }: { clientId: string }) {
  const clientQuery = useQuery({
    queryKey: ["client", "nutrition", "detail", clientId],
    queryFn: () => listClientDetailAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const assignmentsQuery = useMealGroupAssignments({
    status: "active",
    subject: { subject_client_id: clientId },
  });

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("mon");

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
  const assignedDetailQuery = useMealGroupDetail(assignedSnapshotId);
  const assignedPlanByDay = useMemo(
    () => new Map((assignedDetailQuery.data?.plans ?? []).map((plan) => [plan.day_of_week, plan])),
    [assignedDetailQuery.data?.plans]
  );
  const selectedDayPlan = assignedPlanByDay.get(selectedDay) || null;

  if (clientQuery.isLoading && !clientQuery.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data?.client) {
    return (
      <div className="native-surface surface-pad text-sm text-destructive">
        {clientQuery.error instanceof Error ? clientQuery.error.message : "Unable to load client nutrition workspace"}
      </div>
    );
  }

  const client = clientQuery.data.client;
  const displayName = client.display_name || `${client.first_name} ${client.last_name || ""}`.trim();

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{displayName} • Assigned Meal Group</h2>
            <p className="text-sm text-muted-foreground">Preview the active 7-day snapshot currently assigned to this client.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/nutrition/meal-groups">
              Manage Meal Groups
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {assignmentsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full md:w-80" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (assignmentsQuery.data?.length || 0) === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No active meal group assignment for this client yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(280px,1fr)_auto] md:items-end">
              <div className="grid gap-2">
                <label className="text-xs text-muted-foreground">Active Assignment</label>
                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                  <SelectTrigger>
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
                  <Badge variant={selectedAssignment.status === "active" ? "default" : "secondary"}>
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
                <Skeleton className="h-56 w-full" />
              ) : assignedDetailQuery.data ? (
                <div className="space-y-3 rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{assignedDetailQuery.data.group.name}</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/nutrition/meal-groups/${assignedSnapshotId}`}>Open Snapshot</Link>
                    </Button>
                  </div>

                  <Tabs value={selectedDay} onValueChange={(value) => setSelectedDay(value as DayOfWeek)}>
                    <TabsList className="grid w-full grid-cols-7">
                      {MEAL_DAY_ORDER.map((day) => (
                        <TabsTrigger key={day} value={day}>
                          {MEAL_DAY_LABELS[day].slice(0, 3)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {selectedDayPlan ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 text-sm md:grid-cols-4">
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Calories</p>
                            <p className="text-lg font-semibold">{selectedDayPlan.totals.calories}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Protein</p>
                            <p className="text-lg font-semibold">{selectedDayPlan.totals.protein_g}g</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Carbs</p>
                            <p className="text-lg font-semibold">{selectedDayPlan.totals.carbs_g}g</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Fat</p>
                            <p className="text-lg font-semibold">{selectedDayPlan.totals.fat_g}g</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-2">
                        {selectedDayPlan.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No items for this day yet.</p>
                        ) : (
                          selectedDayPlan.items.map((item) => (
                            <div key={item.id} className="rounded-lg border p-2.5 text-sm">
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
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Unable to load assigned meal group detail.
                </div>
              )
            ) : null}
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
