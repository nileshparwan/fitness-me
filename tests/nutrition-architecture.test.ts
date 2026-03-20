import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS,
  nutritionKeys,
} from "@/lib/query-keys-nutrition";
import { useNutritionUiStore } from "@/stores/use-nutrition-ui-store";
import { mealGroupKeys } from "@/lib/query-keys-meal-groups";
import { nutritionDashboardKeys } from "@/lib/query-keys-nutrition-dashboard";
import { nutritionKeys as legacyNutritionKeys } from "@/lib/query-keys-nutrition";
import { nutritionProgramKeys } from "@/lib/query-keys-nutrition-program";
import {
  classifyNutritionActivityType,
  describeNutritionActivity,
  shouldIncludeNutritionActivityForScope,
} from "@/lib/nutrition/dashboard-activity";

function collectTsFiles(targetPath: string, files: string[] = []) {
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      collectTsFiles(path.join(targetPath, entry), files);
    }
    return files;
  }

  if (targetPath.endsWith(".ts") || targetPath.endsWith(".tsx")) {
    files.push(targetPath);
  }

  return files;
}

test("nutrition ui store supports focused cross-page updates", () => {
  const store = useNutritionUiStore;
  store.getState().resetNutritionUiState();

  store.getState().setSelectedDate("2026-03-08");
  store.getState().setSelectedMealGroupId("  group-123  ");
  store.getState().setSelectedPlannerDay("thu");
  store.getState().setActiveSubject("client", "client-77");
  store.getState().setDiaryFilters({ favorites_meal_type: "breakfast" });
  store.getState().setPlannerFilters({ meal_type: "dinner" });
  store.getState().setViewMode("planner");
  store.getState().setNavigationSource("planner");

  const state = store.getState();
  assert.equal(state.selectedDate, "2026-03-08");
  assert.equal(state.selectedMealGroupId, "group-123");
  assert.equal(state.selectedPlannerDay, "thu");
  assert.equal(state.activeSubjectType, "client");
  assert.equal(state.activeSubjectId, "client-77");
  assert.equal(state.diaryFilters.favorites_meal_type, "breakfast");
  assert.equal(state.plannerFilters.meal_type, "dinner");
  assert.equal(state.viewMode, "planner");
  assert.equal(state.navigationSource, "planner");
});

test("recent diary items are deduped and capped at 10 entries", () => {
  const store = useNutritionUiStore;
  store.getState().resetNutritionUiState();

  for (let index = 1; index <= 12; index += 1) {
    store.getState().pushRecentDiaryItem({
      item_name: `Item ${index}`,
      quantity: 1,
      unit: "serving",
      calories: index * 10,
      protein_g: index,
      carbs_g: index,
      fat_g: index,
      fiber_g: null,
      notes: null,
    });
  }

  store.getState().pushRecentDiaryItem({
    item_name: "Item 5",
    quantity: 1,
    unit: "serving",
    calories: 555,
    protein_g: 55,
    carbs_g: 55,
    fat_g: 55,
    fiber_g: null,
    notes: "updated",
  });

  const recent = store.getState().recentDiaryItems;
  assert.equal(recent.length, 10);
  assert.equal(recent[0]?.item_name, "Item 5");
  assert.equal(recent[0]?.calories, 555);

  const keys = new Set(recent.map((item) => `${item.item_name.toLowerCase()}::${item.unit || ""}`));
  assert.equal(keys.size, recent.length);
});

test("diary meal type order supports functional updates and normalizes persisted values", () => {
  const store = useNutritionUiStore;
  store.getState().resetNutritionUiState();

  store.getState().setDiaryMealTypeOrder([" water ", "breakfast", "", "water"]);
  assert.deepEqual(store.getState().diaryMealTypeOrder, ["water", "breakfast"]);

  store.getState().setDiaryMealTypeOrder((previous) => [...previous, "lunch", "water"]);
  assert.deepEqual(store.getState().diaryMealTypeOrder, ["water", "breakfast", "lunch"]);

  store.getState().clearDiaryMealTypeOrder();
  assert.deepEqual(store.getState().diaryMealTypeOrder, []);
});

test("planner meal type order is day scoped and supports functional updates", () => {
  const store = useNutritionUiStore;
  store.getState().resetNutritionUiState();

  store.getState().setPlannerMealTypeOrder("mon", [" breakfast ", "water", "", "water"]);
  assert.deepEqual(store.getState().plannerMealTypeOrderByDay.mon, ["breakfast", "water"]);

  store.getState().setPlannerMealTypeOrder("mon", (previous) => [...previous, "lunch", "breakfast"]);
  assert.deepEqual(store.getState().plannerMealTypeOrderByDay.mon, ["breakfast", "water", "lunch"]);

  store.getState().setPlannerMealTypeOrder("tue", ["dinner"]);
  assert.deepEqual(store.getState().plannerMealTypeOrderByDay.tue, ["dinner"]);

  store.getState().clearPlannerMealTypeOrder("mon");
  assert.equal(store.getState().plannerMealTypeOrderByDay.mon, undefined);
  assert.deepEqual(store.getState().plannerMealTypeOrderByDay.tue, ["dinner"]);
});

