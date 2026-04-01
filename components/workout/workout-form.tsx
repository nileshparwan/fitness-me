"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link2Off } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Resolver,
  type Control,
  type FieldArrayWithId,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { linkWorkoutToPrograms } from "@/app/actions/program";
import {
  getWorkoutExerciseLastSessionAction,
  type WorkoutActionInput,
  type WorkoutExerciseLastSession,
} from "@/app/actions/workout";
import { CardioEntryCard } from "@/components/workout/cardio-entry-card";
import { CardioExerciseSelector } from "@/components/workout/cardio-exercise-selector";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { ExerciseSelector } from "@/components/workout/exercise-selector";
import { SupersetManagerDialog } from "@/components/workout/superset-manager-dialog";
import { WorkoutMetaSheet } from "@/components/workout/workout-form-meta";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { usePrograms } from "@/hooks/use-program";
import { useUser } from "@/hooks/use-user";
import { useWorkouts } from "@/hooks/use-workout";
import { trainingKeys } from "@/lib/query-keys-training";
import { mapEntriesToActionExercises, useWorkoutDraftStore } from "@/stores/use-workout-draft-store";
import type { Database } from "@/types/database";
import { workoutFormSchema, type WorkoutFormValues } from "@/types/workout";

type Program = Database["public"]["Tables"]["training_plans"]["Row"];
type StrengthEntry = Extract<WorkoutFormValues["exercises"][number], { type: "strength" }>;
type ExerciseField = FieldArrayWithId<WorkoutFormValues, "exercises", "id">;
type LastSessionLookup = Map<string, WorkoutExerciseLastSession>;
type RenderGroup =
  | { kind: "superset"; groupId: string; indices: number[] }
  | { kind: "standalone"; index: number };

interface WorkoutFormProps {
  initialData?: WorkoutFormValues;
  workoutId?: string;
  formId?: string;
  onDraftChange?: (draft: WorkoutFormValues) => void;
  supersetDialogOpen?: boolean;
  onSupersetDialogOpenChange?: (open: boolean) => void;
  metaSheetOpen?: boolean;
  onMetaSheetOpenChange?: (open: boolean) => void;
}

interface SupersetBlockProps {
  groupId: string;
  indices: number[];
  fields: ExerciseField[];
  entries: WorkoutFormValues["exercises"];
  control: Control<WorkoutFormValues>;
  lastSessionByExercise: LastSessionLookup;
  onUnlinkSuperset: (index: number) => void;
  onRemove: (index: number) => void;
}

function isStrengthEntry(
  entry: WorkoutFormValues["exercises"][number] | undefined
): entry is StrengthEntry {
  return entry?.type === "strength";
}

function getLastSession(
  lastSessionByExercise: LastSessionLookup,
  name: string | undefined
) {
  return lastSessionByExercise.get((name || "").trim().toLowerCase()) || null;
}

