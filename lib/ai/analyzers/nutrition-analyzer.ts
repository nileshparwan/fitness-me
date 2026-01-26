import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "../prompts";

// 1. Define Schema
const nutritionSchema = z.object({
  foodItems: z.array(z.object({
    name: z.string().describe("Specific name of the food item."),
    estimatedCalories: z.number(),
    macros: z.object({
      protein: z.number().describe("in grams"),
      carbs: z.number().describe("in grams"),
      fats: z.number().describe("in grams"),
    }),
    confidenceScore: z.number().min(0).max(1).describe("How confident are you in this estimation?"),
  })),
  totalCalories: z.number(),
  healthScore: z.number().min(1).max(10).describe("1=Junk, 10=Superfood. Rate the nutritional density."),
});

type AnalyzerInput = {
  type: "text" | "image";
  content: string; // Either the raw text or the base64 image string
};

// 2. The Analyzer Function
export async function analyzeNutrition(input: AnalyzerInput) {
  try {
    const messages: any[] = [
      {
        role: "user",
        content: input.type === "text" 
          ? [{ type: "text", text: `Analyze the nutritional content of this meal: "${input.content}"` }]
          : [
              { type: "text", text: "Estimate the calories and macros visible in this food photo." },
              { type: "image", image: input.content }
            ],
      },
    ];

    const { object } = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: nutritionSchema,
      system: SYSTEM_PROMPTS.NUTRITION_ANALYZER,
      messages: messages,
    });

    return object;
  } catch (error) {
    console.error("AI Nutrition Analysis Failed:", error);
    throw new Error("Failed to analyze nutrition");
  }
}