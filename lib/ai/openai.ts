import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

/**
 * ---------------------------------------------------------
 * CENTRAL MODEL REGISTRY
 * ---------------------------------------------------------
 * We define our models here so we can easily switch providers
 * (e.g., moving from Gemini to OpenAI) without changing every file.
 */

// 1. The "Workhorse" Model (Free, Fast, Good Vision)
// Usage: Parsing workouts, simple chat, analyzing photos
export const fastModel = google("gemini-1.5-flash");

// 2. The "Intelligence" Model (Slower, Smarter)
// Usage: Complex coaching advice, deep data correlation
export const smartModel = google("gemini-1.5-pro");

// 3. (Optional) OpenAI Fallback
// If you ever pay for OpenAI, you can uncomment this to use it as a backup
export const backupModel = openai("gpt-4o-mini");