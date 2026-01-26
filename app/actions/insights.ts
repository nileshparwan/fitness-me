"use server";

import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateInstantInsight() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Directly fire the event that the `generate-insights` function listens to
  await inngest.send({
    name: "app/generate.user.report",
    data: {
      userId: user.id
    }
  });

  // Note: We don't wait for the result here because it's background processing.
  // The UI should show a "Generating..." state using Supabase Realtime.
  
  revalidatePath("/dashboard");
  return { success: true, message: "Analysis started" };
}