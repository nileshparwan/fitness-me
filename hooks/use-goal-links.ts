"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { listExercisesForGoalAction, listProgramsForGoalAction } from "@/app/actions/goals";
import { useDebounce } from "@/hooks/use-debounce";
import { coachKeys } from "@/lib/query-keys-coach";

const PAGE_LIMIT = 15;

export function useExerciseSearch(rawSearch: string) {
  const debouncedSearch = useDebounce(rawSearch.trim(), 300);

  return useInfiniteQuery({
    queryKey: coachKeys.exerciseSearch(debouncedSearch),
    queryFn: ({ pageParam }) =>
      listExercisesForGoalAction({
        search: debouncedSearch || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: PAGE_LIMIT,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useProgramSearch(rawSearch: string) {
  const debouncedSearch = useDebounce(rawSearch.trim(), 300);

  return useInfiniteQuery({
    queryKey: coachKeys.programSearch(debouncedSearch),
    queryFn: ({ pageParam }) =>
      listProgramsForGoalAction({
        search: debouncedSearch || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: PAGE_LIMIT,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}
