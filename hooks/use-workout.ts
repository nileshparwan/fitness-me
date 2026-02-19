"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createWorkoutAction, deleteWorkoutAction, updateWorkoutAction, type WorkoutActionInput } from "@/app/actions/workout";

export function useWorkout(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select(`*, workout_logs (*), cardio_logs (*)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useWorkouts() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // 1. Fetch History (Read operations usually stay client-side in hooks for React Query cache)
  const history = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select(`*, workout_logs (*)`)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 3. Create Workout (Using Server Action)
  const createWorkout = useMutation({
    mutationFn: async (workoutData: WorkoutActionInput) => {
      // Pass data directly to the server action
      return await createWorkoutAction({
        name: workoutData.name,
        date: workoutData.date,
        notes: workoutData.notes,
        exercises: workoutData.exercises,
        status: "active" // Default per your requirement
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout created!");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // 4. Update Workout (Using Server Action)
  const updateWorkout = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkoutActionInput> }) => {
      // Pass data directly to server action
      // Handles both full updates (with exercises) and partial updates (name/status only)
      await updateWorkoutAction(id, {
        name: data.name,
        date: data.date,
        notes: data.notes,
        status: data.status,
        exercises: data.exercises 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout", variables.id] });
      toast.success("Workout updated!");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // 5. Delete Workout (Using Server Action)
  const deleteWorkout = useMutation({
    // Updated to accept string array for bulk delete capability
    mutationFn: async (ids: string | string[]) => {
      await deleteWorkoutAction(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Deleted successfully");
      // Optional: Only redirect if we were on the detail page, 
      // but if deleting from list, no redirect needed.
      // You might want to check pathname here or remove this line.
      // router.push("/workouts"); 
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  return { history, createWorkout, updateWorkout, deleteWorkout };
}
