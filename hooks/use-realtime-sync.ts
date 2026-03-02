"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { commentKeys, ticketKeys } from "@/lib/query-keys";
import type { Database } from "@/types/database";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketCommentRow = Database["public"]["Tables"]["ticket_comments"]["Row"];

type UseRealtimeSyncOptions = {
  ticketId?: string;
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

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { ticketId } = options;

  useEffect(() => {
    const supabase = createClient();

    const invalidateTicketRelated = async (id?: string | null) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
        id ? queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }) : Promise.resolve(),
      ]);
    };

    const invalidateCommentRelated = async (id?: string | null) => {
      if (id) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: commentKeys.list(id) }),
          queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
          queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
        ]);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
      ]);
    };

    let channel: RealtimeChannel = supabase.channel("public:tickets_and_comments");

    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tickets" },
      async (payload: RealtimePostgresChangesPayload<TicketRow>) => {
        const changedId =
          (payload.new as TicketRow | null)?.id ||
          (payload.old as TicketRow | null)?.id ||
          null;
        await invalidateTicketRelated(changedId);
      }
    );

    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ticket_comments" },
      async (payload: RealtimePostgresChangesPayload<TicketCommentRow>) => {
        const changedTicketId = getCommentTicketId(payload);
        const targetTicketId = changedTicketId || ticketId || null;
        await invalidateCommentRelated(targetTicketId);
      }
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, ticketId]);
}
