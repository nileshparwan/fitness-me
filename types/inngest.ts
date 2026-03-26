import { EventSchemas } from "inngest";

type TrainingWorkoutCompletedEvent = {
  data: {
    workout_id: string; // training_sessions.id
    user_id: string; // who logged the workout
    subject_user_id: string | null; // workout subject user id
    subject_client_id: string | null; // workout subject client id
  };
};

type CoachingCheckinSubmittedEvent = {
  data: {
    checkin_id: string;
    created_by_user_id: string;
    subject_client_id: string | null;
    subject_user_id: string | null;
  };
};

type SupportTicketActivityEvent = {
  data: {
    ticket_id: string;
    actor_user_id: string;
    activity:
      | "created"
      | "content_updated"
      | "comment_added"
      | "comment_edited"
      | "comment_deleted"
      | "status_changed"
      | "closed"
      | "reopened";
    from_status?: "open" | "in_progress" | "resolved" | "closed" | null;
    to_status?: "open" | "in_progress" | "resolved" | "closed" | null;
    actor_is_admin: boolean;
  };
};

type SendReminderEvent = {
  data: {
    user_id: string;
    type: "meal_reminder" | "health_checkin_reminder";
  };
};

type SendGoalCheckinReminderEvent = {
  data: {
    goal_id: string;
    user_id: string;
    goal_type: string;
  };
};

type Events = {
  "admin/run.reminders": { data: {} };
  "training/workout.completed": TrainingWorkoutCompletedEvent;
  "coaching/checkin.submitted": CoachingCheckinSubmittedEvent;
  "support/ticket.activity": SupportTicketActivityEvent;
  "notification/send.reminder": SendReminderEvent;
  "notification/send.goal-checkin-reminder": SendGoalCheckinReminderEvent;
};
// Create the schema to pass to the client
export const InngestSchemas = new EventSchemas().fromRecord<Events>();
