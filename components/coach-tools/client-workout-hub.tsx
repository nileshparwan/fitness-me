"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Clock3, Flame, Loader2, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

import type { SessionLocationType, SessionSlot } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientAssignments, useClientDetail, useClientSessionsRange, useCoachToolMutations } from "@/hooks/use-coach-tools";
import { cn } from "@/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayStart(input: Date) {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + days);
  return next;
}

function statusTone(status: string | null) {
  const safe = (status || "").toLowerCase();
  if (safe === "completed" || safe === "done") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (safe === "pending" || safe === "scheduled" || safe === "active") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function minutesToDuration(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function ClientWorkoutHub({ clientId }: { clientId: string }) {
  const detailQuery = useClientDetail(clientId);
  const assignmentsQuery = useClientAssignments(clientId);
  const mutations = useCoachToolMutations();

  const weekStart = useMemo(() => mondayStart(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekStartIso = useMemo(() => toIsoDate(weekStart), [weekStart]);
  const weekEndIso = useMemo(() => toIsoDate(weekEnd), [weekEnd]);

  const [selectedDayIso, setSelectedDayIso] = useState(() => toIsoDate(new Date()));

  const [logOpen, setLogOpen] = useState(false);
  const [logName, setLogName] = useState("");
  const [logSlot, setLogSlot] = useState<SessionSlot>("other");
  const [logLocationType, setLogLocationType] = useState<SessionLocationType>("gym");
  const [logLocationLabel, setLogLocationLabel] = useState("");

  const sessionsQuery = useClientSessionsRange(clientId, weekStartIso, weekEndIso);

  const loading = (detailQuery.isLoading && !detailQuery.data) || (sessionsQuery.isLoading && !sessionsQuery.data);

  const client = detailQuery.data?.client;
  const clientName = client ? client.display_name || `${client.first_name} ${client.last_name || ""}`.trim() : "Client";

  const dayTabs = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStart, index);
      const iso = toIsoDate(date);
      return {
        iso,
        short: DAY_LABELS[date.getDay()],
      };
    });
  }, [weekStart]);

  const weekSessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data]);
  const sessionsForSelectedDay = useMemo(
    () => weekSessions.filter((session) => session.performed_on === selectedDayIso),
    [selectedDayIso, weekSessions]
  );

  const completedCount = useMemo(() => {
    return weekSessions.filter((session) => {
      const safe = (session.status || "").toLowerCase();
      return safe === "completed" || safe === "done" || Boolean(session.completed_at);
    }).length;
  }, [weekSessions]);

  const totalDurationMinutes = useMemo(() => {
    return weekSessions.reduce((sum, session) => {
      if (typeof session.duration_minutes === "number" && session.duration_minutes > 0) {
        return sum + session.duration_minutes;
      }
      if (session.started_at && session.completed_at) {
        const start = new Date(session.started_at).getTime();
        const end = new Date(session.completed_at).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          return sum + Math.round((end - start) / (1000 * 60));
        }
      }
      return sum;
    }, 0);
  }, [weekSessions]);

  const avgRpe = useMemo(() => {
    const scored = weekSessions.filter((session) => typeof session.perceived_exertion === "number" && session.perceived_exertion > 0);
    if (scored.length === 0) return 0;
    return Math.round((scored.reduce((sum, session) => sum + Number(session.perceived_exertion || 0), 0) / scored.length) * 10) / 10;
  }, [weekSessions]);

  const streak = useMemo(() => {
    const daySet = new Set(weekSessions.map((session) => session.performed_on));
    let current = 0;
    for (let i = 6; i >= 0; i -= 1) {
      const dateIso = toIsoDate(addDays(weekStart, i));
      if (daySet.has(dateIso)) current += 1;
      else if (current > 0) break;
    }
    return current;
  }, [weekSessions, weekStart]);

  const activeAssignment = useMemo(() => {
    return (assignmentsQuery.data || []).find((row) => row.assignment.status === "active") || null;
  }, [assignmentsQuery.data]);

  const onLogSession = async () => {
    if (!logName.trim()) {
      toast.error("Session name is required.");
      return;
    }

    try {
      await mutations.logClientWorkout.mutateAsync({
        client_id: clientId,
        name: logName.trim(),
        performed_on: selectedDayIso,
        session_slot: logSlot,
        location_type: logLocationType,
        location_label: logLocationLabel.trim() || null,
        started_at: new Date().toISOString(),
        completed_at: null,
        mark_plan_session_resolved: false,
      });
      setLogOpen(false);
      setLogName("");
      setLogLocationLabel("");
      toast.success("Session logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log session");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (detailQuery.isError || !client) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load workout hub"}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-3">
        <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {clientName}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Workout Hub</h1>
            <p className="text-sm text-muted-foreground">Training sessions and history</p>
          </div>

          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-strong rounded-xl text-black">
                <Plus className="mr-2 h-4 w-4" />
                Log Session
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Log Session</DialogTitle>
                <DialogDescription>Add a completed or in-progress workout session for this client.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Session Name</Label>
                  <Input value={logName} onChange={(event) => setLogName(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" placeholder="e.g. Upper Body Push" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Session Slot</Label>
                    <Select value={logSlot} onValueChange={(value) => setLogSlot(value as SessionSlot)}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-muted/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <Select value={logLocationType} onValueChange={(value) => setLogLocationType(value as SessionLocationType)}>
                      <SelectTrigger className="rounded-xl border-border/60 bg-muted/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gym">Gym</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location Label</Label>
                  <Input value={logLocationLabel} onChange={(event) => setLogLocationLabel(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" placeholder="e.g. Downtown Gym" />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setLogOpen(false)}>Cancel</Button>
                <Button className="accent-strong rounded-xl text-black" onClick={() => void onLogSession()} disabled={mutations.logClientWorkout.isPending}>
                  {mutations.logClientWorkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="glass-surface rounded-2xl border border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{activeAssignment?.assignment.name || "No active plan"}</p>
            <p className="text-xs text-muted-foreground">
              {activeAssignment
                ? `${activeAssignment.assignment.started_on || ""} → ${activeAssignment.assignment.ended_on || ""}`
                : "Assign a training plan to this client"}
            </p>
          </div>
          {activeAssignment ? (
            <span className="rounded-full border border-chart-2/40 bg-chart-2/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-chart-2">ACTIVE</span>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="glass-surface rounded-2xl border border-border/60 p-4">
          <p className="text-2xl font-semibold">{completedCount}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Completed</p>
        </div>
        <div className="glass-surface rounded-2xl border border-border/60 p-4">
          <p className="text-2xl font-semibold">{minutesToDuration(totalDurationMinutes)}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Duration</p>
        </div>
        <div className="glass-surface rounded-2xl border border-border/60 p-4">
          <p className="text-2xl font-semibold">{avgRpe}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Avg RPE</p>
        </div>
        <div className="glass-surface rounded-2xl border border-border/60 p-4">
          <p className="text-2xl font-semibold">{streak}d</p>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Streak</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {dayTabs.map((tab) => (
            <button
              key={tab.iso}
              type="button"
              onClick={() => setSelectedDayIso(tab.iso)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm transition-colors",
                selectedDayIso === tab.iso
                  ? "border-chart-1/50 bg-chart-1/15 text-chart-1"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.short}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {sessionsForSelectedDay.length === 0 ? (
            <p className="glass-surface rounded-2xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">No sessions logged for this day.</p>
          ) : (
            sessionsForSelectedDay.map((session) => (
              <article key={session.id} className="glass-surface rounded-2xl border border-border/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{session.name || session.session_label || "Session"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{session.started_at ? new Date(session.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Any time"}</span>
                      <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{minutesToDuration(session.duration_minutes || 0)}</span>
                      <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{session.perceived_exertion || 0} RPE</span>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]", statusTone(session.status))}>
                    {session.status || "logged"}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="glass-surface rounded-2xl border border-border/60 p-4">
        <h2 className="mb-3 text-lg font-semibold">Plan History</h2>
        <div className="space-y-2">
          {(assignmentsQuery.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans assigned yet.</p>
          ) : (
            (assignmentsQuery.data || []).map((row) => (
              <div key={row.assignment.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{row.assignment.name}</p>
                    <p className="text-xs text-muted-foreground">{row.assignment.started_on || ""}{row.assignment.ended_on ? ` — ${row.assignment.ended_on}` : ""}</p>
                  </div>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusTone(row.assignment.status))}>
                    {row.assignment.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
