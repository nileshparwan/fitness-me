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

      const { data: executionRows, error: executionError } = await supabaseAdmin
        .from("workout_logs")
        .select("subject_user_id")
        .gte("performed_on", cutoffDate.toISOString().slice(0, 10));
      if (executionError) throw executionError;
      const activeUserIds = ((executionRows || []) as Array<{ subject_user_id: string | null }>).map((row) => ({
        user_id: row.subject_user_id,
      }));

      // C. Create a Set of active IDs for O(1) lookups
      const activeSet = new Set((activeUserIds || []).map((u) => u.user_id).filter(Boolean));

      // D. Filter: The "At Risk" users are those NOT in the active set
      const inactiveUserIds = users
        .filter(user => !activeSet.has(user.id))
        .map(user => user.id);

      // E. Batch-fetch display names from profiles table (single source of truth)
      const { data: profileRows } = inactiveUserIds.length > 0
        ? await supabaseAdmin
            .from("profiles")
            .select("id, full_name")
            .in("id", inactiveUserIds)
        : { data: [] as Array<{ id: string; full_name: string | null }> };
      const nameMap = new Map((profileRows || []).map(row => [row.id, row.full_name]));

      return inactiveUserIds.map(id => ({
        id,
        name: nameMap.get(id) || "Athlete",
      }));
    });

    // Step 2: Create Notifications
    if (inactiveUsers.length > 0) {
      await step.run("create-notifications", async () => {
        const notifications = inactiveUsers.map((user) => ({
          user_id: user.id,
          type: "checkin_submitted",
          title: "We miss you!",
          body: `Hey ${user.name}, it's been a few days since your last log. Ready to get back on track?`,
          data: { url: "/workouts", source: "inactive-workout-reminder" },
        }));

        const { error } = await supabaseAdmin.from("notifications").insert(notifications);
          
        if (error) throw error;
      });
    }

    return {
      totalUsers: inactiveUsers.length,
      remindedCount: inactiveUsers.length
    };
  }
);
