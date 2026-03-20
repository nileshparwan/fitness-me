"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { commentKeys, ticketKeys, ticketSubscriptionKeys } from "@/lib/query-keys";
import type { Database } from "@/types/database";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketCommentRow = Database["public"]["Tables"]["ticket_comments"]["Row"];

type UseSupportTicketsRealtimeSyncOptions = {
  ticketId?: string;
  fallbackPollIntervalMs?: number;
  debounceMs?: number;
};

function getCommentTicketId(
  payload: RealtimePostgresChangesPayload<TicketCommentRow>
) {
  const next = payload.new as TicketCommentRow | Record<string, unknown> | null;
  const prev = payload.old as TicketCommentRow | Record<string, unknown> | null;
  if (next && typeof next === "object" && "ticket_id" in next && typeof next.ticket_id === "string") {
    return next.ticket_id;
  }
  if (prev && typeof prev === "object" && "ticket_id" in prev && typeof prev.ticket_id === "string") {
    return prev.ticket_id;
  }
  return null;
}

export function useSupportTicketsRealtimeSync(
  options: UseSupportTicketsRealtimeSyncOptions = {}
) {
  const queryClient = useQueryClient();
  const { ticketId, fallbackPollIntervalMs = 15_000, debounceMs = 180 } = options;

  useEffect(() => {
    const supabase = createClient();
    const normalizedFallbackPollIntervalMs = Math.max(10_000, fallbackPollIntervalMs);
    const normalizedDebounceMs = Math.max(100, debounceMs);

    type PendingInvalidations = {
      lists: boolean;
      adminLists: boolean;
      detailIds: Set<string>;
      commentIds: Set<string>;
      subscriptionIds: Set<string>;
    };

    const pending: PendingInvalidations = {
      lists: false,
      adminLists: false,
      detailIds: new Set<string>(),
      commentIds: new Set<string>(),
      subscriptionIds: new Set<string>(),
    };
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushInvalidations = async () => {
      const lists = pending.lists;
      const adminLists = pending.adminLists;
      const detailIds = Array.from(pending.detailIds);
      const commentIds = Array.from(pending.commentIds);
      const subscriptionIds = Array.from(pending.subscriptionIds);

      pending.lists = false;
      pending.adminLists = false;
      pending.detailIds.clear();
      pending.commentIds.clear();
      pending.subscriptionIds.clear();

      const tasks: Array<Promise<unknown>> = [];
      if (lists) tasks.push(queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }));
      if (adminLists) tasks.push(queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }));
      for (const id of detailIds) {
        tasks.push(queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }));
      }
      for (const id of commentIds) {
        tasks.push(queryClient.invalidateQueries({ queryKey: commentKeys.list(id) }));
      }
      for (const id of subscriptionIds) {
        tasks.push(queryClient.invalidateQueries({ queryKey: ticketSubscriptionKeys.detail(id) }));
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushInvalidations();
      }, normalizedDebounceMs);
    };

    const queueListInvalidation = (includeAdmin = false) => {
      pending.lists = true;
      if (includeAdmin) pending.adminLists = true;
      scheduleFlush();
    };

    const queueDetailInvalidation = (
      id: string,
      options?: {
        includeSubscription?: boolean;
      }
    ) => {
      pending.detailIds.add(id);
      if (options?.includeSubscription) {
        pending.subscriptionIds.add(id);
      }
      scheduleFlush();
    };

    const queueCommentInvalidation = (id: string) => {
      pending.commentIds.add(id);
      pending.detailIds.add(id);
      scheduleFlush();
    };

    const queueSnapshotInvalidation = () => {
      if (ticketId) {
        queueDetailInvalidation(ticketId, { includeSubscription: true });
        queueCommentInvalidation(ticketId);
        return;
      }
      queueListInvalidation(false);
    };

    const shouldPoll =
      typeof document !== "undefined"
        ? () =>
            document.visibilityState === "visible" &&
            (typeof navigator === "undefined" || navigator.onLine)
        : () => true;

    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    const startFallbackPolling = () => {
      if (fallbackTimer) return;
      fallbackTimer = setInterval(() => {
        if (!shouldPoll()) return;
        queueSnapshotInvalidation();
      }, normalizedFallbackPollIntervalMs);
    };
    const stopFallbackPolling = () => {
      if (!fallbackTimer) return;
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    };

    // If a channel never reaches SUBSCRIBED quickly, start a conservative fallback poll.
    let hasSubscribed = false;
    const subscribeWatchdog = setTimeout(() => {
      if (!hasSubscribed) startFallbackPolling();
    }, 8_000);

    const channelName = ticketId
      ? `public:tickets_and_comments:detail:${ticketId}`
      : "public:tickets_and_comments:list";
    let channel: RealtimeChannel = supabase.channel(channelName);

    const ticketChangeFilter = ticketId
      ? { event: "*" as const, schema: "public" as const, table: "tickets" as const, filter: `id=eq.${ticketId}` }
      : { event: "*" as const, schema: "public" as const, table: "tickets" as const };

    channel = channel.on(
      "postgres_changes",
      ticketChangeFilter,
      async (payload: RealtimePostgresChangesPayload<TicketRow>) => {
        const changedId =
          (payload.new as TicketRow | null)?.id ||
          (payload.old as TicketRow | null)?.id ||
          null;
        if (ticketId) {
          queueDetailInvalidation(ticketId, { includeSubscription: true });
          return;
        }
        if (changedId) {
          pending.detailIds.add(changedId);
        }
        queueListInvalidation(false);
      }
    );

    if (ticketId) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticketId}` },
        async (payload: RealtimePostgresChangesPayload<TicketCommentRow>) => {
          const changedTicketId = getCommentTicketId(payload) || ticketId;
          queueCommentInvalidation(changedTicketId);
        }
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        hasSubscribed = true;
        clearTimeout(subscribeWatchdog);
        stopFallbackPolling();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        startFallbackPolling();
      }
    });

    return () => {
      clearTimeout(subscribeWatchdog);
      stopFallbackPolling();
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [queryClient, ticketId, fallbackPollIntervalMs, debounceMs]);
}
