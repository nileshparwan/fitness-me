import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "../prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define the Schema for AI Extraction
export const multiWorkoutSchema = z.object({
  workouts: z.array(z.object({
    name: z.string().describe("Name of the session (e.g., 'Upper Body Power', 'Morning Run', 'Day 1')"),
    // CHANGE: .optional() -> .nullable()
    notes: z.string().nullable().describe("Any general notes about the session"),

    exercises: z.array(z.object({
      name: z.string().describe("Exercise name. Use standard gym terminology (e.g., 'Bench Press', 'Running', 'Cycling')."),

      // CHANGE: .optional() -> .nullable()
      type: z.enum(["strength", "cardio"]).nullable().describe("Infer 'cardio' for running, swimming, cycling, etc. Default to 'strength'."),

      // CHANGE: .optional() -> .nullable()
      sets: z.array(z.object({
        reps: z.number(),
        // CHANGE: .optional() -> .nullable()
        weight: z.number().nullable().describe("Weight in kg. 0 if bodyweight or not specified"),
        rpe: z.number().nullable().describe("Rate of Perceived Exertion (1-10)"),
      })).nullable().describe("List of sets performed. Return null for pure cardio activities."),

      // CHANGE: All .optional() -> .nullable()
      duration: z.number().nullable().describe("Duration in minutes. Vital for cardio."),
      distance: z.number().nullable().describe("Distance in kilometers. Vital for running/cycling."),
      calories: z.number().nullable().describe("Calories burned if specified."),
      heartRate: z.number().nullable().describe("Average heart rate if specified."),

      notes: z.string().nullable().describe("Specific notes for this exercise"),
    })),
  }))
});

function buildSummaryPrompt(transcript: string): string {
  return `
Input Text to Parse:
"""
${transcript}
"""

Parsing Rules:
1. **Multi-Day Support**: If the text contains headers like "Monday", "Day 1", or dates, split them into separate workout objects in the 'workouts' array.
2. **Cardio vs Strength**:
   - If an exercise is "Running", "Cycling", "Swimming", or has distance/time without sets, set 'type' to 'cardio'.
   - Move duration/distance integers to the root of the exercise object, NOT into sets.
3. **Strength Defaults**:
   - If weight is missing, set it to 0 (bodyweight).
   - If only "5x5" is written, interpret as 5 sets of 5 reps.
4. **Clean Names**: Normalize names (e.g., "DB Press" → "Dumbbell Bench Press").
`;
}

export async function analyzeWorkoutText(rawText: string) {
  try {
    const result = await openai.responses.create({ // or .parse if using a specific helper wrapper
      model: "gpt-5-mini", // Ensure this model exists in your tier
      // 1. CHANGE: 'messages' -> 'input'
      input: [
        { role: "system", content: SYSTEM_PROMPTS.WORKOUT_PARSER },
        { role: "user", content: buildSummaryPrompt(rawText) },
      ],
      // 2. PROVIDER OPTIONS (If your specific wrapper needs them here)
      temperature: 0.2,
      // 3. CONFIRM OUTPUT FORMAT
      // Standard Responses API uses response_format or specific output params.
      // If you are using a library helper 'zodTextFormat', keep this:
      text: {
        format: zodTextFormat(multiWorkoutSchema, "workout"),
      },
    });

    console.log(JSON.stringify(result, null, 2));

    // Since we need the full data to save to the DB, we await the final tool calls.
    // 'result.toolCalls' is a Promise that resolves when the stream is finished.
    const extractedData = result.text;

    if (!extractedData) {
      throw new Error("No workout data returned by AI");
    }

    return extractedData;

  } catch (error) {
    console.error("AI Parsing Failed:", error);
    throw new Error("Failed to parse workout text");
  }
}