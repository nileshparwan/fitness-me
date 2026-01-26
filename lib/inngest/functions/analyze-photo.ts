import { inngest } from "../client";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzePhysiquePhoto } from "@/lib/ai/analyzers/photo-analyzer";

export const analyzePhoto = inngest.createFunction(
  { 
    id: "analyze-photo",
    concurrency: { limit: 2 }, // Keep concurrency low for heavy image tasks
    retries: 2
  },
  { event: "ai/analyze.photo" },
  async ({ event, step }) => {
    const supabase = await createClient();
    const { queueId, userId, imageUrl } = event.data;

    // Step 1: Update Queue Status
    await step.run("update-status-processing", async () => {
      await supabase.from("ai_processing_queue")
        .update({ status: "processing" }).eq("id", queueId);
    });

    // Step 2: Download Image from Supabase Storage
    const base64Image = await step.run("download-image", async () => {
      // `imageUrl` should be the storage path (e.g. "user_123/progress.jpg")
      const { data, error } = await supabase.storage.from("photos").download(imageUrl);
      if (error) throw new Error(`Download failed: ${error.message}`);
      
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    });

    // Step 3: Call Gemini Vision (Flash is fast and multimodal)
    const analysis = await step.run("call-gemini-vision", async () => {
      return await analyzePhysiquePhoto(base64Image)
    });

    // Step 4: Save results to DB
    await step.run("save-results", async () => {
      // Upsert into body_metrics
      await supabase.from("body_metrics").upsert({
        user_id: userId,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        body_fat_percent: analysis.estimatedBodyFat,
        ai_analysis: `${analysis.muscleMassAnalysis}\n\nCoach's Note: ${analysis.visualFeedback}`,
        photo_front_url: imageUrl // Link the photo to the metric entry
      }, { onConflict: 'user_id, date' });

      // Mark Job Complete
      await supabase.from("ai_processing_queue")
        .update({ status: "completed", processed_at: new Date().toISOString() })
        .eq("id", queueId);
    });

    return { success: true };
  }
);