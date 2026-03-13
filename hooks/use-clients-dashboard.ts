"use client";

import { useEffect, useMemo } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { getClientsDashboardAction } from "@/app/actions/clients-dashboard";
import {
  DEFAULT_COACH_DASHBOARD_KEY_PARAMS,
  coachKeys,
  normalizeCoachDashboardKeyParams,
  type CoachDashboardKeyParams,
} from "@/lib/query-keys-coach";
import { createClient } from "@/lib/supabase/client";

export function useClientsDashboard(params?: CoachDashboardKeyParams) {
  const attentionLimit = params?.attention_limit;
  const sessionsLimit = params?.sessions_limit;
  const activityLimit = params?.activity_limit;
  const goalsLimit = params?.goals_limit;
  const notesLimit = params?.notes_limit;
  const paymentsLimit = params?.payments_limit;

  const normalizedParams = useMemo(
    () =>
      normalizeCoachDashboardKeyParams({
        attention_limit: attentionLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.attention_limit,
        sessions_limit: sessionsLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.sessions_limit,
        activity_limit: activityLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.activity_limit,
        goals_limit: goalsLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.goals_limit,
        notes_limit: notesLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.notes_limit,
        payments_limit: paymentsLimit ?? DEFAULT_COACH_DASHBOARD_KEY_PARAMS.payments_limit,
      }),
    [
      activityLimit,
      attentionLimit,
      goalsLimit,
      notesLimit,
      paymentsLimit,
      sessionsLimit,
    ]
  );

  return useQuery({
    queryKey: coachKeys.dashboardSnapshot(normalizedParams),
    queryFn: () => getClientsDashboardAction(normalizedParams),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientsDashboardRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let channel: RealtimeChannel = supabase.channel("public:clients_dashboard");
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() });
      }, 150);
    };

    const watchedTables = [
      "clients",
      "training_sessions",
      "client_checkins",
      "coach_notes",
      "client_payments",
      "fitness_goals",
      "goal_progress_history",
      "analytics_events",
    ] as const;

    for (const table of watchedTables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleInvalidate
      );
    }

    channel.subscribe();

    return () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
