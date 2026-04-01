"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  buildIsoDateRange,
  fillDailySeries,
  incrementMapValue,
  isoDateToWeekday,
  weekdayOrder,
} from "@/lib/admin/chart-utils";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";


type AdminUsersPage = {
  rows: Array<{
    user_id: string;
    email: string | null;
    role: Database["public"]["Enums"]["user_role"];
    sessions_count: number;
    meal_groups_count: number;
    goals_count: number;
    last_activity: string | null;
    is_blocked: boolean;
    is_deleted: boolean;
  }>;
  page: number;
  has_more: boolean;
};

type ListUsersResponse = Awaited<
  ReturnType<ReturnType<typeof createAdminClient>["auth"]["admin"]["listUsers"]>
>;
type AuthAdminUser = NonNullable<ListUsersResponse["data"]>["users"][number];
type TrainingSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type StrengthSetRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type MealGroupRow = Database["public"]["Tables"]["meal_groups"]["Row"];
type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type AppRole = Database["public"]["Enums"]["user_role"];

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "sysadmin") {
    throw new Error("Unauthorized");
  }

  return user;
}

async function safeCount(table: string, filter?: (q: any) => any) {
  try {
    const admin = createAdminClient();
    let q = admin.from(table as any).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function listAllAuthUsers() {
  const admin = createAdminClient();
  const perPage = 1000;
  let page = 1;
  const users: AuthAdminUser[] = [];

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const chunk = data?.users || [];
    users.push(...chunk);
    if (!data?.nextPage || chunk.length === 0) break;
    page += 1;
  }

  return users;
}

const ONLINE_WINDOW_MS = 30 * 60 * 1000;

function isUserCurrentlyLoggedIn(lastSignInAt: string | null | undefined) {
  if (!lastSignInAt) return false;
  const lastSignIn = new Date(lastSignInAt).getTime();
  if (Number.isNaN(lastSignIn)) return false;
  return Date.now() - lastSignIn <= ONLINE_WINDOW_MS;
}

function resolveUserRole(user: AuthAdminUser): Database["public"]["Enums"]["user_role"] {
  const role = String(user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();
  if (role === "admin" || role === "sysadmin") return "sysadmin";
  return "user";
}

type ProfileFlags = { role: AppRole; is_deleted: boolean; is_blocked: boolean };

async function getProfileMap(userIds: string[]): Promise<Map<string, ProfileFlags>> {
  const admin = createAdminClient();
  const uniqueIds = Array.from(new Set(userIds));
  if (uniqueIds.length === 0) return new Map<string, ProfileFlags>();

  const { data, error } = await admin
    .from("profiles")
    .select("id, role, is_deleted, is_blocked")
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);

  const map = new Map<string, ProfileFlags>();
  for (const row of data || []) {
    map.set(row.id, {
      role: row.role as AppRole,
      is_deleted: Boolean(row.is_deleted),
      is_blocked: Boolean(row.is_blocked),
    });
  }
  return map;
}

/** @deprecated Use getProfileMap instead */
async function getProfileRoleMap(userIds: string[]): Promise<Map<string, AppRole>> {
  const profileMap = await getProfileMap(userIds);
  const map = new Map<string, AppRole>();
  for (const [id, flags] of profileMap) {
    map.set(id, flags.role);
  }
  return map;
}

function toIsoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export async function getAdminDashboardStats() {
  return runTrackedAction({
    eventName: "admin.dashboard.stats.read",
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();

      const throughputDates = buildIsoDateRange(30);
      const throughputStart = `${throughputDates[0]}T00:00:00.000Z`;

      const [users, sessionsRes, setsRes, mealGroupsRes, ticketsRes, recentEvents, totalSessions, totalMealGroups] = await Promise.all([
        listAllAuthUsers(),
        admin
          .from("training_sessions")
          .select("created_at", { count: "exact" })
          .gte("created_at", throughputStart),
        admin.from("strength_sets").select("id", { count: "exact", head: true }),
        admin.from("meal_groups").select("created_at", { count: "exact" }).eq("is_snapshot", false).gte("created_at", throughputStart),
        admin.from("tickets").select("created_at", { count: "exact" }).gte("created_at", throughputStart),
        safeCount("analytics_events", (q) =>
          q.gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
        ),
        safeCount("training_sessions"),
        safeCount("meal_groups", (q) => q.eq("is_snapshot", false)),
      ]);

      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (mealGroupsRes.error) throw new Error(mealGroupsRes.error.message);
      if (ticketsRes.error) throw new Error(ticketsRes.error.message);

      const roleMap = await getProfileRoleMap(users.map((user) => user.id));

      const currentlyLoggedInUsers = users.filter((user) => isUserCurrentlyLoggedIn(user.last_sign_in_at)).length;
      const currentlyLoggedInAdmins = users.filter(
        (user) =>
          isUserCurrentlyLoggedIn(user.last_sign_in_at) &&
          (roleMap.get(user.id) ?? resolveUserRole(user)) === "sysadmin"
      ).length;

      const actionMap = new Map<string, number>();
      for (const row of (sessionsRes.data || []) as Pick<TrainingSessionRow, "created_at">[]) {
        const key = toIsoDay(row.created_at);
        if (key && throughputDates.includes(key)) incrementMapValue(actionMap, key);
      }
      for (const row of (mealGroupsRes.data || []) as Pick<MealGroupRow, "created_at">[]) {
        const key = toIsoDay(row.created_at);
        if (key && throughputDates.includes(key)) incrementMapValue(actionMap, key);
      }
      for (const row of (ticketsRes.data || []) as Pick<TicketRow, "created_at">[]) {
        const key = toIsoDay(row.created_at);
        if (key && throughputDates.includes(key)) incrementMapValue(actionMap, key);
      }

      const platformThroughput30d = fillDailySeries<{ actions: number }>(
        throughputDates,
        actionMap,
        "actions"
      ).map((row) => ({
        date: row.date,
        actions: row.actions,
      }));

      return {
        total_users: users.length,
        currently_logged_in_users: currentlyLoggedInUsers,
        currently_logged_in_admins: currentlyLoggedInAdmins,
        total_sessions: totalSessions,
        total_strength_sets: setsRes.count ?? 0,
        total_meal_groups: totalMealGroups,
        recent_events: recentEvents,
        platform_throughput_30d: platformThroughput30d,
      };
    },
  });
}

