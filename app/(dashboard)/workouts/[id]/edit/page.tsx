"use client";

import { useParams } from "next/navigation";
import { WorkoutForm } from "@/components/workout/workout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useWorkouts } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function EditWorkoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { getWorkout } = useWorkouts();
  const { data: workout, isLoading, error } = getWorkout(id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 p-4">
        <div className="flex items-center gap-4">
           <Skeleton className="h-10 w-10 rounded-full" />
           <Skeleton className="h-8 w-48" />
        </div>
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
  const groupedExercises = groupLogsByExercise(workout.workout_logs);

  const initialData = {
    name: workout.name,
    notes: workout.notes || "",
    date: new Date(workout.date),
    exercises: groupedExercises.map((ex: any) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      notes: "",
      sets: ex.sets.map((set: any) => ({
        id: set.id,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe || 0,
        is_completed: true
      }))
    }))
  };

  return (
    <div className="space-y-6 pb-24 md:pb-10">
      {/* Mobile Back Button / Header */}
      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="text-lg font-bold">Edit Session</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(workout.date).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <WorkoutForm initialData={initialData} workoutId={id} />
    </div>
  );
}