import { generateObject } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "../prompts";
import { fastModel } from "../openai";

// Updated Schema to handle MULTIPLE workouts
export const multiWorkoutSchema = z.object({
  workouts: z.array(z.object({
    name: z.string().describe("Name of the session (e.g., 'Upper Body Power' or 'Day 1')"),
    exercises: z.array(z.object({
      name: z.string().describe("Exercise name. Use standard gym terminology."),
      sets: z.array(z.object({
        reps: z.number(),
        weight: z.number().optional().describe("0 if not specified"),
        rpe: z.number().optional(),
      })),
    })),
    notes: z.string().optional(),
  }))
});

export async function analyzeWorkoutText(rawText: string) {
  try {
    const { object } = await generateObject({
      model: fastModel,
      schema: multiWorkoutSchema,
      system: SYSTEM_PROMPTS.WORKOUT_PARSER,
      prompt: rawText,
    });
    
    return object.workouts;
  } catch (error) {
    console.error("AI Parsing Failed:", error);
    throw new Error("Failed to parse workout text");
  }
}