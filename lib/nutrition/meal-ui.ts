type MealDayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type MealTypeLike =
  | "water"
  | "breakfast"
  | "snack"
  | "lunch"
  | "pre_workout_meal"
  | "post_workout_meal"
  | "dinner"
  | "protein_drink"
  | "other";

const DEFAULT_MEAL_TYPE_ORDER: ReadonlyArray<MealTypeLike> = [
  "water",
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "other",
] as const;

const dayMap: ReadonlyArray<MealDayOfWeek> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function mealTypeOrderRank(type: string): number {
  const index = DEFAULT_MEAL_TYPE_ORDER.indexOf(type as MealTypeLike);
  return index >= 0 ? index : DEFAULT_MEAL_TYPE_ORDER.length + 1;
}

export function canNavigateDate(lastTriggeredAtMs: number, nowMs: number, throttleMs = 280): boolean {
  return nowMs - lastTriggeredAtMs >= throttleMs;
}

function normalizeInsertionPosition(rawPosition: number, listLength: number): number {
  const safePosition = Number.isFinite(rawPosition) ? Math.round(rawPosition) : listLength + 1;
  return Math.max(1, Math.min(listLength + 1, safePosition));
}

function insertAtPosition<T>(items: T[], nextItem: T, rawPosition: number): T[] {
  const index = normalizeInsertionPosition(rawPosition, items.length) - 1;
  return [...items.slice(0, index), nextItem, ...items.slice(index)];
}

export function nextSequentialPosition(positions: Array<number | null | undefined>): number {
  let maxPosition = 0;
  for (const value of positions) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    maxPosition = Math.max(maxPosition, Math.floor(value));
  }
  return maxPosition + 1;
}

export function isMealGroupSelected(mealGroupId: string | null | undefined): boolean {
  return Boolean(mealGroupId && mealGroupId.trim().length > 0);
}

export function currentMealDay(date: Date = new Date()): MealDayOfWeek {
  return dayMap[date.getDay()] ?? "mon";
}

type MacroState = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MacroQuickAction = "plus_50_kcal" | "plus_100_kcal" | "plus_10_protein" | "plus_10_carbs" | "plus_5_fat";

export function applyMacroQuickAction(current: MacroState, action: MacroQuickAction): MacroState {
  switch (action) {
    case "plus_50_kcal":
      return { ...current, calories: Math.min(2000, current.calories + 50) };
    case "plus_100_kcal":
      return { ...current, calories: Math.min(2000, current.calories + 100) };
    case "plus_10_protein":
      return { ...current, protein_g: Math.min(300, current.protein_g + 10) };
    case "plus_10_carbs":
      return { ...current, carbs_g: Math.min(300, current.carbs_g + 10) };
    case "plus_5_fat":
      return { ...current, fat_g: Math.min(300, current.fat_g + 5) };
    default:
      return current;
  }
}
