"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Layers, Pencil, Save } from "lucide-react";

import { WorkoutAiTextTab } from "@/components/workout/workout-ai-text-tab";
import { WorkoutForm } from "@/components/workout/workout-form";
import { WorkoutPreview } from "@/components/workout/workout-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkout } from "@/hooks/use-workout";
import { parseCardioNotes } from "@/utils/cardio-notes";
import { groupLogsByExercise } from "@/utils/log";
import type { Database } from "@/types/database";
import type { WorkoutFormValues } from "@/types/workout";

type WorkoutLog = Database["public"]["Tables"]["strength_sets"]["Row"];
type CardioLog = Database["public"]["Tables"]["cardio_sessions"]["Row"];
type ActiveTab = "builder" | "preview" | "ai";

function buildInitialData(
  workout: Database["public"]["Tables"]["training_sessions"]["Row"] & {
    strength_sets?: WorkoutLog[] | null;
    cardio_sessions?: CardioLog[] | null;
  }
): WorkoutFormValues {
  const groupedExercises = groupLogsByExercise((workout.strength_sets as WorkoutLog[]) || []);
  const cardioLogs = (workout.cardio_sessions || []) as CardioLog[];

  const orderedEntries = [
    ...groupedExercises.map((exercise) => ({
      order: exercise.entry_sequence ?? Math.min(...exercise.sets.map((set) => new Date(set.created_at || workout.date).getTime())),
      data: {
        type: "strength" as const,
        exercise_id: exercise.exercise_id ?? undefined,
        name: exercise.name,
        notes: exercise.sets.find((set) => Boolean(set.notes))?.notes || "",
        superset_group_id: exercise.group_id ?? undefined,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          set_number: set.set_number,
          reps: set.reps ?? 0,
          weight: set.weight ?? 0,
          rest_seconds: set.rest_seconds ?? undefined,
          rpe: set.rpe ?? undefined,
          rir: set.rir ?? undefined,
          tempo: set.tempo || undefined,
          is_warmup: set.is_warmup ?? false,
          is_dropset: set.is_dropset ?? false,
          equipment_type: set.equipment_type || undefined,
          side: (set.side as "bilateral" | "left" | "right" | null) ?? undefined,
          is_completed: true,
        })),
      },
    })),
    ...cardioLogs.map((cardio) => {
      const parsedCardioNotes = parseCardioNotes(cardio.notes);
      return {
        order: cardio.entry_sequence ?? new Date(cardio.created_at || workout.date).getTime(),
        data: {
          type: "cardio" as const,
          name: cardio.activity_type || "Cardio",
          cardio_sets:
            parsedCardioNotes.cardioSets && parsedCardioNotes.cardioSets.length > 0
              ? parsedCardioNotes.cardioSets
              : [
                  {
                    set_number: 1,
                    duration: cardio.duration_minutes || 0,
                    distance: cardio.distance ?? undefined,
                    reps: cardio.reps ?? undefined,
                    calories: cardio.calories_burned ?? undefined,
                    heartRate: cardio.average_heart_rate ?? undefined,
                  },
                ],
          reps: cardio.reps ?? undefined,
          duration: cardio.duration_minutes || 0,
          distance: cardio.distance ?? undefined,
          calories: cardio.calories_burned ?? undefined,
          heartRate: cardio.average_heart_rate ?? undefined,
          sport_type: cardio.sport_type || "",
          indoor_outdoor: (cardio.indoor_outdoor as "indoor" | "outdoor" | null) ?? undefined,
          weather_conditions: cardio.weather_conditions || "",
          device_source: cardio.device_source || "",
          avg_cadence_rpm: cardio.avg_cadence_rpm ?? undefined,
          avg_power_watts: cardio.avg_power_watts ?? undefined,
          avg_speed: cardio.avg_speed ?? undefined,
          max_speed_kmh: cardio.max_speed_kmh ?? undefined,
          vo2max_estimate: cardio.vo2max_estimate ?? undefined,
          training_load_score: cardio.training_load_score ?? undefined,
          notes: parsedCardioNotes.notes,
          sets: [],
        },
      };
    }),
  ].sort((a, b) => a.order - b.order);

  return {
    name: workout.name,
    notes: workout.notes || "",
    date: new Date(workout.date),
    sport_type: workout.sport_type || "",
    location: workout.location || "",
    perceived_exertion: workout.perceived_exertion ?? undefined,
    overall_rating: workout.overall_rating ?? undefined,
    template_id: workout.template_id || "",
    programIds: [],
    exercises: orderedEntries.map((entry) => entry.data),
  };
}

export default function EditWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: workout, isLoading, error } = useWorkout(id);
  const [activeTab, setActiveTab] = useState<ActiveTab>("builder");
  const [supersetDialogOpen, setSupersetDialogOpen] = useState(false);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);

  const baseData = useMemo(() => (workout ? buildInitialData(workout) : null), [workout]);
  const [liveData, setLiveData] = useState<WorkoutFormValues | null>(null);
  const draftData = liveData ?? baseData;

  if (isLoading) {
    return (
      <div className="page-shell section-gap mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-7 w-52 rounded-xl" />
        </div>
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="page-shell">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load workout. Go back and try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Ensure draftData exists for preview/form. If it's null (it shouldn't be at this point)
  // we could return a small fallback, but workout existence + useMemo makes it safe.
  const resolvedDraftData = draftData!;

  return (
    <div className="page-shell mx-auto max-w-3xl pb-24 md:pb-10">
      <div className="section-gap">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Edit Workout</h1>
              <p className="text-xs text-muted-foreground">{new Date(workout.date).toLocaleDateString()}</p>
            </div>
          </div>
          {activeTab === "builder" ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-3"
                onClick={() => setMetaSheetOpen(true)}
              >
                <Pencil className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl px-3"
                onClick={() => setSupersetDialogOpen(true)}
              >
                <Layers className="mr-0 h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Superset</span>
              </Button>
              <Button form="workout-edit-form" type="submit" className="accent-strong h-9 rounded-xl px-5 text-black">
                <Save className="mr-0 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="ai">AI Text</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "builder" ? (
          <WorkoutForm
            formId="workout-edit-form"
            initialData={resolvedDraftData}
            workoutId={id}
            onDraftChange={setLiveData}
            supersetDialogOpen={supersetDialogOpen}
            onSupersetDialogOpenChange={setSupersetDialogOpen}
            metaSheetOpen={metaSheetOpen}
            onMetaSheetOpenChange={setMetaSheetOpen}
          />
        ) : null}
        {activeTab === "preview" ? <WorkoutPreview workoutId={id} initialData={resolvedDraftData} /> : null}
        {activeTab === "ai" ? <WorkoutAiTextTab /> : null}
      </div>
    </div>
  );
}