export async function getAdminUsers(search = "", page = 1, pageSize = 100): Promise<AdminUsersPage> {
  return runTrackedAction({
    eventName: "admin.users.list",
    payload: { search: search || null, page, page_size: pageSize },
    action: async () => {
  await requireAdminUser();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  if (error) throw new Error(error.message);
  const profileMap = await getProfileMap((data.users || []).map((user) => user.id));

  let users = data.users || [];
  if (search.trim()) {
    const term = search.toLowerCase();
    users = users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const id = u.id.toLowerCase();
      const role = resolveUserRole(u).toLowerCase();
      return email.includes(term) || id.includes(term) || role.includes(term);
    });
  }

  const rows = users.map((u) => {
    const flags = profileMap.get(u.id);
    return {
      user_id: u.id,
      email: u.email ?? null,
      role: flags?.role ?? resolveUserRole(u),
      sessions_count: 0,
      meal_groups_count: 0,
      goals_count: 0,
      last_activity: u.last_sign_in_at ?? null,
      is_blocked: flags?.is_blocked ?? false,
      is_deleted: flags?.is_deleted ?? false,
    };
  });

  return {
    rows,
    page,
    has_more: Boolean(data?.nextPage && data.nextPage > page),
  };
    },
  });
}

export async function getAdminUserStats(days = 90) {
  return runTrackedAction({
    eventName: "admin.users.stats.read",
    payload: { days },
    action: async () => {
      await requireAdminUser();
      const users = await listAllAuthUsers();
      const roleMap = await getProfileRoleMap(users.map((user) => user.id));
      const now = Date.now();
      const daysMs = days * 86400000;
      const thirtyMs = 30 * 86400000;
      const ninetyMs = 90 * 86400000;
      const atRiskDays = 14;

      const totalUsers = users.length;
      const totalAdmins = users.filter(
        (u) => (roleMap.get(u.id) ?? resolveUserRole(u)) === "sysadmin"
      ).length;
      const activeLast30 = users.filter(
        (u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= thirtyMs
      ).length;
      const likelyLeaving = users.filter(
        (u) => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > thirtyMs
      ).length;
      const likelyLeft = users.filter(
        (u) => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > ninetyMs
      ).length;
      const joinedInWindow = users.filter((u) => now - new Date(u.created_at).getTime() <= daysMs).length;

      const rangeDays = Math.max(30, days);
      const isoRange = buildIsoDateRange(rangeDays);
      const isoRangeSet = new Set(isoRange);
      const joinMap = new Map<string, number>();
      const riskMap = new Map<string, number>();

      for (const user of users) {
        const joinedIso = toIsoDay(user.created_at);
        if (joinedIso && isoRangeSet.has(joinedIso)) {
          incrementMapValue(joinMap, joinedIso);
        }
      }

      for (const isoDate of isoRange) {
        const snapshotTime = new Date(`${isoDate}T23:59:59.999Z`).getTime();
        const riskCutoff = snapshotTime - atRiskDays * 86400000;

        const atRiskCount = users.reduce((count, user) => {
          const createdAt = new Date(user.created_at).getTime();
          if (Number.isNaN(createdAt) || createdAt > snapshotTime) return count;

          if (!user.last_sign_in_at) return count + 1;
          const lastSignIn = new Date(user.last_sign_in_at).getTime();
          if (Number.isNaN(lastSignIn)) return count + 1;
          return lastSignIn <= riskCutoff ? count + 1 : count;
        }, 0);

        riskMap.set(isoDate, atRiskCount);
      }

      const joinedSeries = fillDailySeries<{ joined: number }>(isoRange, joinMap, "joined");
      const riskSeries = fillDailySeries<{ risk: number }>(isoRange, riskMap, "risk");
      const joinVsRiskTrend = joinedSeries.map((row, index) => ({
        date: row.date,
        joined: row.joined,
        risk: riskSeries[index]?.risk ?? 0,
      }));

      return {
        total_users: totalUsers,
        total_admins: totalAdmins,
        active_last_30_days: activeLast30,
        likely_leaving_30_days: likelyLeaving,
        likely_left_90_days: likelyLeft,
        joined_in_window: joinedInWindow,
        join_vs_risk_trend: joinVsRiskTrend,
        join_trend: joinVsRiskTrend.map((item) => ({ date: item.date, count: item.joined })),
        leave_risk_trend: joinVsRiskTrend.map((item) => ({ date: item.date, count: item.risk })),
      };
    },
  });
}

export async function getAdminUserDetail(userId: string) {
  return runTrackedAction({
    eventName: "admin.user.detail.read",
    payload: { user_id: userId },
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();

      const [sessionsRes, mealGroupsRes, userWorkoutIdsRes] = await Promise.all([
        admin
          .from("training_sessions")
          .select("id, name, date, status, duration_minutes, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        admin
          .from("meal_groups")
          .select("*")
          .eq("owner_user_id", userId)
          .eq("is_snapshot", false)
          .order("created_at", { ascending: false })
          .limit(50),
        admin.from("training_sessions").select("id").eq("user_id", userId),
      ]);

      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (mealGroupsRes.error) throw new Error(mealGroupsRes.error.message);
      if (userWorkoutIdsRes.error) throw new Error(userWorkoutIdsRes.error.message);

      const workoutIds = ((userWorkoutIdsRes.data || []) as Pick<TrainingSessionRow, "id">[]).map((row) => row.id);
      let strengthSetsCount = 0;
      if (workoutIds.length > 0) {
        const setsRes = await admin
          .from("strength_sets")
          .select("id", { count: "exact", head: true })
          .in("workout_id", workoutIds);
        if (setsRes.error) throw new Error(setsRes.error.message);
        strengthSetsCount = setsRes.count ?? 0;
      }

      const sessions = ((sessionsRes.data || []) as Pick<
        TrainingSessionRow,
        "id" | "name" | "date" | "status" | "duration_minutes" | "created_at"
      >[]).map((row) => ({
        id: row.id,
        name: row.name,
        date: row.date ?? row.created_at,
        status: row.status,
        duration_minutes: row.duration_minutes,
      }));

      const mealGroups = ((mealGroupsRes.data || []) as MealGroupRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        start_date: row.start_date ?? row.created_at.slice(0, 10),
        end_date: row.end_date ?? row.created_at.slice(0, 10),
      }));

      return {
        sessions,
        meal_groups: mealGroups,
        strength_sets_count: strengthSetsCount,
      };
    },
  });
}

