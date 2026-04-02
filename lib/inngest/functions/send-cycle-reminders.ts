import { createAdminClient } from "@/lib/supabase/admin";
import {
  isPushConfigured,
  sendPushNotification,
  type PushSubscriptionRecord,
} from "@/lib/push/send";
import { inngest } from "../client";
import { getDaysUntilNextPeriod } from "@/utils/cycle-phase";

type CyclePreferenceRow = {
  user_id: string;
  cycle_bell_enabled: boolean;
  cycle_push_enabled: boolean;
  cycle_reminder_days: number;
};

type CycleRow = {
  subject_user_id: string | null;
  period_start_date: string;
  cycle_length_days: number | null;
};

const CYCLE_REMINDER_TITLE = "Cycle Reminder";
const CYCLE_REMINDER_URL = "/health/cycle";

function buildCycleReminderBody(daysUntilNextPeriod: number) {
  if (daysUntilNextPeriod <= 0) {
    return "Your period is expected today. Consider lighter training today.";
  }
  if (daysUntilNextPeriod === 1) {
    return "Your period is expected in 1 day. Consider lighter training today.";
  }
  return `Your period is expected in ${daysUntilNextPeriod} days. Consider lighter training today.`;
}

export const sendCycleReminders = inngest.createFunction(
  { id: "send-cycle-reminders" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const admin = createAdminClient();

    const rows = await step.run("load-cycle-reminder-preferences", async () => {
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("id")
        .eq("gender", "female");

      if (profilesError) throw new Error(profilesError.message);

      const userIds = (profiles || []).map((row) => row.id);
      if (userIds.length === 0) return [] as CyclePreferenceRow[];

      const { data, error } = await admin
        .from("notification_settings")
        .select("user_id, cycle_bell_enabled, cycle_push_enabled, cycle_reminder_days")
        .in("user_id", userIds)
        .or("cycle_bell_enabled.eq.true,cycle_push_enabled.eq.true");

      if (error) throw new Error(error.message);
      return (data || []) as CyclePreferenceRow[];
    });

    if (rows.length === 0) {
      return { queued: 0, checked: 0 };
    }

    const cyclesByUser = await step.run("load-latest-cycles", async () => {
      const { data, error } = await admin
        .from("cycle_entries")
        .select("subject_user_id, period_start_date, cycle_length_days")
        .in("subject_user_id", rows.map((row) => row.user_id))
        .is("subject_client_id", null)
        .order("period_start_date", { ascending: false });

      if (error) throw new Error(error.message);
      const latestByUser: Record<string, CycleRow> = {};
      for (const row of (data || []) as CycleRow[]) {
        if (row.subject_user_id && !latestByUser[row.subject_user_id]) {
          latestByUser[row.subject_user_id] = row;
        }
      }
      return latestByUser;
    });

    const events = rows.flatMap((row) => {
      const cycle = cyclesByUser[row.user_id];
      if (!cycle) return [];
      const daysUntilNextPeriod = getDaysUntilNextPeriod(
        cycle.period_start_date,
        cycle.cycle_length_days ?? 28
      );
      if (daysUntilNextPeriod < 0 || daysUntilNextPeriod > row.cycle_reminder_days) {
        return [];
      }
      return [
        {
          name: "notifications/cycle.reminder" as const,
          data: {
            user_id: row.user_id,
            days_until_next_period: daysUntilNextPeriod,
          },
        },
      ];
    });

    if (events.length > 0) {
      await step.sendEvent("fan-out-cycle-reminders", events);
    }

    return {
      queued: events.length,
      checked: rows.length,
    };
  }
);

export const handleSendCycleReminder = inngest.createFunction(
  { id: "handle-send-cycle-reminder", retries: 2 },
  { event: "notifications/cycle.reminder" },
  async ({ event, step }) => {
    const admin = createAdminClient();
    const body = buildCycleReminderBody(event.data.days_until_next_period);

    const prefs = await step.run("load-user-cycle-preferences", async () => {
      const { data, error } = await admin
        .from("notification_settings")
        .select("cycle_bell_enabled, cycle_push_enabled")
        .eq("user_id", event.data.user_id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    });

    const bellEnabled = prefs?.cycle_bell_enabled ?? true;
    const pushEnabled = prefs?.cycle_push_enabled ?? false;

    if (bellEnabled) {
      await step.run("insert-cycle-notification", async () => {
        const { error } = await admin.from("notifications").insert({
          user_id: event.data.user_id,
          type: "cycle_reminder",
          title: CYCLE_REMINDER_TITLE,
          body,
          data: { url: CYCLE_REMINDER_URL },
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
            const isActive = await sendPushNotification(subscription, {
              title: CYCLE_REMINDER_TITLE,
              body,
              url: CYCLE_REMINDER_URL,
            });
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
      bell_enabled: bellEnabled,
      push_enabled: pushEnabled,
    };
  }
);
