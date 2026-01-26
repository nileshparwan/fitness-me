"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useWorkouts() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  // 1. Fetch Workout History
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

  // 2. Fetch Single Workout
  const getWorkout = (id: string) => useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select(`*, workout_logs (*)`)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // 3. Create Workout
  const createWorkout = useMutation({
    mutationFn: async (workoutData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert Header
      const { data: workout, error: wError } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          name: workoutData.name,
          date: workoutData.date.toISOString(),
          status: "completed",
          notes: workoutData.notes
        })
        .select()
        .single();

      if (wError) throw wError;

      // Insert Logs
      const logs = workoutData.exercises.flatMap((ex: any) => 
        ex.sets.map((set: any) => ({
          workout_id: workout.id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.name,
          set_number: set.set_number,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe,
        }))
      );

      if (logs.length > 0) {
        const { error: lError } = await supabase.from("workout_logs").insert(logs);
        if (lError) throw lError;
      }
      return workout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout saved!");
    },
  });

  // 4. Update Workout
  const updateWorkout = useMutation({
    mutationFn: async ({ id, data: workoutData }: { id: string; data: any }) => {
      // Update Header
      const { error: wError } = await supabase
        .from("workouts")
        .update({
          name: workoutData.name,
          date: workoutData.date.toISOString(),
          notes: workoutData.notes
        })
        .eq("id", id);

      if (wError) throw wError;

      // Update Logs: Strategy -> Delete all old logs for this workout, insert new ones.
      // This is safer than trying to diff individual sets.
      await supabase.from("workout_logs").delete().eq("workout_id", id);

      const logs = workoutData.exercises.flatMap((ex: any) => 
        ex.sets.map((set: any) => ({
          workout_id: id,
          exercise_id: ex.exercise_id,
          exercise_name: ex.name,
          set_number: set.set_number,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe,
        }))
      );

      if (logs.length > 0) {
        const { error: lError } = await supabase.from("workout_logs").insert(logs);
        if (lError) throw lError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workout", variables.id] });
      toast.success("Workout updated!");
    },
  });

  // 5. Delete Workout
  const deleteWorkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast.success("Workout deleted");
      router.push("/workouts");
    },
  });

  return { history, getWorkout, createWorkout, updateWorkout, deleteWorkout };
}