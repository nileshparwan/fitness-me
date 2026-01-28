"use client";

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercises, createExercise, updateExercise, deleteExercise } from "@/app/actions/exercises";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { toast } from "sonner"; // Assuming you use sonner or similar
import { createClient } from "@/lib/supabase/client";

export function useExercises(search?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["exercises", search],
    queryFn: async () => {
      let query = supabase
        .from("exercise_library")
        .select("*")
        .order("name");

      if (search) {
        // Search by name OR aliases (using Supabase text search)
        query = query.or(`name.ilike.%${search}%,aliases.cs.{${search}}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache (exercises don't change often)
  });
}

export function useInfiniteQueryExercises(search: string) {
  return useInfiniteQuery({
    queryKey: ["exercises", search],
    queryFn: ({ pageParam = 0 }) => getExercises({ pageParam, search }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function useExerciseMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise created");
    },
    onError: (error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExerciseFormValues }) =>
      updateExercise(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      toast.success("Exercise deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  return { create, update, remove };
}