"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import type { Json, NotificationType } from "@/types/database";

const dismissNotificationSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  created_at: string;
};

const KNOWN_NOTIFICATION_TYPES = new Set<NotificationType>([
  "goal_achieved",
  "checkin_submitted",
  "meal_reminder",
  "health_checkin_reminder",
  "goal_checkin_reminder",
  "support_ticket_created",
  "support_ticket_updated",
  "support_ticket_comment_added",
  "support_ticket_comment_edited",
  "support_ticket_comment_deleted",
  "support_ticket_status_changed",
  "support_ticket_closed",
  "support_ticket_reopened",
]);

async function requireNotificationActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

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

export async function getNotificationCountAction(): Promise<number> {
  return runTrackedAction({
    eventName: "notification.count.read",
    action: async () => {
      try {
        const { supabase, user } = await requireNotificationActor();
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    },
  });
}

export async function getNotificationsAction(): Promise<NotificationRow[]> {
  return runTrackedAction({
    eventName: "notification.feed.read",
    action: async () => {
      const { supabase, user } = await requireNotificationActor();
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);

      return (data || []).map((row) => ({
        id: row.id,
        type: normalizeNotificationType(row.type),
        title: row.title,
        body: row.body,
        data: normalizeNotificationData(row.data),
        created_at: row.created_at,
      }));
    },
  });
}

export async function dismissNotificationAction(id: string): Promise<void> {
  const payload = dismissNotificationSchema.parse({ id });
  return runTrackedAction({
    eventName: "notification.dismiss",
    payload,
    action: async () => {
      const { supabase, user } = await requireNotificationActor();
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", payload.id)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
    },
  });
}

export async function dismissAllNotificationsAction(): Promise<void> {
  return runTrackedAction({
    eventName: "notification.dismiss_all",
    action: async () => {
      const { supabase, user } = await requireNotificationActor();
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
    },
  });
}
