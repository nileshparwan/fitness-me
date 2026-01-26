"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

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