"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useGoals() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const activeGoal = useQuery({
    queryKey: ["goals", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("status", "active")
        .single();
      
      // It's okay if no active goal exists
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const setGoal = useMutation({
    mutationFn: async (goalData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // Deactivate old goals
      await supabase
        .from("goals")
        .update({ status: "completed" })
        .eq("user_id", user.id);

      // Create new one
      const { error } = await supabase
        .from("goals")
        .insert({ user_id: user.id, ...goalData, status: "active" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    }
  });

  return { activeGoal, setGoal };
}