"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignProgramToClientAction,
  listProgramAssigneesAction,
  type ProgramAssigneeOption,
} from "@/app/actions/program";
import { createClient } from "@/lib/supabase/client";
import { trainingKeys } from "@/lib/query-keys-training";
import { useDebounce } from "@/hooks/use-debounce";
import { Database } from "@/types/database";

const PROGRAM_PAGE_SIZE = 24;
const PROGRAM_ASSIGNEES_PAGE_SIZE = 15;

type ProgramRow = Database["public"]["Tables"]["training_plans"]["Row"];

type ProgramListItem = Pick<ProgramRow, "id" | "name" | "description" | "created_at"> & {
  training_plan_items: Array<{ count: number }>;
};

export function usePrograms() {
  const supabase = createClient();

  const programs = useQuery({
    queryKey: trainingKeys.plansList(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return { programs };
}

export function useInfinitePrograms() {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: trainingKeys.plansInfinite(),
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PROGRAM_PAGE_SIZE;
      const to = from + PROGRAM_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("training_plans")
        .select("id, name, description, created_at, training_plan_items(count)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data || []) as ProgramListItem[];
      return {
        data: rows,
        nextPage: rows.length === PROGRAM_PAGE_SIZE ? pageParam + 1 : undefined,
        total: count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useProgramAssignees(programId: string, rawSearch: string, enabled = true) {
  const debouncedSearch = useDebounce(rawSearch.trim(), 250);

  return useInfiniteQuery({
    queryKey: trainingKeys.planAssignees(programId, debouncedSearch),
    enabled: Boolean(programId) && enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) =>
      listProgramAssigneesAction({
        program_id: programId,
        search: debouncedSearch || undefined,
        page: pageParam,
        page_size: PROGRAM_ASSIGNEES_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.has_more ? allPages.length : undefined),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProgramAssigneeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignProgramToClientAction,
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingKeys.plans() }),
        queryClient.invalidateQueries({ queryKey: trainingKeys.planAssigneesBase(payload.program_id) }),
      ]);
    },
  });
}

export function flattenProgramAssigneePages(data: { pages: Array<{ items: ProgramAssigneeOption[] }> } | undefined) {
  if (!data) return [] as ProgramAssigneeOption[];
  const seen = new Set<string>();
  const rows: ProgramAssigneeOption[] = [];
  for (const page of data.pages) {
    for (const item of page.items || []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      rows.push(item);
    }
  }
  return rows;
}
