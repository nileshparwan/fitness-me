import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

function collectTsFiles(targetPath: string, files: string[] = []) {
  if (!fs.existsSync(targetPath)) return files;
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

test("listMyGoalsAction scopes to personal goals only", () => {
  const content = read("app/actions/coach-tools.ts");
  const match = content.match(/export async function listMyGoalsAction[\s\S]*?export async function createMyGoalAction/);
  assert.ok(match, "listMyGoalsAction block not found");

  const block = match[0];
  assert.match(block, /\.eq\("is_personal_goal",\s*true\)/);
  assert.doesNotMatch(block, /\.or\(`assigned_by_id\.eq\.\$\{user\.id\},assigned_by_id\.is\.null`\)/);
});

test("listClientGoalsAction excludes personal goals", () => {
  const content = read("app/actions/coach-tools.ts");
  const match = content.match(/export async function listClientGoalsAction[\s\S]*?export async function createClientGoalAction/);
  assert.ok(match, "listClientGoalsAction block not found");

  assert.match(match[0], /\.eq\("is_personal_goal",\s*false\)/);
});

test("/settings/account redirects to /settings/security", () => {
  const accountPage = read("app/(dashboard)/(account)/settings/account/page.tsx");
  assert.match(accountPage, /redirect\("\/settings\/security"\)/);
});

test("settings profile read keeps profiles->metadata transition fallback", () => {
  const settingsAction = read("app/actions/settings.ts");

  assert.match(
    settingsAction,
    /toNullableText\(profileData\?\.full_name\)\s*\|\|\s*toNullableText\(\(metadata as Record<string, unknown>\)\.full_name\)/
  );
  assert.match(settingsAction, /toNullableText\(\(metadata as Record<string, unknown>\)\.display_name\)/);
  assert.match(settingsAction, /toNullableText\(profileData\?\.bio\)\s*\|\|\s*toNullableText\(\(metadata as Record<string, unknown>\)\.bio\)/);
  assert.match(
    settingsAction,
    /toNullableText\(profileData\?\.avatar_url\)\s*\|\|\s*toNullableText\(\(metadata as Record<string, unknown>\)\.avatar_url\)/
  );
  assert.match(settingsAction, /const phone = toNullableText\(\(metadata as Record<string, unknown>\)\.phone\)/);
  assert.doesNotMatch(settingsAction, /profileData\?\.phone/);
  assert.match(settingsAction, /profileData\?\.preferred_units \?\? \(metadata as Record<string, unknown>\)\.preferred_units/);
  assert.match(settingsAction, /default_calories: toNullableInt\(\(metadata as Record<string, unknown>\)\.default_calories\)/);
  assert.match(settingsAction, /default_protein: toNullableInt\(\(metadata as Record<string, unknown>\)\.default_protein\)/);
  assert.match(settingsAction, /default_carbs: toNullableInt\(\(metadata as Record<string, unknown>\)\.default_carbs\)/);
  assert.match(settingsAction, /default_fat: toNullableInt\(\(metadata as Record<string, unknown>\)\.default_fat\)/);
  assert.match(settingsAction, /compact_mode: toBoolean\(\(metadata as Record<string, unknown>\)\.compact_mode\)/);
});

test("progress profile action reads date_of_birth from profiles table", () => {
  const progressAction = read("app/actions/progress.ts");

  assert.match(progressAction, /\.from\("profiles"\)/);
  assert.match(progressAction, /\.select\("date_of_birth"\)/);
  assert.match(progressAction, /birth_date:\s*profile\?\.date_of_birth/);
  assert.doesNotMatch(progressAction, /user\.user_metadata\.birth_date/);
});

test("inngest client uses env key instead of hardcoded credential", () => {
  const inngestClient = read("lib/inngest/client.ts");

  assert.match(inngestClient, /eventKey:\s*process\.env\.INNGEST_EVENT_KEY/);
  assert.doesNotMatch(inngestClient, /eventKey:\s*["'][A-Za-z0-9_\-]{20,}["']/);
});

test("goal actions no longer revalidate defunct /settings/goals route", () => {
  const coachActions = read("app/actions/coach-tools.ts");
  assert.doesNotMatch(coachActions, /revalidatePath\("\/settings\/goals"\)/);
});

test("route allowlists use /settings/security only", () => {
  const routeAccess = read("lib/auth/route-access.ts");
  const proxy = read("lib/supabase/proxy.ts");

  assert.match(routeAccess, /isPrefixMatch\(pathname,\s*"\/settings\/security"\)/);
  assert.doesNotMatch(routeAccess, /\/settings\/account/);

  assert.match(proxy, /allowedPasswordSetupPaths = \['\/settings\/security', '\/api\/auth\/callback'\]/);
  assert.doesNotMatch(proxy, /\/settings\/account/);
});

test("database types no longer include weekly_training_volume view", () => {
  const databaseTypes = read("types/database.ts");
  assert.doesNotMatch(databaseTypes, /weekly_training_volume/);
});

test("preferred_units auth metadata reads are removed outside settings action", () => {
  const cwd = process.cwd();
  const scanRoots = ["app", "components", "hooks", "lib", "stores", "utils", "types", "tests"];
  const files = scanRoots.flatMap((entry) => collectTsFiles(path.join(cwd, entry)));

  const offenders: string[] = [];
  const pattern = /user_metadata\.preferred_units|user_metadata\?\.preferred_units/;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (!pattern.test(content)) continue;
    const relPath = path.relative(cwd, file);
    if (relPath === "app/actions/settings.ts") continue;
    offenders.push(relPath);
  }

  assert.deepEqual(offenders, []);
});
