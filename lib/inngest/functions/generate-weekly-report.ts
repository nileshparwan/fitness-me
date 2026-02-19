// 1. Import the raw Supabase SDK, not your app's helper
import { createClient } from "@supabase/supabase-js"; 
import { inngest } from "../client";

export const generateWeeklyReport = inngest.createFunction(
  { id: "generate-weekly-report" },
  { cron: "0 9 * * 0" }, // Every Sunday at 9:00 AM
  async ({ step }) => {
    
    // 2. Initialize the Admin Client
    // This client bypasses RLS and can access the 'auth' schema
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Fetch User IDs from Auth Schema
    const userIds = await step.run("fetch-users", async () => {
      // listUsers is paginated. For small-to-medium apps, fetching 1000 is fine.
      // For larger apps, you would need to implement a loop here.
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (error) throw error;

      // Extract just the IDs to keep the payload light
      return users.map((u) => u.id);
    });

    if (!userIds.length) {
        return { usersProcessed: 0, message: "No users found" };
    }

    // 4. Fan-out: Map IDs to Events
    const events = userIds.map((id) => ({
      name: "app/generate.user.report" as const,
      data: { userId: id },
    }));

    await step.sendEvent("fan-out-reports", events);

    return { usersProcessed: userIds.length };
  }
);