import { notifyCheckinSubmitted } from "@/lib/inngest/functions/notify-checkin-submitted";
import {
  handleSendCycleReminder,
  sendCycleReminders,
} from "@/lib/inngest/functions/send-cycle-reminders";
import { handleSendGoalCheckinReminder, sendGoalCheckinReminders } from "@/lib/inngest/functions/send-goal-checkin-reminders";
import { notifyTicketActivity } from "@/lib/inngest/functions/notify-ticket-activity";
import { handleSendReminder, sendDailyReminders } from "@/lib/inngest/functions/send-daily-reminders";
import { syncGoalFromWorkout } from "@/lib/inngest/functions/sync-goal-from-workout";

export const inngestFunctions = [
  syncGoalFromWorkout,
  notifyCheckinSubmitted,
  notifyTicketActivity,
  sendDailyReminders,
  handleSendReminder,
  sendCycleReminders,
  handleSendCycleReminder,
  sendGoalCheckinReminders,
  handleSendGoalCheckinReminder,
] as const;
