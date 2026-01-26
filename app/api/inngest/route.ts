import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeWorkout } from "@/lib/inngest/functions/analyze-workout";
import { generateWeeklyReport } from "@/lib/inngest/functions/generate-weekly-report";
import { analyzePhoto } from "@/lib/inngest/functions/analyze-photo";
import { sendReminders } from "@/lib/inngest/functions/send-reminders";
import { generateInsights } from "@/lib/inngest/functions/generate-insight";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeWorkout,
    generateWeeklyReport,
    analyzePhoto,
    generateInsights,
    sendReminders
  ],
});