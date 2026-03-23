"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createWorkoutAction,
  deleteWorkoutAction,
  listWorkoutExecutionSubjectsAction,
  logWorkoutExecutionAction,
  updateWorkoutAction,
  type WorkoutActionInput,
} from "@/app/actions/workout";
import { trainingKeys } from "@/lib/query-keys-training";
import { progressKeys } from "@/lib/query-keys-progress";
import { Database } from "@/types/database";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { useDebounce } from "@/hooks/use-debounce";

type TrainingSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type StrengthSetId = Pick<Database["public"]["Tables"]["strength_sets"]["Row"], "id">;

type WorkoutSummary = Pick<
  TrainingSessionRow,
  "id" | "name" | "status" | "date" | "duration_minutes" | "created_at"
> & {
  strength_sets: StrengthSetId[];
};

const WORKOUT_EXECUTION_SUBJECTS_PAGE_SIZE = 15;

type WorkoutExecutionSubject = {
  id: string;
  full_name: string;
  is_self: boolean;
};

export function useWorkout(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: trainingKeys.session(id),
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
    queryKey: trainingKeys.sessions(),
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
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions() });
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
      await withToastFeedback(
        updateWorkoutAction(id, {
          name: data.name,
          date: data.date,
          notes: data.notes,
          status: data.status,
          overall_rating: data.overall_rating,
          ai_feedback: data.ai_feedback,
          template_id: data.template_id,
          exercises: data.exercises 
        }),
        {
          loading: "Updating workout...",
          success: "Workout updated!",
          error: "Unable to update workout",
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions() });
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(variables.id) });
    }
  });

  // 5. Delete Workout (Using Server Action)
  const deleteWorkout = useMutation({
    // Updated to accept string array for bulk delete capability
    mutationFn: async (ids: string | string[]) => {
      await withToastFeedback(deleteWorkoutAction(ids), {
        loading: "Deleting workout...",
        success: "Deleted successfully",
        error: "Unable to delete workout",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions() });
      // Optional: Only redirect if we were on the detail page, 
      // but if deleting from list, no redirect needed.
      // You might want to check pathname here or remove this line.
      // router.push("/workouts"); 
    }
  });

  return { history, createWorkout, updateWorkout, deleteWorkout };
}

export function useWorkoutExecutionSubjects(rawSearch: string, enabled = true) {
  const search = useDebounce(rawSearch.trim(), 250);

  return useInfiniteQuery({
    queryKey: trainingKeys.executionSubjectsSearch(search),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) =>
      listWorkoutExecutionSubjectsAction({
        search: search || undefined,
        page: pageParam,
        page_size: WORKOUT_EXECUTION_SUBJECTS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.has_more ? allPages.length : undefined),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function flattenWorkoutExecutionSubjectPages(
  data: { pages: Array<{ items: WorkoutExecutionSubject[] }> } | undefined
) {
  if (!data) return [] as WorkoutExecutionSubject[];
  const seen = new Set<string>();
  const rows: WorkoutExecutionSubject[] = [];
  for (const page of data.pages) {
    for (const item of page.items || []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      rows.push(item);
    }
  }
  return rows;
}

export function useLogWorkoutExecutionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logWorkoutExecutionAction,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingKeys.sessions() }),
        queryClient.invalidateQueries({ queryKey: trainingKeys.session(payload.workout_id) }),
        queryClient.invalidateQueries({ queryKey: progressKeys.all }),
      ]);
    },
  });
}
