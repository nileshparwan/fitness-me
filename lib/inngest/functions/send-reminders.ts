import { createClient } from "@supabase/supabase-js"; // Direct SDK import
import { inngest } from "../client";

export const sendReminders = inngest.createFunction(
  { id: "send-reminders" },
  [
    { cron: "0 8 * * *" }, 
    { event: "admin/run.reminders" }
  ],
  async ({ step }) => {
    // 1. Init Admin Client (Required for auth.users and bypassing RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Step 1: Find "At Risk" Users efficiently
    const inactiveUsers = await step.run("find-inactive-users", async () => {
      // A. Get ALL users (Paginated batch)
      // In production, you'd loop this until all users are fetched
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });
      if (userError) throw userError;

      // B. Get IDs of users who HAVE worked out in the last 3 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 3);

      const { data: activeUserIds, error: workoutError } = await supabaseAdmin
        .from("workouts")
        .select("user_id")
        .gte("date", cutoffDate.toISOString()); // Single query for all recent activity
      
      if (workoutError) throw workoutError;

      // C. Create a Set of active IDs for O(1) lookups
      const activeSet = new Set(activeUserIds?.map(u => u.user_id));

      // D. Filter: The "At Risk" users are those NOT in the active set
      return users
        .filter(user => !activeSet.has(user.id))
        .map(user => ({
          id: user.id,
          // Extract display name from your new metadata location
          name: user.user_metadata?.full_name || user.user_metadata?.display_name || "Athlete"
        }));
    });

    // Step 2: Create Notifications
    if (inactiveUsers.length > 0) {
      await step.run("create-notifications", async () => {
        const notifications = inactiveUsers.map(user => ({
          user_id: user.id,
          insight_type: "general",
          title: "We miss you!",
          content: `Hey ${user.name}, consistency is key! It's been a few days since your last log. Ready to crush a workout today?`,
          priority: "medium",
          is_read: false,
          created_at: new Date().toISOString()
        }));

        // Batch insert
        const { error } = await supabaseAdmin
          .from("ai_insights")
          .insert(notifications);
          
        if (error) throw error;
      });
    }

    return { 
      totalUsers: inactiveUsers.length + (await step.run("count-active", async () => 0)), // pseudo-code for metrics
      remindedCount: inactiveUsers.length 
    };
  }
);