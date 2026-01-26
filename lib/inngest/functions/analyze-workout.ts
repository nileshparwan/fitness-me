import { inngest } from "../client";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google"; 
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeWorkoutText } from "@/lib/ai/analyzers/workout-analyzer";

export const analyzeWorkout = inngest.createFunction(
  { 
    id: "analyze-workout",
    // 🚦 RATE LIMITING: Prevent hitting Gemini free tier limits
    concurrency: {
      limit: 5, // Max 5 concurrent AI requests
    },
    // 🔄 RETRY POLICY: If AI fails, try again automatically
    retries: 3 
  },
  { event: "ai/analyze.workout" },
  async ({ event, step }) => {
    const supabase = await createClient();
    const { queueId, userId, rawText } = event.data;

    // Step 1: Update Queue Status to 'processing'
    await step.run("update-status-processing", async () => {
      await supabase
        .from("ai_processing_queue")
        .update({ status: "processing" })
        .eq("id", queueId);
    });

    // Step 2: Call Gemini AI
    const result = await step.run("call-gemini-ai", async () => {
      return await analyzeWorkoutText(rawText);
    });

    // Step 3: Save Data to Supabase Tables
    await step.run("save-to-database", async () => {
      // A. Create Workout Header
      const { data: workout } = await supabase.from("workouts").insert({
        user_id: userId,
        name: result.workoutName,
        status: "completed",
        date: new Date().toISOString()
      }).select().single();

      if (!workout) throw new Error("Failed to create workout");

      // B. Create Logs (flattening the structure)
      const logs = result.exercises.flatMap((ex, i) => 
        ex.sets.map((set, setIndex) => ({
          workout_id: workout.id,
          exercise_name: ex.name,
          set_number: setIndex + 1,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe || 7 // Default RPE if not provided
        }))
      );

      await supabase.from("workout_logs").insert(logs);
    });

    // Step 4: Finalize Queue Status
    await step.run("mark-completed", async () => {
       await supabase
        .from("ai_processing_queue")
        .update({ 
          status: "completed",
          processed_at: new Date().toISOString()
        })
        .eq("id", queueId);
    });

    return { success: true, workoutName: result.workoutName };
  }
);