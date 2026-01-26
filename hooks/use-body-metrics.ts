"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useBodyMetrics() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const metrics = useQuery({
    queryKey: ["body-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMetric = useMutation({
    mutationFn: async (newMetric: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from("body_metrics").upsert({
        user_id: user.id,
        ...newMetric
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["body-metrics"] });
    },
  });

  return { metrics, addMetric };
}