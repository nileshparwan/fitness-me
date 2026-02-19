import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const fastModel = google("gemini-1.5-flash");

export const smartModel = google("gemini-1.5-pro");

export const backupModel = openai(process.env.OPENAI_AI_MODEL!);