import test from "node:test";
import assert from "node:assert/strict";

import { nutritionKeys } from "@/lib/query-keys-nutrition";
import {
  applyMacroQuickAction,
  canNavigateDate,
  currentMealDay,
  isMealGroupSelected,
  nextSequentialPosition,
} from "@/lib/nutrition/meal-ui";

test("date navigation throttles rapid clicks", () => {
  assert.equal(canNavigateDate(1000, 1200, 300), false);
  assert.equal(canNavigateDate(1000, 1300, 300), true);
  assert.equal(canNavigateDate(1000, 1501, 300), true);
});

test("favorites query key refreshes when meal type changes", () => {
  const breakfast = nutritionKeys.favoritesList(40, "breakfast");
  const lunch = nutritionKeys.favoritesList(40, "lunch");

  assert.notDeepEqual(breakfast, lunch);
});

test("meal group gate requires explicit selection", () => {
  assert.equal(isMealGroupSelected(null), false);
  assert.equal(isMealGroupSelected(""), false);
  assert.equal(isMealGroupSelected("   "), false);
  assert.equal(isMealGroupSelected("0ce53d04-d27f-4db4-b3f6-67999f22fb2a"), true);
});

test("meal type insertion appends sequentially and allows duplicates", () => {
  const existing = [
    { type: "water", position: 1 },
    { type: "breakfast", position: 2 },
    { type: "breakfast", position: 3 },
  ];
  assert.equal(nextSequentialPosition(existing.map((item) => item.position)), 4);

  const outOfOrder = [5, 2, 9, 4];
  assert.equal(nextSequentialPosition(outOfOrder), 10);
});

test("planner defaults day tab to current day", () => {
  assert.equal(currentMealDay(new Date(Date.UTC(2026, 2, 8, 12, 0, 0))), "sun");
  assert.equal(currentMealDay(new Date(Date.UTC(2026, 2, 9, 12, 0, 0))), "mon");
});

test("quick macro actions increment expected metrics with caps", () => {
  const start = {
    calories: 1950,
    protein_g: 295,
    carbs_g: 294,
    fat_g: 298,
  };

  const plus100 = applyMacroQuickAction(start, "plus_100_kcal");
  assert.equal(plus100.calories, 2000);

  const plusProtein = applyMacroQuickAction(start, "plus_10_protein");
  assert.equal(plusProtein.protein_g, 300);

  const plusCarbs = applyMacroQuickAction(start, "plus_10_carbs");
  assert.equal(plusCarbs.carbs_g, 300);

  const plusFat = applyMacroQuickAction(start, "plus_5_fat");
  assert.equal(plusFat.fat_g, 300);
});
