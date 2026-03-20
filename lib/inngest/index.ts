import { analyzeWorkout } from "@/lib/inngest/functions/analyze-workout";
import { notifyCheckinSubmitted } from "@/lib/inngest/functions/notify-checkin-submitted";
import { notifyTicketActivity } from "@/lib/inngest/functions/notify-ticket-activity";
import { syncGoalFromWorkout } from "@/lib/inngest/functions/sync-goal-from-workout";

export const inngestFunctions = [
  analyzeWorkout,
  syncGoalFromWorkout,
  notifyCheckinSubmitted,
  notifyTicketActivity,
] as const;
