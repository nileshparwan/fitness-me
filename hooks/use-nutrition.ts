"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNutrition(date: Date) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const dailyLogs = useQuery({
    queryKey: ["nutrition", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("date", dateStr);
      
      if (error) throw error;
      return data;
    },
  });

  const addFood = useMutation({
    mutationFn: async (food: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: user.id,
        date: dateStr,
        ...food
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition", dateStr] });
    }
  });

  return { dailyLogs, addFood };
}