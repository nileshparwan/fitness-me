import { inngest } from "../client";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const generateInsights = inngest.createFunction(
  { id: "generate-insights", retries: 3 },
  { event: "app/generate.user.report" }, // Triggered by the "fan-out" in the weekly report function
  async ({ event, step }) => {
    const supabase = await createClient();
    const { userId } = event.data;

    // Step 1: Gather Context (Recent Workouts + Goal)
    const context = await step.run("fetch-user-data", async () => {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("name, date, status, overall_rating, duration_minutes")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5);

      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      return { workouts, goals };
    });

    if (!context.workouts || context.workouts.length === 0) {
      return { message: "No data to analyze" };
    }

    // Step 2: Generate Insight with Gemini
    const insight = await step.run("generate-ai-insight", async () => {
      const { object } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: z.object({
          title: z.string(),
          content: z.string(),
          type: z.enum(['workout_feedback', 'progress_analysis', 'recovery_suggestion', 'goal_adjustment']),
          priority: z.enum(['low', 'medium', 'high'])
        }),
        prompt: `You are a fitness coach. Analyze this user's last 5 workouts against their goal: ${JSON.stringify(context.goals)}. 
                 Workouts: ${JSON.stringify(context.workouts)}.
                 Identify one key pattern (consistency, intensity, etc.) and give 2 sentences of specific advice.`
      });
      return object;
    });

    // Step 3: Save to Insights Table
    await step.run("save-insight", async () => {
      await supabase.from("ai_insights").insert({
        user_id: userId,
        title: insight.title,
        content: insight.content,
        insight_type: insight.type,
        priority: insight.priority
      });
    });

    return { success: true, title: insight.title };
  }
);