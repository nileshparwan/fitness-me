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

type WorkoutLog = Database['public']['Tables']['strength_sets']['Row'];

export default function EditWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: workout, isLoading, error } = useWorkout(id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 p-4">
        <div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-8 w-48" /></div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load workout data.</AlertDescription>
      </Alert>
    );
  }

  // --- TRANSFORMATION LOGIC ---
  // Ensure we pass the logs as strictly typed rows
  const groupedExercises = groupLogsByExercise((workout.strength_sets as WorkoutLog[]) || []);

  const initialData = {
    name: workout.name,
    notes: workout.notes || "",
    date: new Date(workout.date),
    overall_rating: workout.overall_rating ?? undefined,
    ai_feedback: workout.ai_feedback || "",
    template_id: workout.template_id || "",
    exercises: groupedExercises.map((ex) => ({
      exercise_id: ex.exercise_id ?? undefined,
      group_id: ex.group_id || undefined,
      name: ex.name,
      notes: "",
      sets: ex.sets.map((set: WorkoutLog) => ({
        id: set.id,
        set_number: set.set_number,
        reps: set.reps ?? 0,
        weight: set.weight ?? 0,
        rest_seconds: set.rest_seconds ?? undefined,
        tempo: set.tempo || undefined,
        is_warmup: set.is_warmup ?? false,
        is_dropset: set.is_dropset ?? false,
        form_video_url: set.form_video_url || "",
        is_completed: true
      }))
    }))
  };

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      <div className="flex items-center gap-2 px-1">
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
