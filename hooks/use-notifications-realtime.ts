"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

import type { NotificationRow } from "@/app/actions/notifications";
import { notificationKeys } from "@/lib/query-keys";
import { createClient } from "@/lib/supabase/client";
import type { Database, Json, NotificationType } from "@/types/database";

type NotificationInsertRow = Database["public"]["Tables"]["notifications"]["Row"];

const KNOWN_NOTIFICATION_TYPES = new Set<NotificationType>([
  "goal_achieved",
  "checkin_submitted",
  "support_ticket_created",
  "support_ticket_updated",
  "support_ticket_comment_added",
  "support_ticket_comment_edited",
  "support_ticket_comment_deleted",
  "support_ticket_status_changed",
  "support_ticket_closed",
  "support_ticket_reopened",
]);

function normalizeNotificationData(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeNotificationType(value: string): NotificationType {
  if (KNOWN_NOTIFICATION_TYPES.has(value as NotificationType)) {
    return value as NotificationType;
  }
  return "checkin_submitted";
}

function normalizeNotificationRow(row: NotificationInsertRow): NotificationRow {
  return {
    id: row.id,
    type: normalizeNotificationType(row.type),
    title: row.title,
    body: row.body,
    data: normalizeNotificationData(row.data),
    created_at: row.created_at,
  };
}

export function useNotificationsRealtimeSync(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<NotificationInsertRow>) => {
          const nextRow = normalizeNotificationRow(payload.new);

          queryClient.setQueryData<number>(notificationKeys.count(), (current) =>
            typeof current === "number" ? current + 1 : 1
          );

          queryClient.setQueryData<NotificationRow[]>(notificationKeys.feed(), (current = []) => {
            if (current.some((item) => item.id === nextRow.id)) return current;
            return [nextRow, ...current].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
