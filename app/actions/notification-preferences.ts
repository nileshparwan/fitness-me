"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const preferencesSchema = z.object({
  timezone: z.string().min(1),
  meal_bell_enabled: z.boolean(),
  meal_push_enabled: z.boolean(),
  meal_reminder_time: z.string().regex(hhmmRegex),
  checkin_bell_enabled: z.boolean(),
  checkin_push_enabled: z.boolean(),
  checkin_reminder_time: z.string().regex(hhmmRegex),
  goal_bell_enabled: z.boolean(),
  goal_push_enabled: z.boolean(),
  goal_reminder_time: z.string().regex(hhmmRegex).default("09:00"),
});

export type NotificationPreferencesInput = z.infer<typeof preferencesSchema>;

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function normalizeDbTime(value: string) {
  if (value.length >= 5) return value.slice(0, 5);
  return "00:00";
}

function toDbTime(value: string) {
  return `${value}:00`;
}

export async function getNotificationPreferencesAction(): Promise<NotificationPreferencesInput | null> {
  return runTrackedAction({
    eventName: "notification_preferences.read",
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data, error } = await supabase
        .from("notification_preferences")
        .select(
          "timezone, meal_bell_enabled, meal_push_enabled, meal_reminder_time, checkin_bell_enabled, checkin_push_enabled, checkin_reminder_time, goal_bell_enabled, goal_push_enabled, goal_reminder_time"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        timezone: data.timezone,
        meal_bell_enabled: data.meal_bell_enabled,
        meal_push_enabled: data.meal_push_enabled,
        meal_reminder_time: normalizeDbTime(data.meal_reminder_time),
        checkin_bell_enabled: data.checkin_bell_enabled,
        checkin_push_enabled: data.checkin_push_enabled,
        checkin_reminder_time: normalizeDbTime(data.checkin_reminder_time),
        goal_bell_enabled: data.goal_bell_enabled,
        goal_push_enabled: data.goal_push_enabled,
        goal_reminder_time: normalizeDbTime(data.goal_reminder_time),
      };
    },
  });
}

export async function upsertNotificationPreferencesAction(
  input: NotificationPreferencesInput
): Promise<void> {
  const payload = preferencesSchema.parse(input);

  return runTrackedAction({
    eventName: "notification_preferences.upsert",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();

      const { error } = await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          timezone: payload.timezone,
          meal_bell_enabled: payload.meal_bell_enabled,
          meal_push_enabled: payload.meal_push_enabled,
          meal_reminder_time: toDbTime(payload.meal_reminder_time),
          checkin_bell_enabled: payload.checkin_bell_enabled,
          checkin_push_enabled: payload.checkin_push_enabled,
          checkin_reminder_time: toDbTime(payload.checkin_reminder_time),
          goal_bell_enabled: payload.goal_bell_enabled,
          goal_push_enabled: payload.goal_push_enabled,
          goal_reminder_time: toDbTime(payload.goal_reminder_time),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw new Error(error.message);

      revalidatePath("/settings/notifications");
      revalidatePath("/settings");
    },
  });
}
