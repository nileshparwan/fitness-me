"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  HeartPulse,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Share2,
  Trash2,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import {
  flattenWorkoutExecutionSubjectPages,
  useLogWorkoutExecutionMutation,
  useWorkout,
  useWorkoutExecutionSubjects,
  useWorkouts,
} from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { EditableText } from "@/components/shared/editable-text";
import { WorkoutActions } from "@/components/workout/workout-actions";
import { WorkoutDetailSkeleton } from "./_components/workout-detailed-skeleton";
import { Database } from "@/types/database";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type StrengthSetRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type CardioLogRow = Database["public"]["Tables"]["cardio_sessions"]["Row"];

type SessionItem =
  | {
      id: string;
      type: "strength";
      title: string;
      createdAtMs: number;
      sets: StrengthSetRow[];
    }
  | {
      id: string;
      type: "cardio";
      title: string;
      createdAtMs: number;
      log: CardioLogRow;
    };

function safeMs(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMetric(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined) return "-";
  return `${value}${suffix}`;
}

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("self");
  const [selectedSubjectName, setSelectedSubjectName] = useState("Myself");
  const [performedOn, setPerformedOn] = useState(toDateInput(new Date()));
  const [logNotes, setLogNotes] = useState("");

  const { deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = useWorkout(id);
  const logExecution = useLogWorkoutExecutionMutation();
  const subjectQuery = useWorkoutExecutionSubjects(subjectSearch, isLogDialogOpen);
  const subjectOptions = useMemo(
    () => flattenWorkoutExecutionSubjectPages(subjectQuery.data),
    [subjectQuery.data]
  );

  if (isLoading) return <WorkoutDetailSkeleton />;
  if (!workout) {
    return <div className="page-shell text-center text-sm text-muted-foreground">Workout not found</div>;
  }

  const strengthLogs = (workout.strength_sets || []) as StrengthSetRow[];
  const cardioLogs = (workout.cardio_sessions || []) as CardioLogRow[];
  const groupedStrength = groupLogsByExercise(strengthLogs);

  const totalVolume = strengthLogs.reduce((sum, row) => sum + (row.weight || 0) * (row.reps || 0), 0);

  const totalStrengthSets = strengthLogs.length;
  const totalCardioMinutes = cardioLogs.reduce((sum, row) => sum + (row.duration_minutes || 0), 0);
  const totalCardioCalories = cardioLogs.reduce((sum, row) => sum + (row.calories_burned || 0), 0);
  const hasSessionNotes = Boolean(workout.notes && workout.notes.trim());

  const sessionTimeline: SessionItem[] = (() => {
    const strengthItems: SessionItem[] = groupedStrength.map((exercise) => ({
      id: `strength-${
        exercise.entry_sequence ??
        exercise.exercise_id ??
        exercise.group_id ??
        exercise.name
      }`,
      type: "strength",
      title: exercise.name,
      createdAtMs: exercise.entry_sequence ?? Math.min(...exercise.sets.map((set) => safeMs(set.created_at))),
      sets: exercise.sets,
    }));

    const cardioItems: SessionItem[] = cardioLogs.map((log) => ({
      id: `cardio-${log.id}`,
      type: "cardio",
      title: log.activity_type || "Cardio",
      createdAtMs: log.entry_sequence ?? safeMs(log.created_at),
      log,
    }));

    return [...strengthItems, ...cardioItems].sort((a, b) => a.createdAtMs - b.createdAtMs);
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
      set.paused ? "Paused" : null,
      set.touch_and_go ? "Touch & Go" : null,
    ]
      .filter(Boolean)
      .join(" • ");

  async function handleDownloadPdf() {
    const currentWorkout = workout;
    if (!currentWorkout) return;
    const [{ pdf }, { WorkoutPDF }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/workout/workout-pdf-document"),
    ]);
    const blob = await pdf(
      <WorkoutPDF workout={currentWorkout} strengthLogs={strengthLogs} cardioLogs={cardioLogs} unitSystem={system} />
    ).toBlob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${currentWorkout.name.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  function handleShareWorkout() {
    const currentWorkout = workout;
    if (!currentWorkout) return;
    const shareUrl = `${window.location.origin}/share/workout/${id}`;
    if (navigator.share) {
      void navigator.share({ url: shareUrl, title: currentWorkout.name });
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
      // toast feedback is handled in the mutation layer
    }
  }

  function resetLogDialog() {
    setSelectedSubjectId("self");
    setSelectedSubjectName("Myself");
    setSubjectSearch("");
    setPerformedOn(toDateInput(new Date()));
    setLogNotes("");
    setSubjectDropdownOpen(false);
  }

  function handleLogDialogChange(open: boolean) {
    setIsLogDialogOpen(open);
    if (!open) resetLogDialog();
  }

  async function handleLogExecution() {
    await withToastFeedback(
      logExecution.mutateAsync({
        workout_id: id,
        subject_client_id: selectedSubjectId === "self" ? null : selectedSubjectId,
        performed_on: performedOn,
        notes: logNotes.trim() || null,
      }),
      {
        loading: "Logging workout...",
        success: "Workout logged successfully",
        error: "Unable to log workout",
      }
    );
    handleLogDialogChange(false);
  }

  return (
    <div className="page-shell mx-auto w-full max-w-6xl pb-24 md:pb-12">
      <div className="section-gap">
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 space-y-1">
                  <EditableText
                    initialValue={workout.name}
                    onSave={handleRename}
                    className="truncate text-xl font-semibold tracking-tight md:text-3xl"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="h-5 rounded-sm px-1.5 py-0 text-[10px] font-medium">
                      {workout.status || "draft"}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(workout.date), "EEEE, MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
            </div>

            <Accordion type="single" collapsible className="sm:hidden">
              <AccordionItem value="session-metrics">
                <AccordionTrigger className="py-2 text-sm">Session Metrics</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <MetricLine icon={Clock} label="Duration" value={formatMetric(workout.duration_minutes, " min")} />
      <MetricLine icon={Weight} label="Total Volume" value={`${displayWeight(totalVolume, system)?.toFixed(1)} ${labels.weight}`} />
                  <MetricLine icon={Dumbbell} label="Strength Sets" value={String(totalStrengthSets)} />
                  <MetricLine icon={Activity} label="Cardio Time" value={formatMetric(totalCardioMinutes, " min")} />
                  <MetricLine icon={HeartPulse} label="Calories" value={String(totalCardioCalories || "-")} />
                </AccordionContent>
              </AccordionItem>
              {hasSessionNotes ? (
                <AccordionItem value="session-general-notes">
                  <AccordionTrigger className="py-2 text-sm">General Notes</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {workout.notes}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ) : null}
            </Accordion>

            <div className="hidden grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid sm:grid-cols-2 lg:grid-cols-5">
              <MetricLine icon={Clock} label="Duration" value={formatMetric(workout.duration_minutes, " min")} />
              <MetricLine icon={Weight} label="Total Volume" value={`${displayWeight(totalVolume, system)?.toFixed(1)} ${labels.weight}`} />
              <MetricLine icon={Dumbbell} label="Strength Sets" value={String(totalStrengthSets)} />
              <MetricLine icon={Activity} label="Cardio Time" value={formatMetric(totalCardioMinutes, " min")} />
              <MetricLine icon={HeartPulse} label="Calories" value={String(totalCardioCalories || "-")} />
            </div>
            {(workout.sport_type || workout.location || workout.perceived_exertion) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {workout.sport_type ? <Badge variant="outline">{workout.sport_type}</Badge> : null}
                {workout.location ? <Badge variant="outline">{workout.location}</Badge> : null}
                {workout.perceived_exertion ? <Badge variant="secondary">Session RPE {workout.perceived_exertion}</Badge> : null}
              </div>
            )}

            <div className="hidden flex-wrap items-center gap-1.5 sm:flex sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                onClick={() => setIsLogDialogOpen(true)}
              >
                Log Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                onClick={() => router.push(`/workouts/${id}/edit`)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
              <WorkoutActions workout={workout} strengthLogs={strengthLogs} cardioLogs={cardioLogs} />
            </div>

            {hasSessionNotes && (
              <Accordion type="single" collapsible className="hidden w-full sm:block">
                <AccordionItem value="workout-notes">
                  <AccordionTrigger>General Notes</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {workout.notes}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Session Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Strength and cardio are presented in one sequence for a complete session view.
              </p>
            </div>
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/workouts/${id}/edit`)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsLogDialogOpen(true)}>
                    Log Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/share/workout/${id}`, "_blank")}>
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWorkout}>
                    <Share2 className="h-4 w-4" /> Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleDownloadPdf()}>
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {sessionTimeline.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No training logs found for this session yet.
            </div>
          )}

          {sessionTimeline.map((item, index) => (
            <div key={item.id} className="space-y-3 rounded-xl border-b pb-4 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.type === "strength" ? "secondary" : "outline"} className="capitalize">
                      {item.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Block {index + 1}</span>
                  </div>
                  <h4 className="truncate text-sm font-semibold md:text-base">{item.title}</h4>
                </div>
              </div>

              {item.type === "strength" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 rounded-lg bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    <span>Set</span>
                    <span className="text-center">Weight</span>
                    <span className="text-center">Reps</span>
                    <span className="text-right">Notes</span>
                  </div>
                  {item.sets.map((set) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-4 items-center rounded-lg bg-muted/20 px-2 py-2 text-xs md:text-sm"
                    >
                      <span className="font-medium">#{set.set_number}</span>
                      <span className="text-center">{set.weight !== null && set.weight !== undefined ? `${displayWeight(set.weight, system)?.toFixed(1)} ${labels.weight}` : "-"}</span>
                      <span className="text-center">{set.reps ?? "-"}</span>
                      <span className="truncate text-right text-[11px] text-muted-foreground md:text-xs">
                        {advancedSetDetails(set) || "-"}
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
                                  <span className="font-medium text-foreground">Set {set.set_number}:</span>{" "}
                                  {advancedSetDetails(set)}
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
                              new Set(
                                item.sets
                                  .map((set) => (set.notes || "").trim())
                                  .filter((note) => note.length > 0)
                              )
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
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <InfoPill label="Duration" value={formatMetric(item.log.duration_minutes, " min")} />
                  <InfoPill label="Distance" value={formatMetric(item.log.distance, ` ${labels.distance}`)} />
                  <InfoPill label="Calories" value={item.log.calories_burned?.toString() || "-"} />
                  <InfoPill label="Avg HR" value={formatMetric(item.log.average_heart_rate, " bpm")} />
                </div>
              )}
            </div>
          ))}
        </div>

        <Dialog open={isLogDialogOpen} onOpenChange={handleLogDialogChange}>
          <DialogContent size={{ tablet: "md", desktop: "md" }} className="gap-0 p-0">
            <DialogHeader className="border-b border-border/60 px-5 py-4">
              <DialogTitle>Log Workout Execution</DialogTitle>
              <DialogDescription>
                Record that this workout was performed today. This drives adherence and streak tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <Label>Performed For</Label>
                <Popover open={subjectDropdownOpen} onOpenChange={setSubjectDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-between rounded-xl border-border/60 bg-muted/20"
                    >
                      <span className="truncate">{selectedSubjectName}</span>
                      <span className="text-xs text-muted-foreground">Select</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border-border/70 bg-card/95 p-2"
                  >
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={subjectSearch}
                          onChange={(event) => setSubjectSearch(event.target.value)}
                          placeholder="Search clients..."
                          className="h-9 rounded-lg border-border/60 bg-muted/20 pl-9"
                        />
                      </div>

                      <ScrollArea className="max-h-[260px] pr-2">
                        <div className="space-y-1">
                          {subjectQuery.isLoading ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">Loading...</p>
                          ) : subjectOptions.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No matches found.</p>
                          ) : (
                            subjectOptions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/40"
                                onClick={() => {
                                  setSelectedSubjectId(item.id);
                                  setSelectedSubjectName(item.full_name || (item.is_self ? "Myself" : "Client"));
                                  setSubjectDropdownOpen(false);
                                }}
                              >
                                <span className="truncate">{item.full_name || "Client"}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.is_self ? "self" : "client"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </ScrollArea>

                      {subjectQuery.hasNextPage ? (
                        <Button
                          variant="outline"
                          className="h-9 w-full rounded-lg border-border/60 bg-muted/20"
                          onClick={() => void subjectQuery.fetchNextPage()}
                          disabled={subjectQuery.isFetchingNextPage}
                        >
                          {subjectQuery.isFetchingNextPage ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading...
                            </span>
                          ) : (
                            "Load more"
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="execution-performed-on">Performed On</Label>
                <Input
                  id="execution-performed-on"
                  type="date"
                  value={performedOn}
                  onChange={(event) => setPerformedOn(event.target.value)}
                  className="h-11 rounded-xl border-border/60 bg-muted/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="execution-notes">Notes</Label>
                <Textarea
                  id="execution-notes"
                  rows={3}
                  value={logNotes}
                  onChange={(event) => setLogNotes(event.target.value)}
                  placeholder="Optional notes"
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-border/60 px-5 py-4">
              <Button variant="outline" onClick={() => handleLogDialogChange(false)}>
                Cancel
              </Button>
              <Button
                className="accent-strong text-black"
                onClick={() => void handleLogExecution()}
                disabled={logExecution.isPending || !performedOn}
              >
                {logExecution.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging...
                  </span>
                ) : (
                  "Log Today"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Separator />
      </div>
    </div>
  );
}

function MetricLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}:</span>
      <span className="font-semibold leading-none">{value}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
