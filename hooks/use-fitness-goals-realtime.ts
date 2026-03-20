"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { coachKeys } from "@/lib/query-keys-coach";
import { createClient } from "@/lib/supabase/client";

export function useFitnessGoalsRealtimeSync(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({
          queryKey: [...coachKeys.all, "my-goals"],
        });
      }, 180);
    };

    const channel = supabase
      .channel(`goal-sync:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitness_goals",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          scheduleInvalidate();
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimer) {
        clearTimeout(invalidateTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}

export function useClientFitnessGoalsRealtimeSync(
  clientLinkedUserId: string | null,
  clientId: string | null
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clientLinkedUserId || !clientId) return;

    const supabase = createClient();
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({
          queryKey: [...coachKeys.clients(), "goals", clientId],
        });
      }, 180);
    };

    const channel = supabase
      .channel(`goal-sync:client:${clientLinkedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitness_goals",
          filter: `user_id=eq.${clientLinkedUserId}`,
        },
        () => {
          scheduleInvalidate();
        }
      )
      .subscribe();

    return () => {
      if (invalidateTimer) {
        clearTimeout(invalidateTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [clientLinkedUserId, clientId, queryClient]);
}
