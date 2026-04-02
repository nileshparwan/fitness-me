export const CLIENT_PORTAL_COOKIE_NAME = "client_portal_session";
export const CLIENT_SESSION_TTL_HOURS = 24 * 7;
export const CLIENT_LOGIN_MAX_ATTEMPTS = 5;
export const CLIENT_LOGIN_LOCK_MINUTES = 15;

export const CLIENT_MODULE_KEYS = [
  "workouts",
  "program",
  "nutrition_plan",
  "diary",
  "steps_tracking",
  "goals",
  "check_ins",
  "coach_notes",
  "tasks",
] as const;

export const CLIENT_ACCESS_LEVELS = ["disabled", "read_only", "enabled"] as const;

export type ClientModuleKey = (typeof CLIENT_MODULE_KEYS)[number];
export type ClientModuleAccessLevel = (typeof CLIENT_ACCESS_LEVELS)[number];

export const CLIENT_PORTAL_LOGIN_PATH = "/client/login";
export const CLIENT_PORTAL_HOME_PATH = "/client";
