import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPushNotification, type PushPayload, type PushSubscriptionRecord } from "@/lib/push/send";
import { inngest } from "../client";
import { localQuarterBucket, toQuarterBucket } from "../time-utils";

type ReminderType = "meal_reminder" | "health_checkin_reminder";

type PreferenceRow = {
  user_id: string;
  timezone: string;
  meal_bell_enabled: boolean;
  meal_push_enabled: boolean;
  meal_reminder_time: string;
  checkin_bell_enabled: boolean;
  checkin_push_enabled: boolean;
  checkin_reminder_time: string;
};

const REMINDER_META: Record<ReminderType, PushPayload> = {
  meal_reminder: {
    title: "Log your meals",
    body: "Don't forget to log today's meals.",
    url: "/nutrition/diary",
  },
  health_checkin_reminder: {
    title: "Daily check-in",
    body: "How are you feeling today?",
    url: "/check-in",
  },
};

function dueReminderTypes(row: PreferenceRow, now: Date): ReminderType[] {
  const bucketNow = localQuarterBucket(now, row.timezone);
  const due: ReminderType[] = [];

  if (
    (row.meal_bell_enabled || row.meal_push_enabled) &&
    toQuarterBucket(row.meal_reminder_time) === bucketNow
  ) {
    due.push("meal_reminder");
  }

  if (
    (row.checkin_bell_enabled || row.checkin_push_enabled) &&
    toQuarterBucket(row.checkin_reminder_time) === bucketNow
  ) {
    due.push("health_checkin_reminder");
  }

  return due;
}

export const sendDailyReminders = inngest.createFunction(
  { id: "send-daily-reminders" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const admin = createAdminClient();

    const rows = await step.run("load-notification-preferences", async () => {
      const { data, error } = await admin
        .from("notification_settings")
        .select(
          "user_id, timezone, meal_bell_enabled, meal_push_enabled, meal_reminder_time, checkin_bell_enabled, checkin_push_enabled, checkin_reminder_time"
        )
        .or(
          "meal_bell_enabled.eq.true,meal_push_enabled.eq.true,checkin_bell_enabled.eq.true,checkin_push_enabled.eq.true"
        );

      if (error) throw new Error(error.message);
      return (data || []) as PreferenceRow[];
    });

    if (rows.length === 0) {
      return { queued: 0, checked: 0 };
    }

    const now = new Date();
    const events = rows.flatMap((row) =>
      dueReminderTypes(row, now).map((type) => ({
        name: "notification/send.reminder" as const,
        data: {
          user_id: row.user_id,
          type,
        },
      }))
    );

    if (events.length > 0) {
      await step.sendEvent("fan-out-reminders", events);
    }

    return {
      queued: events.length,
      checked: rows.length,
    };
  }
);

export const handleSendReminder = inngest.createFunction(
  { id: "handle-send-reminder", retries: 2 },
  { event: "notification/send.reminder" },
  async ({ event, step }) => {
    const admin = createAdminClient();

    const prefs = await step.run("load-user-preferences", async () => {
      const { data, error } = await admin
        .from("notification_settings")
        .select(
          "user_id, meal_bell_enabled, meal_push_enabled, checkin_bell_enabled, checkin_push_enabled"
        )
        .eq("user_id", event.data.user_id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    });

    if (!prefs) {
      return { sent: false, reason: "preferences-not-found" };
    }

    const reminderType = event.data.type;
    const payload = REMINDER_META[reminderType];

    const bellEnabled =
      reminderType === "meal_reminder" ? prefs.meal_bell_enabled : prefs.checkin_bell_enabled;
    const pushEnabled =
      reminderType === "meal_reminder" ? prefs.meal_push_enabled : prefs.checkin_push_enabled;

    if (bellEnabled) {
      await step.run("insert-in-app-notification", async () => {
        const { error } = await admin.from("notifications").insert({
          user_id: event.data.user_id,
          type: reminderType,
          title: payload.title,
          body: payload.body,
          data: { url: payload.url },
        });
        if (error) throw new Error(error.message);
      });
    }

    if (pushEnabled && isPushConfigured()) {
      const subscriptions = await step.run("load-push-subscriptions", async () => {
        const { data, error } = await admin
          .from("device_tokens")
          .select("id, endpoint, public_key, auth_secret")
          .eq("user_id", event.data.user_id);

        if (error) throw new Error(error.message);
        return (data || []) as PushSubscriptionRecord[];
      });

      if (subscriptions.length > 0) {
        await step.run("send-push-notifications", async () => {
          for (const subscription of subscriptions) {
            const isActive = await sendPushNotification(subscription, payload);
            if (isActive) continue;

            const { error } = await admin
              .from("device_tokens")
              .delete()
              .eq("id", subscription.id)
              .eq("user_id", event.data.user_id);
            if (error) throw new Error(error.message);
          }
        });
      }
    }

    return {
      sent: bellEnabled || pushEnabled,
      bell_enabled: bellEnabled,
      push_enabled: pushEnabled,
    };
  }
);
