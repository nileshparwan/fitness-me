"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercises, createExercise, updateExercise, deleteExercise } from "@/app/actions/exercises";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { toast } from "sonner"; 
import { createClient } from "@/lib/supabase/client";

// Centralized keys ensure consistency across your app
export const exerciseKeys = {
  all: ["exercises"] as const,
  list: (search?: string) => [...exerciseKeys.all, "list", { search }] as const,
  infinite: (search?: string) => [...exerciseKeys.all, "infinite", { search }] as const,
};

export function useExercises(search?: string) {
  const supabase = createClient();

  return useQuery({
    // UPDATE: specific scope for simple lists
    queryKey: exerciseKeys.list(search),
    queryFn: async () => {
      let query = supabase
        .from("exercise_library")
        .select("*")
        .order("name");

      if (search) {
        // Safe search syntax for array columns
        query = query.or(`name.ilike.%${search}%,aliases.cs.{"${search}"}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // FIX: Always return an array to prevent "map is not a function" errors
      return data || []; 
    },
    staleTime: 1000 * 60 * 60, 
  });
}

export function useInfiniteQueryExercises(search: string) {
  return useInfiniteQuery({
    // UPDATE: specific scope for infinite lists
    queryKey: exerciseKeys.infinite(search),
    queryFn: ({ pageParam = 0 }) => getExercises({ pageParam, search }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function useExerciseMutations() {
  const queryClient = useQueryClient();

  // Helper to refresh all exercise data
  const invalidateExercises = () => {
    // This invalidates everything starting with ["exercises"]
    // It will catch both ["exercises", "list", ...] AND ["exercises", "infinite", ...]
    queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
  };

  const create = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      invalidateExercises();
      toast.success("Exercise created");
    },
    onError: (error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExerciseFormValues }) =>
      updateExercise(id, values),
    onSuccess: () => {
      invalidateExercises();
      toast.success("Exercise updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      invalidateExercises();
      toast.success("Exercise deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  return { create, update, remove };
}