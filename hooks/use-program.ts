"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function usePrograms() {
  const supabase = createClient();

  // 1. Fetch All Programs (Folders)
  const programs = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*, program_items(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Single Program with Nested Workouts
  const getProgram = (id: string) => useQuery({
    queryKey: ["program", id],
    queryFn: async () => {
      // We use explicit joining here. 
      // Ensure your Supabase Foreign Keys are named correctly.
      const { data, error } = await supabase
        .from("programs")
        .select(`
          *,
          program_items (
            id,
            program_id,
            workout_id,
            order_index,
            day_label,
            workouts (
              id,
              name,
              duration_minutes,
              status,
              date
            )
          )
        `)
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error fetching program:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!id,
  });

  return { programs, getProgram };
}