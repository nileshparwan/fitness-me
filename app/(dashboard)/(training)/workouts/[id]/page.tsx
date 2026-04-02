"use client";

import { useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  ArrowLeft,
  CalendarPlus,
  Calendar,
  Clock,
  Dumbbell,
  HeartPulse,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
  Weight,
} from "lucide-react";

import { EditableText } from "@/components/shared/editable-text";
import { LogWorkoutDialog } from "@/components/workout/log-workout-dialog";
import { WorkoutDetailSkeleton } from "./_components/workout-detailed-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkout, useWorkouts } from "@/hooks/use-workout";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import type { Database } from "@/types/database";
import { groupLogsByExercise } from "@/utils/log";
import { displayWeight } from "@/utils/unit-conversion";
import { cn } from "@/utils";

type StrengthSetRow = Database["public"]["Tables"]["workout_sets"]["Row"];
type CardioLogRow = Database["public"]["Tables"]["workout_cardio"]["Row"];
type MetricIcon = ComponentType<{ className?: string }>;
type StrengthSessionItem = {
  id: string;
  type: "strength";
  title: string;
  createdAtMs: number;
  sets: StrengthSetRow[];
  supersetGroupId: string | null;
};
type CardioSessionItem = {
  id: string;
  type: "cardio";
  title: string;
  createdAtMs: number;
  log: CardioLogRow;
};
type SessionItem = StrengthSessionItem | CardioSessionItem;
type SessionRenderGroup =
  | { kind: "superset"; groupId: string; items: StrengthSessionItem[] }
  | { kind: "standalone"; item: SessionItem };

function safeMs(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function formatMetric(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined) return "—";
  return `${value}${suffix}`;
}

function formatDisplayWeight(value: number, label: string, displayValue: number | undefined) {
  if (!Number.isFinite(value) || displayValue === undefined) return `— ${label}`;
  return `${displayValue.toFixed(1)} ${label}`;
}

function deriveDuration(
  workout: { duration_minutes: number | null; started_at: string | null; completed_at: string | null },
  cardioLogs: CardioLogRow[]
) {
  if (workout.duration_minutes != null) return workout.duration_minutes;

  if (workout.started_at && workout.completed_at) {
    const diff = new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime();
    if (diff > 0) return Math.round(diff / 60_000);
  }

  const cardioTotal = cardioLogs.reduce((sum, row) => sum + (row.duration_minutes || 0), 0);
  if (cardioTotal > 0) return cardioTotal;

  return null;
}

