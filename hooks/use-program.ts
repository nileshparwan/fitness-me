"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

const PROGRAM_PAGE_SIZE = 24;
type ProgramRow = Database["public"]["Tables"]["training_plans"]["Row"];

type ProgramListItem = Pick<ProgramRow, "id" | "name" | "description" | "created_at"> & {
  training_plan_items: Array<{ count: number }>;
};

export function usePrograms() {
  const supabase = createClient();

  const programs = useQuery({
    queryKey: ["workout-programs"],
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
    queryKey: ["workout-programs", "infinite"],
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
