export enum AppEventName {
  WORKOUT_LOGGED = "workout.logged",
  SUPPORT_TICKET_CREATED = "support.ticket.created",
  PROFILE_UPDATED = "profile.updated",
  PASSWORD_RESET_REQUESTED = "auth.password_reset.requested",
  ACCOUNT_DELETION_REQUESTED = "account.deletion.requested",
  ACCOUNT_DELETION_RESTORED = "account.deletion.restored",
}

export type EventStatus = "success" | "error";

export type EventPayload = Record<string, unknown>;
