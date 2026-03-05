"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercises, createExercise, updateExercise, deleteExercise } from "@/app/actions/exercises";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { toast } from "sonner"; 

// Centralized keys ensure consistency across your app
const exerciseKeys = {
  all: ["exercises"] as const,
  infinite: (search?: string, category?: string) =>
    [...exerciseKeys.all, "infinite", { search, category }] as const,
};

export function useInfiniteQueryExercises(search: string, category?: string) {
  return useInfiniteQuery({
    // UPDATE: specific scope for infinite lists
    queryKey: exerciseKeys.infinite(search, category),
    queryFn: ({ pageParam = 0 }) => getExercises({ pageParam, search, category }),
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
