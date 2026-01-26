"use server";

import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function submitWorkoutText(formData: FormData) {
  const text = formData.get("workoutText") as string;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Insert into Queue Table (Supabase)
  const { data: queueItem, error } = await supabase
    .from("ai_processing_queue")
    .insert({
      user_id: user.id,
      input_text: text,
      task_type: "parse_workout",
      status: "pending"
    })
    .select()
    .single();

  if (error) throw new Error("Failed to queue");

  // 2. Trigger Inngest (Fire and Forget)
  await inngest.send({
    name: "ai/analyze.workout",
    data: {
      queueId: queueItem.id,
      userId: user.id,
      rawText: text
    },
  });

  // 3. Redirect User (They will see a "Processing..." state on dashboard via Realtime)
  redirect("/dashboard");
}