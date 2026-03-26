"use client";

import { useParams, useRouter } from "next/navigation";
import { WorkoutForm } from "@/components/workout/workout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useWorkout } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { parseCardioNotes } from "@/utils/cardio-notes";

type WorkoutLog = Database['public']['Tables']['strength_sets']['Row'];
type CardioLog = Database["public"]["Tables"]["cardio_sessions"]["Row"];

export default function EditWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: workout, isLoading, error } = useWorkout(id);

  if (isLoading) {
    return (
      <div className="page-shell section-gap mx-auto max-w-3xl">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-8 w-48" /></div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="page-shell">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load workout data.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- TRANSFORMATION LOGIC ---
  // Ensure we pass the logs as strictly typed rows
  const groupedExercises = groupLogsByExercise((workout.strength_sets as WorkoutLog[]) || []);
  const cardioLogs = (workout.cardio_sessions || []) as CardioLog[];

  const orderedEntries = [
    ...groupedExercises.map((ex) => ({
      order: ex.entry_sequence ?? Math.min(...ex.sets.map((set) => new Date(set.created_at || workout.date).getTime())),
      data: {
        type: "strength" as const,
        exercise_id: ex.exercise_id ?? undefined,
        name: ex.name,
        notes: ex.sets.find((set) => Boolean(set.notes))?.notes || "",
        sets: ex.sets.map((set: WorkoutLog) => ({
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
          paused: set.paused ?? false,
          touch_and_go: set.touch_and_go ?? false,
          equipment_type: set.equipment_type || undefined,
          side: (set.side as "bilateral" | "left" | "right" | null) ?? undefined,
          is_completed: true
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
          sport_type: cardio.sport_type || undefined,
          indoor_outdoor: (cardio.indoor_outdoor as "indoor" | "outdoor" | null) ?? undefined,
          weather_conditions: cardio.weather_conditions || undefined,
          device_source: cardio.device_source || undefined,
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

  const initialData = {
    name: workout.name,
    notes: workout.notes || "",
    date: new Date(workout.date),
    sport_type: workout.sport_type || "",
    location: workout.location || "",
    perceived_exertion: workout.perceived_exertion ?? undefined,
    overall_rating: workout.overall_rating ?? undefined,
    template_id: workout.template_id || "",
    exercises: orderedEntries.map((entry) => entry.data),
  };

  return (
    <div className="page-shell section-gap mx-auto max-w-3xl pb-24 md:pb-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="text-lg font-bold">Edit Session</h3>
          <p className="text-xs text-muted-foreground">{new Date(workout.date).toLocaleDateString()}</p>
        </div>
      </div>
      
      <WorkoutForm initialData={initialData} workoutId={id} />
    </div>
  );
}
