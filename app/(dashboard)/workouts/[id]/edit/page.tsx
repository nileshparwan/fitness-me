"use client";

import { useParams } from "next/navigation";
import { WorkoutForm } from "@/components/workout/workout-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useWorkouts } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";

export default function EditWorkoutPage() {
  const { id } = useParams() as { id: string };
  const { getWorkout } = useWorkouts();
  const { data: workout, isLoading, error } = getWorkout(id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load workout data.</AlertDescription>
      </Alert>
    );
  }

  // --- TRANSFORMATION LOGIC ---
  // The DB returns flat logs, but the form expects nested exercises.
  const groupedExercises = groupLogsByExercise(workout.workout_logs);

  // Match the shape of WorkoutFormValues
  const initialData = {
    name: workout.name,
    notes: workout.notes || "",
    date: new Date(workout.date), // Ensure Date object
    exercises: groupedExercises.map((ex: any) => ({
      exercise_id: ex.exercise_id,
      name: ex.name,
      notes: "", // Notes per exercise not strictly in DB schema yet, empty default
      sets: ex.sets.map((set: any) => ({
        id: set.id, // Keep ID to help react-hook-form (though we delete/re-insert usually)
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rpe: set.rpe || 0,
        is_completed: true
      }))
    }))
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Edit Workout</h3>
        <p className="text-sm text-muted-foreground">
          Modify your past session details.
        </p>
      </div>
      
      {/* Pass workoutId to trigger "Update" mode */}
      <WorkoutForm initialData={initialData} workoutId={id} />
    </div>
  );
}