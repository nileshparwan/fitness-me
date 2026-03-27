import type { NutritionProgressRange } from "@/types/nutrition-progress";

export const RANGES: NutritionProgressRange[] = [7, 30, 90];

export const PANEL_CLASS =
  "glass-surface rounded-[26px] border border-white/10 bg-[#0b1224]/85 p-4 shadow-[0_24px_44px_-30px_rgba(0,0,0,0.92)] md:p-5";
export const SUB_PANEL_CLASS =
  "glass-subtle rounded-[10px] border border-white/10 bg-[#101a30]/70";

export const GRID_COLOR = "rgba(147, 162, 193, 0.2)";
export const AXIS_COLOR = "#7f8ba8";

export const CALORIES_BAR_COLOR = "#d15d7c";
export const CALORIES_LINE_COLOR = "#4fa2ff";
export const FIBER_COLOR = "#51c28b";
export const WEEKDAY_BAR_COLOR = "#d15d7c";
export const WEEKEND_BAR_COLOR = "#efb241";
export const DEFICIT_POSITIVE_COLOR = "#51c28b";
export const DEFICIT_NEGATIVE_COLOR = "#d15d7c";
export const ZERO_LINE_COLOR = "#4f5f80";

export const LOGGING_LEVEL_COLORS = {
  logged_on_target: "#51c28b",
  logged_off_target: "#efb241",
  partial_log: "#cf8b2e",
  logged_no_target: "rgba(142, 160, 198, 0.9)",
  not_logged: "rgba(142, 160, 198, 0.58)",
} as const;

export const MEAL_TYPE_PIE_COLORS = [
  "#ea5479",
  "#51c28b",
  "#4f9cff",
  "#efb241",
  "#9f88f0",
  "#7f8ba8",
];

export const MACRO_COLORS = {
  protein: "#ea5479",
  carbs: "#4f9cff",
  fat: "#efb241",
} as const;

export const MEAL_BREAKDOWN_COLORS: Record<string, string> = {
  breakfast: "#efb241",
  lunch: "#61c98f",
  dinner: "#ea5479",
  snack: "#4f9cff",
  snacks: "#4f9cff",
  other: "#9f88f0",
};
