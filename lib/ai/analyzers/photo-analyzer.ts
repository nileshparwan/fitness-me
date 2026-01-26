import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "../prompts";

// 1. Define Schema
const physiqueAnalysisSchema = z.object({
  estimatedBodyFat: z.number().describe("Estimated body fat percentage. Be conservative and give a single representative number."),
  muscleGroups: z.object({
    strengths: z.array(z.string()).describe("List of muscle groups that appear well-developed."),
    lagging: z.array(z.string()).describe("List of muscle groups that could use more focus."),
  }),
  postureAssessment: z.string().describe("Brief check on posture (e.g., rounded shoulders, anterior pelvic tilt)."),
  visualFeedback: z.string().describe("Encouraging, professional coach-style feedback (max 2 sentences)."),
  muscleMassAnalysis: z.string().describe("Observations about visible muscle definition and symmetry."),
});

// 2. The Analyzer Function
export async function analyzePhysiquePhoto(base64Image: string) {
  try {
    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: physiqueAnalysisSchema,
      system: SYSTEM_PROMPTS.PHYSIQUE_ANALYSIS,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this physique for fitness tracking purposes. Be objective, professional, and strictly factual." },
            { type: "image", image: base64Image }, // Gemini supports Base64 directly
          ],
        },
      ],
    });

    return object;
  } catch (error) {
    console.error("AI Photo Analysis Failed:", error);
    throw new Error("Failed to analyze photo");
  }
}