test("meal-group meal type order is scoped by group and day", () => {
  const store = useNutritionUiStore;
  store.getState().resetNutritionUiState();

  store.getState().setMealGroupMealTypeOrder("group-a", "mon", [" breakfast ", "water", "water"]);
  store.getState().setMealGroupMealTypeOrder("group-a", "tue", ["lunch"]);
  store.getState().setMealGroupMealTypeOrder("group-b", "mon", ["dinner"]);
  store.getState().setMealGroupMealTypeOrder("group-a", "mon", (previous) => [...previous, "snack", "breakfast"]);

  assert.deepEqual(store.getState().mealGroupMealTypeOrderByGroup["group-a"]?.mon, ["breakfast", "water", "snack"]);
  assert.deepEqual(store.getState().mealGroupMealTypeOrderByGroup["group-a"]?.tue, ["lunch"]);
  assert.deepEqual(store.getState().mealGroupMealTypeOrderByGroup["group-b"]?.mon, ["dinner"]);

  store.getState().clearMealGroupMealTypeOrder("group-a", "mon");
  assert.equal(store.getState().mealGroupMealTypeOrderByGroup["group-a"]?.mon, undefined);
  assert.deepEqual(store.getState().mealGroupMealTypeOrderByGroup["group-a"]?.tue, ["lunch"]);

  store.getState().clearMealGroupMealTypeOrder("group-a", "tue");
  assert.equal(store.getState().mealGroupMealTypeOrderByGroup["group-a"], undefined);
  assert.deepEqual(store.getState().mealGroupMealTypeOrderByGroup["group-b"]?.mon, ["dinner"]);
});

test("legacy query key adapters stay consistent with shared nutrition key factory", () => {
  const dayKey = legacyNutritionKeys.diaryDay("2026-03-08", { subject_user_id: "u-1" }, "g-1");
  const sharedDayKey = nutritionKeys.diaryDay("2026-03-08", { subject_user_id: "u-1" }, "g-1");
  assert.deepEqual(dayKey, sharedDayKey);

  const groupParams = { page: 0, pageSize: 12, status: "all" as const, includeSnapshots: false };
  assert.deepEqual(mealGroupKeys.listByParams(groupParams), nutritionKeys.groupsList(groupParams));
  assert.deepEqual(nutritionDashboardKeys.summary(), nutritionKeys.dashboardSummary());
  assert.deepEqual(
    nutritionDashboardKeys.activity({ subject_client_id: "c-1" }, 10, "g-1"),
    nutritionKeys.dashboardActivity({ subject_client_id: "c-1" }, 10, "g-1")
  );
  assert.deepEqual(nutritionProgramKeys.plan("abc"), nutritionKeys.programById("abc"));
  assert.deepEqual(nutritionKeys.mealGroupOptions(), [
    "nutrition",
    "groups",
    "options",
    DEFAULT_NUTRITION_MEAL_GROUP_OPTIONS_PARAMS,
  ]);
});

test("nutrition UI layers do not import Supabase clients directly", () => {
  const cwd = process.cwd();
  const scanTargets = [
    "app/(dashboard)/(nutrition-domain)",
    "app/share/nutrition",
    "components/nutrition",
    "hooks/use-nutrition-data.ts",
    "hooks/use-meal-groups.ts",
    "hooks/use-nutrition-dashboard.ts",
    "hooks/use-nutrition-manual.ts",
    "stores/use-nutrition-ui-store.ts",
  ].map((entry) => path.join(cwd, entry));

  const forbidden = [
    /from\s+["']@\/lib\/supabase\/client["']/,
    /from\s+["']@\/lib\/supabase\/server["']/,
    /from\s+["']@\/lib\/supabase\/admin["']/,
    /from\s+["']@supabase\/supabase-js["']/,
  ];

  const offenders: string[] = [];

  for (const target of scanTargets) {
    if (!fs.existsSync(target)) continue;
    const files = collectTsFiles(target);
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        if (forbidden.some((pattern) => pattern.test(line))) {
          offenders.push(`${path.relative(cwd, file)}:${index + 1}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test("nutrition dashboard activity utilities classify and filter scoped activities", () => {
  assert.equal(classifyNutritionActivityType("nutrition.manual.item.add"), "meal");
  assert.equal(classifyNutritionActivityType("nutrition.meal-groups.assign"), "assignment");
  assert.equal(classifyNutritionActivityType("nutrition.meal-groups.create"), "group");

  const label = describeNutritionActivity("nutrition.manual.item.add", {
    item_name: "Greek Yogurt Bowl",
    meal_type: "breakfast",
  });
  assert.equal(label, "Added Greek Yogurt Bowl to Breakfast");

  const favoriteLabel = describeNutritionActivity("nutrition.manual.favorite.toggle", {
    item_name: "Eggs",
    favorite_action: "added",
  });
  assert.equal(favoriteLabel, "Added Eggs to favorites");

  assert.equal(
    shouldIncludeNutritionActivityForScope(
      { subject_user_id: null, subject_client_id: "client-1", meal_group_id: null },
      { subject_client_id: "client-1" }
    ),
    true
  );
  assert.equal(
    shouldIncludeNutritionActivityForScope(
      { subject_user_id: "user-2", subject_client_id: null, meal_group_id: null },
      { subject_user_id: "user-1" }
    ),
    false
  );
  assert.equal(
    shouldIncludeNutritionActivityForScope(
      { subject_user_id: null, subject_client_id: "client-2", meal_group_id: "group-1" },
      { subject_client_id: "client-9", meal_group_id: "group-1" }
    ),
    true
  );
  assert.equal(
    shouldIncludeNutritionActivityForScope(
      { subject_user_id: null, subject_client_id: null, meal_group_id: null },
      { subject_user_id: "user-1" }
    ),
    true
  );
});
