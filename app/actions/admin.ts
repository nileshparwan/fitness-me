"use server";

import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

export async function triggerManualReminders() {
  const supabase = await createClient();
  
  // 1. Admin Check (Optional but recommended)
  // Assuming you have a standard 'admin' role or specific user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  // Check if email matches your admin email
  if (user.email !== "admin@fitnessapp.com") {
     throw new Error("Forbidden");
  }

  // 2. Trigger the job manually
  // await inngest.send({
  //   name: "admin/run.reminders",
  //   data: {}
  // });

  return { success: true, message: "Reminders job triggered" };
}