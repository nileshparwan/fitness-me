"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function usePrograms() {
  const supabase = createClient();

  const programs = useQuery({
    queryKey: ["workout-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("*, training_plan_items(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return { programs };
}
