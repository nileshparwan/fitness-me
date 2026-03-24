import { analyzeWorkout } from "@/lib/inngest/functions/analyze-workout";
import { notifyCheckinSubmitted } from "@/lib/inngest/functions/notify-checkin-submitted";
import { handleSendGoalCheckinReminder, sendGoalCheckinReminders } from "@/lib/inngest/functions/send-goal-checkin-reminders";
import { notifyTicketActivity } from "@/lib/inngest/functions/notify-ticket-activity";
import { handleSendReminder, sendDailyReminders } from "@/lib/inngest/functions/send-daily-reminders";
import { syncGoalFromWorkout } from "@/lib/inngest/functions/sync-goal-from-workout";

export const inngestFunctions = [
  analyzeWorkout,
  syncGoalFromWorkout,
  notifyCheckinSubmitted,
  notifyTicketActivity,
  sendDailyReminders,
  handleSendReminder,
  sendGoalCheckinReminders,
  handleSendGoalCheckinReminder,
] as const;