function SupersetBlock({
  groupId,
  indices,
  fields,
  entries,
  control,
  lastSessionByExercise,
  onUnlinkSuperset,
  onRemove,
}: SupersetBlockProps) {
  return (
    <div className="space-y-2 rounded-[16px] border-2 border-chart-2/40 bg-chart-2/5 p-2">
      <div className="flex items-center justify-between border-b border-chart-2/30 px-2 pb-2 sm:px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chart-2/20 text-[10px] font-bold text-chart-2">
            S
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-chart-2">Superset</span>
          <span className="text-[10px] text-muted-foreground">{indices.length} exercises</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
          onClick={() => onUnlinkSuperset(indices[0])}
        >
          <Link2Off className="mr-1 h-3.5 w-3.5" />
          Unlink
        </Button>
      </div>

      <div className="space-y-2">
        {indices.map((index, position) => (
          <div key={fields[index]?.id ?? `${groupId}-${index}`} className="relative">
            {position < indices.length - 1 ? (
              <div className="absolute -bottom-2 left-5 z-10 h-4 w-0.5 bg-chart-2/40" />
            ) : null}
            <ExerciseCard
              index={index}
              remove={() => onRemove(index)}
              control={control}
              lastSession={getLastSession(lastSessionByExercise, entries[index]?.name)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkoutForm({
  initialData,
  workoutId,
  formId,
  onDraftChange,
  supersetDialogOpen,
  onSupersetDialogOpenChange,
  metaSheetOpen,
  onMetaSheetOpenChange,
}: WorkoutFormProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { createWorkout, updateWorkout } = useWorkouts();
  const { programs } = usePrograms();
  const searchParams = useSearchParams();
  const autoLinkProgramId = searchParams.get("programId");
  const setDraftEntries = useWorkoutDraftStore((state) => state.setEntries);
  const clearDraft = useWorkoutDraftStore((state) => state.clear);
  const strengthCount = useWorkoutDraftStore((state) => state.strengthEntries.length);
  const cardioCount = useWorkoutDraftStore((state) => state.cardioEntries.length);
  const [internalSupersetOpen, setInternalSupersetOpen] = useState(false);
  const [internalMetaOpen, setInternalMetaOpen] = useState(false);

  const supersetOpen = supersetDialogOpen ?? internalSupersetOpen;
  const setSupersetOpen = onSupersetDialogOpenChange ?? setInternalSupersetOpen;
  const metaOpen = metaSheetOpen ?? internalMetaOpen;
  const setMetaOpen = onMetaSheetOpenChange ?? setInternalMetaOpen;

  const toWorkoutActionInput = (data: WorkoutFormValues): WorkoutActionInput => ({
    name: data.name,
    date: data.date,
    sport_type: data.sport_type,
    location: data.location,
    perceived_exertion: data.perceived_exertion,
    notes: data.notes || null,
    overall_rating: data.overall_rating,
    template_id: data.template_id,
    exercises: mapEntriesToActionExercises(data.exercises),
  });

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema) as Resolver<WorkoutFormValues>,
    defaultValues:
      initialData || {
        name: "",
        notes: "",
        date: new Date(),
        sport_type: "",
        location: "",
        perceived_exertion: undefined,
        overall_rating: undefined,
        template_id: "",
        exercises: [],
        programIds: [],
      },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const watchedExercises = form.watch("exercises");
  const entries = useMemo(() => watchedExercises ?? [], [watchedExercises]);

  const [summaryName, summaryDate, summarySportType, summaryLocation] = useWatch({
    control: form.control,
    name: ["name", "date", "sport_type", "location"],
  });

  const strengthExerciseNames = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .filter((entry) => entry.type !== "cardio")
            .map((entry) => entry.name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      ),
    [entries]
  );

  const lastSessionQuery = useQuery({
    queryKey: [...trainingKeys.sessions(), "last-session", workoutId || null, [...strengthExerciseNames].sort()],
    queryFn: () =>
      getWorkoutExerciseLastSessionAction({
        exercise_names: strengthExerciseNames,
        current_workout_id: workoutId,
      }),
    enabled: Boolean(user?.id) && strengthExerciseNames.length > 0,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const lastSessionByExercise = useMemo(
    () =>
      new Map(
        (lastSessionQuery.data || []).map((item) => [item.exercise_name.trim().toLowerCase(), item] as const)
      ),
    [lastSessionQuery.data]
  );

  const renderGroups = useMemo(() => {
    const seen = new Set<number>();
    const result: RenderGroup[] = [];

    entries.forEach((entry, index) => {
      if (seen.has(index)) return;

      if (isStrengthEntry(entry) && entry.superset_group_id) {
        const linkedIndices = entries.flatMap((candidate, candidateIndex) =>
          isStrengthEntry(candidate) && candidate.superset_group_id === entry.superset_group_id
            ? [candidateIndex]
            : []
        );

        linkedIndices.forEach((candidateIndex) => seen.add(candidateIndex));

        if (linkedIndices.length > 1) {
          result.push({
            kind: "superset",
            groupId: entry.superset_group_id,
            indices: linkedIndices,
          });
          return;
        }
      }

      seen.add(index);
      result.push({ kind: "standalone", index });
    });

    return result;
  }, [entries]);

  useEffect(() => {
    setDraftEntries(entries);
  }, [entries, setDraftEntries]);

  const watchedAllValues = useWatch({ control: form.control });
  useEffect(() => {
    if (watchedAllValues) {
      onDraftChange?.(watchedAllValues as WorkoutFormValues);
    }
  }, [watchedAllValues, onDraftChange]);

  const programOptions =
    ((programs.data as Program[] | undefined) || []).map((program) => ({
      label: program.name,
      value: program.id,
    })) || [];

  function updateExercises(
    updater: (current: WorkoutFormValues["exercises"]) => WorkoutFormValues["exercises"]
  ) {
    const current = form.getValues("exercises") || [];
    const next = updater(current);
    replace(next);
  }

  function handleUnlinkSuperset(index: number) {
    const current = form.getValues("exercises") || [];
    const entry = current[index];
    if (!isStrengthEntry(entry) || !entry.superset_group_id) return;

    updateExercises((currentEntries) =>
      currentEntries.map((candidate) =>
        isStrengthEntry(candidate) && candidate.superset_group_id === entry.superset_group_id
          ? { ...candidate, superset_group_id: undefined }
          : candidate
      )
    );
  }

  function handleRemoveExercise(index: number) {
    const current = form.getValues("exercises") || [];
    const entry = current[index];

    if (isStrengthEntry(entry) && entry.superset_group_id) {
      const remainingLinked = current.flatMap((candidate, candidateIndex) =>
        candidateIndex !== index &&
        isStrengthEntry(candidate) &&
        candidate.superset_group_id === entry.superset_group_id
          ? [candidateIndex]
          : []
      );

      if (remainingLinked.length <= 1) {
        updateExercises((currentEntries) =>
          currentEntries.map((candidate, candidateIndex) =>
            remainingLinked.includes(candidateIndex) && isStrengthEntry(candidate)
              ? { ...candidate, superset_group_id: undefined }
              : candidate
          )
        );
      }
    }

    remove(index);
  }

  async function onFormSubmit(data: WorkoutFormValues) {
    let savedId: string | undefined;

    try {
      const actionInput = toWorkoutActionInput(data);

      if (workoutId) {
        await updateWorkout.mutateAsync({ id: workoutId, data: actionInput });
        savedId = workoutId;
      } else {
        const result = await createWorkout.mutateAsync(actionInput);
        savedId = result?.id;
      }

      if (savedId) {
        const uniqueProgramIds = Array.from(
          new Set([...(autoLinkProgramId ? [autoLinkProgramId] : []), ...(data.programIds || [])])
        );

        if (uniqueProgramIds.length > 0) {
          await linkWorkoutToPrograms(savedId, uniqueProgramIds);
          if (autoLinkProgramId) {
            toast.success("Linked to Program!");
          }
        }
      }

      if (autoLinkProgramId) {
        router.push(`/programs/${autoLinkProgramId}`);
      } else {
        router.push("/workouts");
      }
      clearDraft();
    } catch {
      if (savedId) {
        toast.error("Workout saved, but program linking failed.");
      }
    }
  }

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onFormSubmit)} className="stack-gap">
        <button
          type="button"
          onClick={() => setMetaOpen(true)}
          className="glass-surface !rounded-[14px] w-full border-border/50 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-base font-bold leading-tight">
                {summaryName || <span className="text-muted-foreground">Untitled Workout</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {[
                  summaryDate ? format(summaryDate, "MMM d, yyyy") : null,
                  summarySportType || null,
                  summaryLocation || null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">Edit</span>
          </div>
        </button>

        <div className="stack-gap">
          {fields.length === 0 ? (
            <div className="glass-surface !rounded-[14px] border-border/50 p-6 text-center text-sm text-muted-foreground">
              Add a strength or cardio entry to start building this workout.
            </div>
          ) : null}

          {renderGroups.map((group) => {
            if (group.kind === "superset") {
              return (
                <SupersetBlock
                  key={group.groupId}
                  groupId={group.groupId}
                  indices={group.indices}
                  fields={fields}
                  entries={entries}
                  control={form.control}
                  lastSessionByExercise={lastSessionByExercise}
                  onUnlinkSuperset={handleUnlinkSuperset}
                  onRemove={handleRemoveExercise}
                />
              );
            }

            const index = group.index;
            const entry = entries[index];
            if (!entry) return null;

            if (entry.type === "cardio") {
              return (
                <CardioEntryCard
                  key={fields[index]?.id}
                  index={index}
                  remove={() => handleRemoveExercise(index)}
                  control={form.control}
                />
              );
            }

            return (
              <ExerciseCard
                key={fields[index]?.id}
                index={index}
                remove={() => handleRemoveExercise(index)}
                control={form.control}
                lastSession={getLastSession(lastSessionByExercise, entry.name)}
              />
            );
          })}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ExerciseSelector
              onSelect={(exercise) =>
                append({
                  type: "strength",
                  exercise_id: exercise.id,
                  name: exercise.name,
                  notes: "",
                  sets: [
                    {
                      set_number: 1,
                      reps: 0,
                      weight: 0,
                      rest_seconds: 90,
                      rpe: undefined,
                      rir: undefined,
                      tempo: "",
                      is_warmup: false,
                      is_dropset: false,
                      equipment_type: "",
                      side: undefined,
                      is_completed: false,
                    },
                  ],
                })
              }
            />
            <CardioExerciseSelector
              onSelect={(exercise) =>
                append({
                  type: "cardio",
                  exercise_id: exercise.id,
                  name: exercise.name,
                  cardio_sets: [
                    {
                      set_number: 1,
                      duration: 0,
                      distance: undefined,
                      reps: undefined,
                      calories: undefined,
                      heartRate: undefined,
                    },
                  ],
                  reps: undefined,
                  duration: 0,
                  distance: undefined,
                  calories: undefined,
                  heartRate: undefined,
                  sport_type: "",
                  indoor_outdoor: undefined,
                  weather_conditions: "",
                  device_source: "",
                  avg_cadence_rpm: undefined,
                  avg_power_watts: undefined,
                  avg_speed: undefined,
                  max_speed_kmh: undefined,
                  vo2max_estimate: undefined,
                  training_load_score: undefined,
                  notes: "",
                  sets: [],
                })
              }
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Entries: {strengthCount} strength, {cardioCount} cardio
          </p>
        </div>

        <WorkoutMetaSheet
          open={metaOpen}
          onOpenChange={setMetaOpen}
          control={form.control}
          programOptions={programOptions}
        />
        <SupersetManagerDialog
          open={supersetOpen}
          onOpenChange={setSupersetOpen}
          form={form}
        />
      </form>
    </Form>
  );
}
