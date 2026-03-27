import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPushNotification, type PushSubscriptionRecord } from "@/lib/push/send";
import { inngest } from "../client";
import { toQuarterBucket, localQuarterBucket } from "../time-utils";

const GOAL_CHECKIN_TITLE = "Goal Check-in Due";
const GOAL_CHECKIN_URL = "/goals";

type PreferenceRow = {
  user_id: string;
  timezone: string;
  goal_bell_enabled: boolean;
  goal_push_enabled: boolean;
  goal_reminder_time: string;
};

type DueGoalRow = {
  goal_id: string;
  user_id: string;
  goal_type: string;
};

export const sendGoalCheckinReminders = inngest.createFunction(
  { id: "send-goal-checkin-reminders" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const admin = createAdminClient();

    const matchingUsers = await step.run("find-users-due-now", async () => {
      const { data, error } = await admin
        .from("notification_preferences")
        .select("user_id, timezone, goal_bell_enabled, goal_push_enabled, goal_reminder_time")
        .or("goal_bell_enabled.eq.true,goal_push_enabled.eq.true");

      if (error) throw new Error(error.message);

      const now = new Date();
      return ((data || []) as PreferenceRow[]).filter((row) => {
        const bucketNow = localQuarterBucket(now, row.timezone);
        return toQuarterBucket(row.goal_reminder_time) === bucketNow;
      });
    });

    if (matchingUsers.length === 0) return { queued: 0, checked: 0 };

    const userIds = matchingUsers.map((user) => user.user_id);
    const dueGoals = await step.run("find-due-goals", async () => {
      const { data, error } = await (admin as any).rpc("get_goals_due_for_checkin", {
        p_user_ids: userIds,
      });
      if (error) throw new Error(error.message);
      return (data || []) as DueGoalRow[];
    });

    if (dueGoals.length === 0) return { queued: 0, checked: matchingUsers.length };

    await step.sendEvent(
      "fan-out-goal-checkin-reminders",
      dueGoals.map((goal) => ({
        name: "notification/send.goal-checkin-reminder" as const,
        data: {
          goal_id: goal.goal_id,
          user_id: goal.user_id,
          goal_type: goal.goal_type,
        },
      }))
    );

    return { queued: dueGoals.length, checked: matchingUsers.length };
  }
);

export const handleSendGoalCheckinReminder = inngest.createFunction(
  { id: "handle-send-goal-checkin-reminder", retries: 2 },
  { event: "notification/send.goal-checkin-reminder" },
  async ({ event, step }) => {
    const admin = createAdminClient();
    const { goal_id, user_id, goal_type } = event.data;

    const prefs = await step.run("load-user-preferences", async () => {
      const { data, error } = await admin
        .from("notification_preferences")
        .select("goal_bell_enabled, goal_push_enabled")
        .eq("user_id", user_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    });

    const bellEnabled = prefs?.goal_bell_enabled ?? true;
    const pushEnabled = prefs?.goal_push_enabled ?? false;
    const body = `Time to log your progress on your ${goal_type.replace(/_/g, " ")} goal.`;

    if (bellEnabled) {
      await step.run("insert-bell-notification", async () => {
        const { error } = await admin.from("notifications").insert({
          user_id,
          type: "goal_checkin_reminder",
          title: GOAL_CHECKIN_TITLE,
          body,
          data: {
            url: GOAL_CHECKIN_URL,
            goal_id,
          },
        });
        if (error) throw new Error(error.message);
      });
    }

    if (pushEnabled && isPushConfigured()) {
      const subscriptions = await step.run("load-push-subscriptions", async () => {
        const { data, error } = await admin
          .from("push_subscriptions")
          .select("id, endpoint, public_key, auth_secret")
          .eq("user_id", user_id);
        if (error) throw new Error(error.message);
        return (data || []) as PushSubscriptionRecord[];
      });

      if (subscriptions.length > 0) {
        await step.run("send-push-notifications", async () => {
          for (const subscription of subscriptions) {
            const isActive = await sendPushNotification(subscription, {
              title: GOAL_CHECKIN_TITLE,
              body,
              url: GOAL_CHECKIN_URL,
            });
            if (isActive) continue;
            await admin.from("push_subscriptions").delete().eq("id", subscription.id).eq("user_id", user_id);
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
