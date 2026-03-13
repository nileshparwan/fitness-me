import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { coachKeys } from "@/lib/query-keys-coach";

test("payment query key factory exposes billing plan and payment logs keys", () => {
  assert.deepEqual(coachKeys.billingPlan("client-1"), ["coach-tools", "clients", "billing-plan", "client-1"]);
  assert.deepEqual(coachKeys.paymentLogs("client-1", { page: 2, limit: 20, status: "logged" }), [
    "coach-tools",
    "clients",
    "payment-logs",
    "client-1",
    { page: 2, limit: 20, status: "logged" },
  ]);
  assert.deepEqual(coachKeys.todayLogs(), ["coach-tools", "payments", "today"]);
});

test("payments dashboard includes Today's Board tab and new board component", () => {
  const file = path.join(process.cwd(), "components/coach-tools/coach-payments-dashboard.tsx");
  const content = fs.readFileSync(file, "utf8");

  assert.match(content, /TabsTrigger value="today"/);
  assert.match(content, /TodaysBoard/);
  assert.match(content, /sessions_logged_today/);
  assert.match(content, /packages_expiring_soon/);
  assert.match(content, /clients_due_today/);
});

test("client payment logs page route is registered and uses logs view", () => {
  const pageFile = path.join(process.cwd(), "app/(dashboard)/clients/[clientId]/payments/page.tsx");
  const loadingFile = path.join(process.cwd(), "app/(dashboard)/clients/[clientId]/payments/loading.tsx");

  assert.equal(fs.existsSync(pageFile), true);
  assert.equal(fs.existsSync(loadingFile), true);

  const content = fs.readFileSync(pageFile, "utf8");
  assert.match(content, /ClientPaymentLogsView/);
  assert.match(content, /listClientPaymentLogsAction/);
  assert.match(content, /getClientPaymentLogStatsAction/);
});

test("payment server actions include billing plan and session logging operations", () => {
  const actionFile = path.join(process.cwd(), "app/actions/coach-tools.ts");
  const content = fs.readFileSync(actionFile, "utf8");

  assert.match(content, /createBillingPlanAction/);
  assert.match(content, /updateBillingPlanAction/);
  assert.match(content, /renewPackageAction/);
  assert.match(content, /logSessionAction/);
  assert.match(content, /deleteSessionLogAction/);
  assert.match(content, /listClientPaymentLogsAction/);
  assert.match(content, /getTodayLogsAction/);
  assert.match(content, /sessions_logged_this_week/);
  assert.match(content, /sessions_logged_this_month/);
});

test("new payment UI components do not import supabase clients directly", () => {
  const cwd = process.cwd();
  const files = [
    "components/coach-tools/billing-plan-dialog.tsx",
    "components/coach-tools/package-renewal-dialog.tsx",
    "components/coach-tools/todays-board.tsx",
    "components/coach-tools/client-payment-logs.tsx",
  ].map((entry) => path.join(cwd, entry));

  const forbidden = [
    /from\s+["']@\/lib\/supabase\/server["']/,
    /from\s+["']@\/lib\/supabase\/admin["']/,
    /from\s+["']@\/lib\/supabase\/client["']/,
    /from\s+["']@supabase\/supabase-js["']/,
  ];

  const offenders: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (forbidden.some((pattern) => pattern.test(lines[index]))) {
        offenders.push(`${path.relative(cwd, file)}:${index + 1}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});
