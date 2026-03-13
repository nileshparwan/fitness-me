import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  classifyClientsDashboardActivityType,
  computeGoalProgressPercent,
  computeGoalTrend,
  computeGoalTrendFromHistory,
  describeClientsDashboardActivity,
  normalizeClientGoalStatus,
  extractActivityClientId,
  isRelevantClientsDashboardActivity,
} from "@/lib/clients/dashboard";
import {
  DEFAULT_COACH_DASHBOARD_KEY_PARAMS,
  coachKeys,
  normalizeCoachDashboardKeyParams,
} from "@/lib/query-keys-coach";

test("clients dashboard query keys normalize limits predictably", () => {
  const normalized = normalizeCoachDashboardKeyParams({
    activity_limit: 6,
    notes_limit: 3,
  });

  assert.deepEqual(normalized, {
    ...DEFAULT_COACH_DASHBOARD_KEY_PARAMS,
    activity_limit: 6,
    notes_limit: 3,
  });

  const key = coachKeys.dashboardSnapshot({ activity_limit: 6, notes_limit: 3 });
  assert.deepEqual(key, ["coach-tools", "dashboard", normalized]);

  assert.deepEqual(
    coachKeys.clientGoals("client-1", "at_risk"),
    ["coach-tools", "clients", "goals", "client-1", "at_risk"]
  );
});

test("goal progress calculation handles numeric and weight-based goals", () => {
  assert.equal(
    computeGoalProgressPercent({
      current_value: 45,
      target_value: 60,
    }),
    75
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "weight",
      current_weight: 82,
      target_weight: 75,
    }),
    91
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "muscle_gain",
      current_weight: 68,
      target_weight: 72,
    }),
    94
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "weight",
      goal_direction: "decrease",
      current_value: 82,
      target_value: 75,
      current_weight: 82,
      target_weight: 75,
    }),
    91
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "weight",
      goal_direction: "increase",
      current_value: 62,
      target_value: 75,
      current_weight: 62,
      target_weight: 75,
    }),
    83
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "weight_loss",
      current_value: 60,
      target_value: 75,
      current_weight: 60,
      target_weight: 75,
    }),
    80
  );

  assert.equal(
    computeGoalProgressPercent({
      goal_type: "weight",
      goal_direction: "decrease",
      start_value: 60,
      current_value: 68,
      target_value: 75,
      start_weight: 60,
      current_weight: 68,
      target_weight: 75,
    }),
    91
  );
});

test("goal trend and status normalization are derived automatically", () => {
  assert.equal(computeGoalTrend(55, 40), "uptrend");
  assert.equal(computeGoalTrend(52, 60), "downtrend");
  assert.equal(computeGoalTrend(60, 60), "stable");
  assert.equal(computeGoalTrend(60, null), "stable");

  assert.equal(
    computeGoalTrendFromHistory(55, [{ progress_percent: 55 }, { progress_percent: 40 }]),
    "uptrend"
  );
  assert.equal(
    computeGoalTrendFromHistory(52, [{ progress_percent: 52 }, { progress_percent: 60 }]),
    "downtrend"
  );
  assert.equal(computeGoalTrendFromHistory(35, []), "stable");

  assert.equal(normalizeClientGoalStatus("at_risk"), "at_risk");
  assert.equal(normalizeClientGoalStatus("ON_TRACK"), "on_track");
  assert.equal(normalizeClientGoalStatus("invalid"), "active");
});

test("activity parsing includes nutrition events and client context", () => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;

  const message = describeClientsDashboardActivity({
    event_name: "nutrition.manual.item.add",
    client_name: "Jake T.",
    metadata: {
      item_name: "Eggs",
      meal_type: "breakfast",
      performed_on: todayIso,
      status: "success",
    },
  });

  assert.equal(message, "Jake T. added Eggs to Breakfast for today");
  assert.equal(classifyClientsDashboardActivityType("nutrition.manual.item.add"), "meal");
  assert.equal(classifyClientsDashboardActivityType("coach.client.payment.record"), "payment");
  assert.equal(
    describeClientsDashboardActivity({
      event_name: "coach.client.goal.create",
      client_name: "Sarah M.",
      metadata: {
        goal_title: "Lose 10 lbs",
        status: "active",
      },
    }),
    'Sarah M. added "Lose 10 lbs" goal'
  );
  assert.equal(
    describeClientsDashboardActivity({
      event_name: "coach.client.goal.delete",
      client_name: "Sarah M.",
      metadata: {
        goal_title: "Lose 10 lbs",
      },
    }),
    'Sarah M. deleted "Lose 10 lbs" goal'
  );
});

test("activity relevance filter ignores read/list events", () => {
  assert.equal(isRelevantClientsDashboardActivity("coach.clients.dashboard.read"), false);
  assert.equal(isRelevantClientsDashboardActivity("nutrition.manual.items.favorites"), false);
  assert.equal(isRelevantClientsDashboardActivity("nutrition.manual.item.add"), true);
  assert.equal(isRelevantClientsDashboardActivity("coach.client.note.create"), true);
});

test("activity metadata resolves client id fallback keys", () => {
  assert.equal(extractActivityClientId({ subject_client_id: "client-1" }), "client-1");
  assert.equal(extractActivityClientId({ client_id: "client-2" }), "client-2");
  assert.equal(extractActivityClientId({ created_by_client_id: "client-3" }), "client-3");
  assert.equal(extractActivityClientId({}), null);
});

test("clients dashboard UI layers do not import Supabase clients directly", () => {
  const cwd = process.cwd();
  const scanTargets = [
    "app/(dashboard)/clients",
    "components/clients",
    "hooks/use-clients-dashboard.ts",
  ].map((entry) => path.join(cwd, entry));

  const forbidden = [
    /from\s+["']@\/lib\/supabase\/server["']/,
    /from\s+["']@\/lib\/supabase\/admin["']/,
  ];

  const offenders: string[] = [];

  for (const target of scanTargets) {
    if (!fs.existsSync(target)) continue;
    const stats = fs.statSync(target);
    const files = stats.isDirectory()
      ? fs.readdirSync(target).flatMap((entry) => {
          const fullPath = path.join(target, entry);
          if (fs.statSync(fullPath).isDirectory()) return [];
          return fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") ? [fullPath] : [];
        })
      : [target];

    for (const file of files) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        if (forbidden.some((pattern) => pattern.test(lines[index]))) {
          offenders.push(`${path.relative(cwd, file)}:${index + 1}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});