function MetricStrip({
  metrics,
}: {
  metrics: Array<{ icon: MetricIcon; label: string; value: string }>;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 5)}, minmax(0, 1fr))` }}
    >
      {metrics.map(({ icon: Icon, label, value }) => (
        <div key={label} className="glass-surface !rounded-[10px] border-border/40 p-3 text-center">
          <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const { deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = useWorkout(id);

  if (isLoading) return <WorkoutDetailSkeleton />;
  if (!workout) {
    return <div className="page-shell text-center text-sm text-muted-foreground">Workout not found</div>;
  }

  const resolvedWorkout = workout;
  const strengthLogs = (resolvedWorkout.workout_sets || []) as StrengthSetRow[];
  const cardioLogs = (resolvedWorkout.workout_cardio || []) as CardioLogRow[];
  const groupedStrength = groupLogsByExercise(strengthLogs);
  const totalVolume = strengthLogs.reduce((sum, row) => sum + (row.weight || 0) * (row.reps || 0), 0);
  const totalStrengthSets = strengthLogs.length;
  const totalCardioMinutes = cardioLogs.reduce((sum, row) => sum + (row.duration_minutes || 0), 0);
  const totalCardioCalories = cardioLogs.reduce((sum, row) => sum + (row.calories_burned || 0), 0);
  const hasSessionNotes = Boolean(resolvedWorkout.notes?.trim());

  const sessionTimeline: SessionItem[] = (() => {
    const strengthItems: StrengthSessionItem[] = groupedStrength.map((exercise) => ({
      id: `strength-${exercise.entry_sequence ?? exercise.exercise_id ?? exercise.group_id ?? exercise.name}`,
      type: "strength",
      title: exercise.name,
      createdAtMs: exercise.entry_sequence ?? Math.min(...exercise.sets.map((set) => safeMs(set.created_at))),
      sets: exercise.sets,
      supersetGroupId: exercise.group_id ?? null,
    }));

    const cardioItems: CardioSessionItem[] = cardioLogs.map((log) => ({
      id: `cardio-${log.id}`,
      type: "cardio",
      title: log.activity_type || "Cardio",
      createdAtMs: log.entry_sequence ?? safeMs(log.created_at),
      log,
    }));

    return [...strengthItems, ...cardioItems].sort((a, b) => a.createdAtMs - b.createdAtMs);
  })();

  const sessionRenderGroups: SessionRenderGroup[] = (() => {
    const seen = new Set<number>();
    const result: SessionRenderGroup[] = [];

    sessionTimeline.forEach((item, index) => {
      if (seen.has(index)) return;

      if (item.type === "strength" && item.supersetGroupId) {
        const linkedItems = sessionTimeline.flatMap((candidate, candidateIndex) =>
          candidate.type === "strength" && candidate.supersetGroupId === item.supersetGroupId
            ? [candidate]
            : []
        );
        const linkedIndices = sessionTimeline.flatMap((candidate, candidateIndex) =>
          candidate.type === "strength" && candidate.supersetGroupId === item.supersetGroupId
            ? [candidateIndex]
            : []
        );

        linkedIndices.forEach((candidateIndex) => seen.add(candidateIndex));

        if (linkedItems.length > 1) {
          result.push({
            kind: "superset",
            groupId: item.supersetGroupId,
            items: linkedItems,
          });
          return;
        }
      }

      seen.add(index);
      result.push({ kind: "standalone", item });
    });

    return result;
  })();

  const workoutName = workout.name;
  const advancedSetDetails = (set: StrengthSetRow) =>
    [
      set.rest_seconds ? `Rest ${set.rest_seconds}s` : null,
      set.rpe ? `RPE ${set.rpe}` : null,
      set.rir !== null && set.rir !== undefined ? `RIR ${set.rir}` : null,
      set.tempo ? `Tempo ${set.tempo}` : null,
      set.is_warmup ? "Warm-up" : null,
      set.is_dropset ? "Drop set" : null,
    ]
      .filter(Boolean)
      .join(" • ");

  const renderStrengthTimelineCard = (item: StrengthSessionItem, badgeLabel: string | number) => (
    <div key={item.id} className="glass-surface !rounded-[12px] border-border/40 space-y-3 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chart-1/15 text-[10px] font-bold text-chart-1">
          {badgeLabel}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{item.title}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">strength</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-4 rounded-lg bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Set</span>
          <span className="text-center">Weight</span>
          <span className="text-center">Reps</span>
          <span className="text-right">Notes</span>
        </div>
        {item.sets.map((set) => (
          <div key={set.id} className="grid grid-cols-4 items-center rounded-[8px] bg-muted/30 px-3 py-2 text-xs md:text-sm">
            <span className="font-medium">#{set.set_number}</span>
            <span className="text-center">
              {set.weight !== null && set.weight !== undefined
                ? `${displayWeight(set.weight, system)?.toFixed(1)} ${labels.weight}`
                : "—"}
            </span>
            <span className="text-center">{set.reps ?? "—"}</span>
            <span className="truncate text-right text-[11px] text-muted-foreground md:text-xs">
              {advancedSetDetails(set) || "—"}
            </span>
          </div>
        ))}

        {item.sets.some((set) => Boolean(advancedSetDetails(set))) ? (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`set-guidance-${item.id}`} className="border-b-0">
              <AccordionTrigger className="py-2 text-sm">Set Guidance</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {item.sets
                    .filter((set) => Boolean(advancedSetDetails(set)))
                    .map((set) => (
                      <li key={`${set.id}-guidance`}>
                        <span className="font-medium text-foreground">Set {set.set_number}:</span> {advancedSetDetails(set)}
                      </li>
                    ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        {item.sets.some((set) => Boolean(set.notes)) ? (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={`general-notes-${item.id}`} className="border-b-0">
              <AccordionTrigger className="py-2 text-sm">General Notes</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {Array.from(
                    new Set(item.sets.map((set) => (set.notes || "").trim()).filter((note) => note.length > 0))
                  ).map((note) => (
                    <p key={`general-note-${item.id}-${note}`} className="whitespace-pre-wrap">
                      {note}
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </div>
    </div>
  );

  const renderCardioTimelineCard = (item: CardioSessionItem, badgeLabel: string | number) => (
    <div key={item.id} className="glass-surface !rounded-[12px] border-border/40 space-y-3 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chart-5/15 text-[10px] font-bold text-chart-5">
          {badgeLabel}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{item.title}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">cardio</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <InfoPill label="Duration" value={formatMetric(item.log.duration_minutes, " min")} />
        <InfoPill label="Distance" value={formatMetric(item.log.distance, ` ${labels.distance}`)} />
        <InfoPill label="Calories" value={item.log.calories_burned?.toString() || "—"} />
        <InfoPill label="Avg HR" value={formatMetric(item.log.average_heart_rate, " bpm")} />
      </div>
    </div>
  );

  async function handleDownloadPdf() {
    const [{ pdf }, { WorkoutPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/workout/workout-pdf-document"),
    ]);
    const blob = await pdf(
      <WorkoutPDF workout={resolvedWorkout} strengthLogs={strengthLogs} cardioLogs={cardioLogs} unitSystem={system} />
    ).toBlob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${resolvedWorkout.name.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleShareWorkout() {
    const shareUrl = `${window.location.origin}/share/workout/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: resolvedWorkout.name });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        window.open(shareUrl, "_blank");
      }
      return;
    }
    window.open(shareUrl, "_blank");
  }

  async function handleRename(nextName: string) {
    if (!nextName || nextName.trim() === workoutName) return;
    await updateWorkout.mutateAsync({ id, data: { name: nextName.trim() } });
  }

  async function handleDelete() {
    try {
      await deleteWorkout.mutateAsync(id);
      router.push("/workouts");
    } catch {
      // toast feedback handled in mutation layer
    }
  }

  const metrics = [
    { icon: Clock, label: "Duration", value: formatMetric(deriveDuration(resolvedWorkout, cardioLogs), " min") },
    {
      icon: Weight,
      label: "Volume",
      value: formatDisplayWeight(totalVolume, labels.weight, displayWeight(totalVolume, system) ?? undefined),
    },
    { icon: Dumbbell, label: "Sets", value: String(totalStrengthSets) },
    { icon: Activity, label: "Cardio", value: formatMetric(totalCardioMinutes, " min") },
    ...(totalCardioCalories > 0
      ? [{ icon: HeartPulse, label: "Calories", value: String(totalCardioCalories) }]
      : []),
  ];

  return (
    <div className="page-shell mx-auto w-full max-w-6xl pb-24 md:pb-12">
      <div className="section-gap">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Button variant="ghost" size="icon" className="mt-0.5 h-9 w-9 shrink-0 rounded-full" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <EditableText initialValue={workout.name} onSave={handleRename} className="text-xl font-semibold tracking-tight md:text-2xl" />
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="h-5 rounded-sm px-1.5 py-0 text-[10px] font-medium capitalize">
                    {resolvedWorkout.status || "draft"}
                  </Badge>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(resolvedWorkout.date), "EEE, MMM d yyyy")}
                  </span>
                  {resolvedWorkout.sport_type ? <Badge variant="outline" className="text-[10px]">{resolvedWorkout.sport_type}</Badge> : null}
                  {resolvedWorkout.location ? <Badge variant="outline" className="text-[10px]">{resolvedWorkout.location}</Badge> : null}
                  {resolvedWorkout.perceived_exertion ? <Badge variant="secondary" className="text-[10px]">RPE {resolvedWorkout.perceived_exertion}</Badge> : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => router.push(`/workouts/${id}/edit`)}>
                <Pencil className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setIsLogDialogOpen(true)}>
                <CalendarPlus className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Log Today</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="sm:hidden" onClick={() => router.push(`/workouts/${id}/edit`)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="sm:hidden" onClick={() => setIsLogDialogOpen(true)}>
                    <CalendarPlus className="h-4 w-4" />
                    Log Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWorkout}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleDownloadPdf()}>
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <MetricStrip metrics={metrics} />

          {sessionRenderGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No training logs found for this session yet.
            </div>
          ) : (
            <section className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Session Timeline</h3>
                <p className="text-sm text-muted-foreground">
                  Strength and cardio are presented in one sequence for a complete session view.
                </p>
              </div>

              {sessionRenderGroups.map((group, index) => {
                if (group.kind === "superset") {
                  return (
                    <div key={`superset-${group.groupId}`} className="space-y-3 rounded-[14px] border-2 border-chart-2/40 bg-chart-2/5 p-3">
                      <div className="flex items-center gap-2 pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-chart-2">Superset</span>
                      </div>
                      {group.items.map((item, itemIndex) =>
                        renderStrengthTimelineCard(item, String.fromCharCode(65 + itemIndex))
                      )}
                    </div>
                  );
                }

                return group.item.type === "strength"
                  ? renderStrengthTimelineCard(group.item, index + 1)
                  : renderCardioTimelineCard(group.item, index + 1);
              })}
            </section>
          )}

          {hasSessionNotes ? (
            <section className="glass-surface !rounded-[12px] border-border/40 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Session Notes</p>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{resolvedWorkout.notes}</p>
            </section>
          ) : null}
        </div>

        <LogWorkoutDialog workoutId={id} open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen} />
      </div>
    </div>
  );
}
