import { createClient } from "@/lib/supabase/server";
import { inngest } from "../client";

export const generateWeeklyReport = inngest.createFunction(
  { id: "generate-weekly-report" },
  { cron: "0 9 * * 0" }, // Every Sunday at 9:00 AM
  async ({ step }) => {
    const supabase = await createClient();

    // 1. Get all active users
    const users = await step.run("fetch-users", async () => {
      const { data } = await supabase.from("profiles").select("id");
      return data || [];
    });

    // 2. Fan-out: Trigger an individual event for each user
    // This distributes the load so we don't process 1000 reports in one function
    const events = users.map(user => ({
      name: "app/generate.user.report" as const,
      data: { userId: user.id }
    }));

    await step.sendEvent("fan-out-reports", events);
    
    return { usersProcessed: users.length };
  }
);