import { createClient } from "@/lib/supabase/server";
import { inngest } from "../client";

export const sendReminders = inngest.createFunction(
  { id: "send-reminders" },
  [
    { cron: "0 8 * * *" },
    { event: "admin/run.reminders" }
], // Run every day at 8:00 AM UTC
  async ({ step }) => {
    const supabase = await createClient();

    // Step 1: Find "At Risk" Users (No workout in 3 days)
    const inactiveUsers = await step.run("find-inactive-users", async () => {
      // 3 days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 3);

      // Get all users (batching in real app, simple query for now)
      const { data: users } = await supabase.from("profiles").select("id, display_name");
      
      if (!users) return [];

      const usersToPing = [];
      
      // Check last workout for each user
      for (const user of users) {
        const { data: lastWorkout } = await supabase
          .from("workouts")
          .select("date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        // If no workout ever, OR last workout was before cutoff
        if (!lastWorkout || new Date(lastWorkout.date) < cutoffDate) {
          usersToPing.push(user);
        }
      }
      return usersToPing;
    });

    // Step 2: Create Notifications (In a real app, send Email/Push here)
    if (inactiveUsers.length > 0) {
      await step.run("create-notifications", async () => {
        const notifications = inactiveUsers.map(user => ({
          user_id: user.id,
          insight_type: "general",
          title: "We miss you!",
          content: `Hey ${user.display_name}, consistency is key! It's been a few days since your last log. Ready to crush a workout today?`,
          priority: "medium",
          is_read: false
        }));

        await supabase.from("ai_insights").insert(notifications);
      });
    }

    return { remindedCount: inactiveUsers.length };
  }
);