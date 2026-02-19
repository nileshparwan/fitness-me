"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function usePrograms() {
  const supabase = createClient();

  const programs = useQuery({
    queryKey: ["workout-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*, program_items(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return { programs };
}