export async function getAdminTrainingStats(_days = 30) {
  return runTrackedAction({
    eventName: "admin.training.stats.read",
    payload: { days: _days },
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();
      const days = Math.max(7, _days);
      const isoRange = buildIsoDateRange(days);
      const isoRangeSet = new Set(isoRange);
      const startDate = `${isoRange[0]}T00:00:00.000Z`;

      const [sessionsRes, setsRes, cardioRes] = await Promise.all([
        admin
          .from("training_sessions")
          .select("id, user_id, date, status, duration_minutes, created_at")
          .gte("created_at", startDate),
        admin
          .from("strength_sets")
          .select("exercise_name, reps, weight, workout_id, created_at")
          .gte("created_at", startDate),
        admin.from("cardio_sessions").select("id", { count: "exact", head: true }).gte("created_at", startDate),
      ]);

      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (setsRes.error) throw new Error(setsRes.error.message);
      if (cardioRes.error) throw new Error(cardioRes.error.message);

      const sessions = (sessionsRes.data || []) as Pick<
        TrainingSessionRow,
        "id" | "user_id" | "date" | "status" | "duration_minutes" | "created_at"
      >[];
      const sets = (setsRes.data || []) as Pick<
        StrengthSetRow,
        "exercise_name" | "reps" | "weight" | "workout_id" | "created_at"
      >[];

      const sessionsPerDay = new Map<string, number>();
      const weekdayMap = new Map<string, number>();
      const statusMap = new Map<string, number>();
      const durationValues: number[] = [];
      const athleteIds = new Set<string>();
      const exerciseAgg = new Map<string, { sets: number; total_volume_kg: number }>();

      for (const label of weekdayOrder()) {
        weekdayMap.set(label, 0);
      }

      for (const session of sessions) {
        const isoDate = toIsoDay(session.date || session.created_at);
        if (!isoDate || !isoRangeSet.has(isoDate)) continue;

        incrementMapValue(sessionsPerDay, isoDate);
        const weekday = isoDateToWeekday(isoDate);
        incrementMapValue(weekdayMap, weekday);

        if (session.status) {
          incrementMapValue(statusMap, session.status.toLowerCase());
        } else {
          incrementMapValue(statusMap, "unknown");
        }
        if (typeof session.duration_minutes === "number") {
          durationValues.push(session.duration_minutes);
        }
        athleteIds.add(session.user_id);
      }

      for (const set of sets) {
        const exerciseName = set.exercise_name || "Unknown";
        const reps = set.reps ?? 0;
        const weight = set.weight ?? 0;
        const volume = reps * weight;

        const current = exerciseAgg.get(exerciseName) ?? { sets: 0, total_volume_kg: 0 };
        current.sets += 1;
        current.total_volume_kg += volume;
        exerciseAgg.set(exerciseName, current);
      }

      const totalSessions = sessions.length;
      const totalSets = sets.length;
      const totalVolume = sets.reduce((sum, set) => sum + (set.reps ?? 0) * (set.weight ?? 0), 0);
      const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);

      const dailySessions = fillDailySeries<{ sessions: number }>(isoRange, sessionsPerDay, "sessions").map(
        (row) => ({
          date: row.date,
          sessions: row.sessions,
        })
      );

      const sessionsByWeekday = weekdayOrder().map((day) => ({
        day,
        sessions: weekdayMap.get(day) ?? 0,
      }));

      const statusBreakdown = Array.from(statusMap.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

      const topExercises = Array.from(exerciseAgg.entries())
        .map(([exercise_name, value]) => ({
          exercise_name,
          sets: value.sets,
          total_volume_kg: Number(value.total_volume_kg.toFixed(1)),
        }))
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 10);

      return {
        total_sessions: totalSessions,
        total_strength_sets: totalSets,
        total_cardio_sessions: cardioRes.count ?? 0,
        unique_athletes: athleteIds.size,
        avg_session_duration_minutes:
          durationValues.length > 0
            ? Number((durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length).toFixed(1))
            : 0,
        avg_sets_per_session: totalSessions > 0 ? Number((totalSets / totalSessions).toFixed(2)) : 0,
        avg_reps_per_set: totalSets > 0 ? Number((totalReps / totalSets).toFixed(2)) : 0,
        total_volume_kg: Number(totalVolume.toFixed(1)),
        daily_sessions: dailySessions,
        status_breakdown: statusBreakdown,
        sessions_by_weekday: sessionsByWeekday,
        top_exercises: topExercises,
      };
    },
  });
}

