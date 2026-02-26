"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createWorkoutAction, deleteWorkoutAction, updateWorkoutAction, type WorkoutActionInput } from "@/app/actions/workout";
import { Database } from "@/types/database";

type TrainingSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type StrengthSetId = Pick<Database["public"]["Tables"]["strength_sets"]["Row"], "id">;

export type WorkoutSummary = Pick<
  TrainingSessionRow,
  "id" | "name" | "status" | "date" | "duration_minutes" | "created_at"
> & {
  strength_sets: StrengthSetId[];
};

export function useWorkout(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`*, strength_sets (*), cardio_sessions (*)`)
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

  // Lean payload for list rendering and faster first paint.
  const history = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, name, status, date, duration_minutes, created_at, strength_sets(id)")
        .order("date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as WorkoutSummary[];
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  // 3. Create Workout (Using Server Action)
  const createWorkout = useMutation({
    mutationFn: async (workoutData: WorkoutActionInput) => {
      // Pass data directly to the server action
      return await createWorkoutAction({
        name: workoutData.name,
        date: workoutData.date,
        notes: workoutData.notes,
        overall_rating: workoutData.overall_rating,
        ai_feedback: workoutData.ai_feedback,
        template_id: workoutData.template_id,
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
        overall_rating: data.overall_rating,
        ai_feedback: data.ai_feedback,
        template_id: data.template_id,
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
