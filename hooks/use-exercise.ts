"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercises, createExercise, updateExercise, deleteExercise } from "@/app/actions/exercises";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

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
    mutationFn: (values: ExerciseFormValues) =>
      withToastFeedback(createExercise(values), {
        loading: "Creating exercise...",
        success: "Exercise created",
        error: "Unable to create exercise",
      }),
    onSuccess: () => {
      invalidateExercises();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExerciseFormValues }) =>
      withToastFeedback(updateExercise(id, values), {
        loading: "Updating exercise...",
        success: "Exercise updated",
        error: "Unable to update exercise",
      }),
    onSuccess: () => {
      invalidateExercises();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      withToastFeedback(deleteExercise(id), {
        loading: "Deleting exercise...",
        success: "Exercise deleted",
        error: "Unable to delete exercise",
      }),
    onSuccess: () => {
      invalidateExercises();
    },
  });

  return { create, update, remove };
}
