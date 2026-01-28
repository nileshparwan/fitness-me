"use server";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveWorkoutFromText(userId: string, rawText: string, date: Date = new Date()) {

  const supabase = await createClient();

  // 1. CREATE QUEUE RECORD FIRST
  // Insert a record with status 'queued' to get the ID immediately
  const { data: queueRecord, error } = await supabase
    .from("ai_processing_queue")
    .insert({
      user_id: userId,
      input_text: rawText, // Good practice to store the input for debugging
      task_type: 'parse_workout',
      status: 'pending'
    })
    .select("id") // Important: Return the ID
    .single();

  if (error || !queueRecord) {
    console.error("Failed to create queue record:", error);
    throw new Error("Could not start processing");
  }

  
  await inngest.send({
    name: "ai/analyze.workout",
    data: {
      queueId: queueRecord.id,
      userId,
      rawText,
    },
  })

  revalidatePath("/workouts");
  return { success: true, queueId: queueRecord.id };
}