export async function getAdminNutritionStats(_days = 30) {
  return runTrackedAction({
    eventName: "admin.nutrition.stats.read",
    payload: { days: _days },
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();
      const days = Math.max(7, _days);
      const isoRange = buildIsoDateRange(days);
      const isoRangeSet = new Set(isoRange);
      const startDate = `${isoRange[0]}T00:00:00.000Z`;

      const [plansRes, mealsRes] = await Promise.all([
        admin
          .from("meal_groups")
          .select("id, owner_user_id, status, created_at")
          .eq("is_snapshot", false)
          .gte("created_at", startDate),
        admin.from("meal_group_items").select("type, calories, protein_g"),
      ]);

      if (plansRes.error) throw new Error(plansRes.error.message);
      if (mealsRes.error) throw new Error(mealsRes.error.message);

      const plans = (plansRes.data || []) as Array<{
        id: string;
        owner_user_id: string;
        status: string | null;
        created_at: string;
      }>;
      const meals = (mealsRes.data || []) as Array<{
        type: string | null;
        calories: number | null;
        protein_g: number | null;
      }>;

      const planMap = new Map<string, number>();
      const statusMap = new Map<string, number>();
      const uniqueAthletes = new Set<string>();
      for (const plan of plans) {
        const isoDate = toIsoDay(plan.created_at);
        if (!isoDate || !isoRangeSet.has(isoDate)) continue;
        incrementMapValue(planMap, isoDate);
        incrementMapValue(statusMap, (plan.status || "unknown").toLowerCase());
        uniqueAthletes.add(plan.owner_user_id);
      }

      const mealTypeMap = new Map<string, number>();
      let caloriesSum = 0;
      let proteinSum = 0;
      let caloriesCount = 0;
      let proteinCount = 0;
      for (const meal of meals) {
        const type = (meal.type || "other").toLowerCase();
        incrementMapValue(mealTypeMap, type);
        if (typeof meal.calories === "number") {
          caloriesSum += meal.calories;
          caloriesCount += 1;
        }
        if (typeof meal.protein_g === "number") {
          proteinSum += meal.protein_g;
          proteinCount += 1;
        }
      }

      const mealTypePalette: Record<string, string> = {
        breakfast: "var(--chart-1)",
        lunch: "var(--chart-2)",
        dinner: "var(--chart-3)",
        snack: "var(--chart-4)",
        pre_workout: "var(--chart-5)",
        post_workout: "var(--chart-1)",
      };

      const dailyPlans = fillDailySeries<{ plans: number }>(isoRange, planMap, "plans").map((row) => ({
        date: row.date,
        plans: row.plans,
      }));

      const mealTypeBreakdown = Array.from(mealTypeMap.entries())
        .map(([meal_type, count]) => ({ meal_type, count }))
        .sort((a, b) => b.count - a.count);

      const mealTypeMix = mealTypeBreakdown.map((row) => ({
        name: row.meal_type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: row.count,
        fill: mealTypePalette[row.meal_type] ?? "var(--chart-5)",
      }));

      const statusBreakdown = Array.from(statusMap.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

      return {
        total_meal_groups: plans.length,
        active_meal_groups: plans.filter((plan) => plan.status?.toLowerCase() === "active").length,
        total_meals: meals.length,
        unique_athletes: uniqueAthletes.size,
        avg_calories_per_meal: caloriesCount > 0 ? Number((caloriesSum / caloriesCount).toFixed(1)) : 0,
        avg_protein_g_per_meal: proteinCount > 0 ? Number((proteinSum / proteinCount).toFixed(1)) : 0,
        daily_plans: dailyPlans,
        meal_type_breakdown: mealTypeBreakdown,
        meal_type_mix: mealTypeMix,
        status_breakdown: statusBreakdown,
      };
    },
  });
}

