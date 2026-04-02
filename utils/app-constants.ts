import type { SortingState, PaginationState, VisibilityState } from "@tanstack/react-table";

export const PROGRESS_STRENGTH_LEVELS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const;

export const PROGRESS_STRENGTH_STANDARDS: Record<string, number[]> = {
  squat: [0.75, 1.25, 1.5, 2.0, 2.5],
  "bench press": [0.5, 0.75, 1.0, 1.25, 1.5],
  deadlift: [1.0, 1.5, 2.0, 2.5, 3.0],
  ohp: [0.35, 0.55, 0.7, 0.9, 1.1],
};

export const PROGRESS_CARDIO_HR_ZONES = [
  {
    key: "zone1_pct",
    shortLabel: "Z1",
    title: "Zone 1 Recovery",
    range: "<50% max HR",
    color: "#64748b",
    description: "Very easy effort, warm-up and active recovery.",
  },
  {
    key: "zone2_pct",
    shortLabel: "Z2",
    title: "Zone 2 Aerobic",
    range: "50-60% max HR",
    color: "#60a5fa",
    description: "Easy aerobic base work and long sustainable sessions.",
  },
  {
    key: "zone3_pct",
    shortLabel: "Z3",
    title: "Zone 3 Tempo",
    range: "60-70% max HR",
    color: "#4ade80",
    description: "Moderate steady-state work to build stamina.",
  },
  {
    key: "zone4_pct",
    shortLabel: "Z4",
    title: "Zone 4 Threshold",
    range: "70-85% max HR",
    color: "#fbbf24",
    description: "Hard effort near lactate threshold, performance focused.",
  },
  {
    key: "zone5_pct",
    shortLabel: "Z5",
    title: "Zone 5 Max",
    range: ">=85% max HR",
    color: "#ef4444",
    description: "Very hard intervals and peak-intensity bursts.",
  },
] as const;

export const GOAL_STATUSES = ["active", "on_track", "at_risk", "completed", "paused", "archived"] as const;
export const GOAL_STATUS_FILTER_OPTIONS = ["all", ...GOAL_STATUSES] as const;
export const GOAL_CATEGORIES = ["weight", "muscle_gain", "strength", "performance", "nutrition", "custom"] as const;
export const WEIGHT_FOCUSED_CATEGORIES = new Set(["weight", "weight_gain", "weight_maintenance", "fat_loss", "body_recomp"]);
export const STRENGTH_FOCUSED_CATEGORIES = new Set(["strength", "performance", "muscle_gain"]);
export const CLIENT_STATUS_VALUES = ["active", "paused", "blocked", "archived"] as const;
export const CLIENT_STATUS_FILTER_OPTIONS = ["all", ...CLIENT_STATUS_VALUES] as const;
export const BILLING_TYPE_VALUES = ["per_session", "session_package", "monthly", "program", "hourly"] as const;
export const PAYMENT_METHOD_VALUES = ["cash", "bank_transfer", "card", "other"] as const;
export const PAYMENT_STATUS_VALUES = ["pending", "paid"] as const;
export const PAYMENT_LOG_STATUS_FILTER_OPTIONS = ["all", "logged", "confirmed"] as const;
export const COACH_PAYMENT_STATUS_FILTER_OPTIONS = ["all", "paid", "pending", "overdue"] as const;
export const BILLING_HISTORY_STATUS_FILTER_OPTIONS = ["all", "active", "inactive"] as const;
export const CHECKIN_STATUS_VALUES = ["pending_review", "reviewed", "actioned"] as const;
export const SESSION_SLOT_VALUES = ["morning", "afternoon", "evening", "other"] as const;
export const SESSION_LOCATION_TYPE_VALUES = ["gym", "home", "outdoor", "travel", "other"] as const;
export const GOAL_DIRECTION_VALUES = ["increase", "decrease"] as const;
export const COACH_NOTE_TAG_INPUTS = [
  "general",
  "injury",
  "nutrition",
  "psychology",
  "milestone",
  "form",
  "programming",
] as const;
export const CLIENT_NOTE_TAGS = ["general", "injury", "nutrition", "psychology", "milestone"] as const;
export const CLIENT_PAYMENT_STATUSES = ["paid", "pending"] as const;
export const TABLE_PAGE_SIZE_OPTIONS_STANDARD = [10, 20, 50] as const;
export const TABLE_DEFAULT_SORTING_UPDATED_AT_DESC: SortingState = [{ id: "updated_at", desc: true }];
export const TABLE_DEFAULT_SORTING_CREATED_AT_DESC: SortingState = [{ id: "created_at", desc: true }];
export const TABLE_DEFAULT_SORTING_SESSION_DATE_DESC: SortingState = [{ id: "session_date", desc: true }];
export const TABLE_DEFAULT_PAGINATION_PAGE_0_SIZE_10: PaginationState = { pageIndex: 0, pageSize: 10 };
export const COACH_PAYMENTS_TABLE_STORAGE_KEY = "coach-payments-table:v1";
export const COACH_BILLING_TABLE_STORAGE_KEY = "coach-client-billing-table:v1";
export const CLIENT_PAYMENT_LOGS_TABLE_STORAGE_KEY = "client-payment-logs-table:v1";
export const CLIENT_BILLING_HISTORY_TABLE_STORAGE_KEY = "client-billing-history-table:v1";
export const CLIENT_PROFILE_PAYMENTS_TABLE_STORAGE_KEY = "client-profile-payments-table:v1";
export const PAYMENT_DESCRIPTION_WORD_LIMIT = 20;
export const PAYMENT_NOTES_WORD_LIMIT = 60;
export const PAYMENT_TABLE_TEXT_WORD_LIMIT = 24;
export const CLIENT_MODULE_LABELS = {
  workouts: "Workouts",
  program: "Program",
  nutrition_plan: "Nutrition Plan",
  diary: "Diary",
  steps_tracking: "Steps Tracking",
  goals: "Goals",
  check_ins: "Check-ins",
  coach_notes: "Coach Notes",
  tasks: "Tasks",
} as const;
export const PROGRESS_FILTER_RANGE_OPTIONS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
] as const;
export const PROGRESS_FILTER_TYPE_OPTIONS = [
  { value: "all", label: "All Training" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "mixed", label: "Mixed" },
] as const;

export const GOALS_TABLE_STORAGE_VERSION = "v4";
export const GOALS_TABLE_DEFAULT_SORTING: SortingState = [{ id: "updated_at", desc: true }];
export const GOALS_TABLE_DEFAULT_VISIBILITY: VisibilityState = {
  unit: false,
  start_value: false,
  start_date: false,
  target_date: false,
  notes: false,
  remaining: false,
  value_delta: false,
  pace_delta: false,
  days_remaining: false,
  elapsed_days: false,
  goal_direction: false,
  check_in_interval_days: false,
};
export const GOALS_TABLE_DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };
export const GOALS_TABLE_PAGE_SIZE_OPTIONS = ["5", "10", "20", "40"] as const;