export async function getAdminSettingsSnapshot() {
  return runTrackedAction({
    eventName: "admin.settings.snapshot.read",
    action: async () => {
  await requireAdminUser();
  const users = await listAllAuthUsers();

  return {
    environment: {
      has_openai_key: Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_AI_KEY),
      has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    health: {
      total_users: users.length,
      total_sessions: await safeCount("training_sessions"),
      total_events: await safeCount("analytics_events"),
      last_training_entry_at: null as string | null,
      last_nutrition_entry_at: null as string | null,
      last_analytics_event_at: null as string | null,
    },
    app_configuration: {
      feature_flags: [] as Array<{ key: string; enabled: boolean; description: string }>,
      security_controls: [] as Array<{ key: string; value: string; description: string }>,
    },
  };
    },
  });
}

export async function updateAdminUserRole(
  userId: string,
  role: Database["public"]["Enums"]["user_role"]
) {
  return runTrackedAction({
    eventName: "admin.user.role.update",
    payload: { user_id: userId, role },
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { role: role === "sysadmin" ? "sysadmin" : role },
      });
      if (error) throw new Error(error.message);
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          role,
        })
        .eq("id", userId);
      if (profileError) throw new Error(profileError.message);
      return { success: true, message: `Role updated to ${role}.` };
    },
  });
}

export async function setAdminUserBlocked(userId: string, blocked: boolean) {
  return runTrackedAction({
    eventName: "admin.user.block.update",
    payload: { user_id: userId, blocked },
    action: async () => {
      await requireAdminUser();
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: blocked ? "876000h" : "none",
      });
      if (error) throw new Error(error.message);

      const { error: profileError } = await admin
        .from("profiles")
        .update({ is_blocked: blocked })
        .eq("id", userId);
      if (profileError) throw new Error(profileError.message);

      return { success: true, message: blocked ? "User blocked." : "User unblocked." };
    },
  });
}
