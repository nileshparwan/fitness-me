"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/types/database";

type TrainingSessionRow = Database["public"]["Tables"]["training_sessions"]["Row"];
type MealPlanRow = Database["public"]["Tables"]["meal_plans"]["Row"];
type MealRow = Database["public"]["Tables"]["meal_plan_meals"]["Row"];
type FitnessGoalRow = Database["public"]["Tables"]["fitness_goals"]["Row"];
type CardioSessionRow = Database["public"]["Tables"]["cardio_sessions"]["Row"];
type StrengthSetRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];

type UserRole = "admin" | "user";

export type AdminTrainingSession = Pick<
  TrainingSessionRow,
  "id" | "user_id" | "name" | "status" | "date" | "duration_minutes" | "created_at"
>;

export type AdminMealPlan = Pick<
  MealPlanRow,
  "id" | "user_id" | "name" | "status" | "start_date" | "end_date" | "created_at"
>;

export type AdminGoal = Pick<
  FitnessGoalRow,
  | "id"
  | "goal_type"
  | "status"
  | "current_weight"
  | "target_weight"
  | "target_date"
  | "updated_at"
>;

export type AdminCardioSession = Pick<
  CardioSessionRow,
  "id" | "activity_type" | "date" | "duration_minutes" | "distance_km" | "calories_burned"
>;

export type AdminAnalyticsEvent = Pick<
  AnalyticsEventRow,
  "id" | "event_name" | "page_path" | "user_id" | "created_at" | "metadata"
>;

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  role: UserRole;
  created_at: string | null;
  last_sign_in_at: string | null;
  sessions_count: number;
  meal_plans_count: number;
  goals_count: number;
  last_activity: string | null;
};

export type AdminDashboardStats = {
  total_sessions: number;
  total_strength_sets: number;
  total_cardio_sessions: number;
  total_meal_plans: number;
  total_users: number;
  active_goals: number;
  recent_events: number;
};

export type AdminStatusCount = {
  label: string;
  count: number;
};

export type AdminDailyCount = {
  date: string;
  count: number;
};

export type AdminTopExercise = {
  exercise_name: string;
  sets: number;
  total_reps: number;
  total_volume_kg: number;
};

export type AdminTrainingStats = {
  window_days: number;
  total_sessions: number;
  total_strength_sets: number;
  total_cardio_sessions: number;
  unique_athletes: number;
  avg_session_duration_minutes: number;
  avg_sets_per_session: number;
  avg_reps_per_set: number;
  avg_weight_per_set: number;
  total_volume_kg: number;
  status_breakdown: AdminStatusCount[];
  daily_sessions: AdminDailyCount[];
  top_exercises: AdminTopExercise[];
  sessions_by_weekday: AdminDailyCount[];
};

export type AdminMealTypeCount = {
  meal_type: string;
  count: number;
};

export type AdminNutritionStats = {
  window_days: number;
  total_meal_plans: number;
  active_meal_plans: number;
  archived_meal_plans: number;
  unique_athletes: number;
  total_meals: number;
  avg_meals_per_plan: number;
  avg_calories_per_meal: number;
  avg_protein_g_per_meal: number;
  avg_carbs_g_per_meal: number;
  avg_fats_g_per_meal: number;
  status_breakdown: AdminStatusCount[];
  daily_plans: AdminDailyCount[];
  meal_type_breakdown: AdminMealTypeCount[];
};

export type AdminUserStats = {
  window_days: number;
  total_users: number;
  total_admins: number;
  active_last_30_days: number;
  likely_leaving_30_days: number;
  likely_left_90_days: number;
  joined_in_window: number;
  join_trend: AdminDailyCount[];
  leave_risk_trend: AdminDailyCount[];
};

export type AdminSettingsSnapshot = {
  roles: UserRole[];
  training_statuses: string[];
  nutrition_statuses: string[];
  environment: {
    has_service_role_key: boolean;
    has_openai_key: boolean;
    has_supabase_url: boolean;
  };
  health: {
    total_users: number;
    total_sessions: number;
    total_meal_plans: number;
    total_events: number;
    last_training_entry_at: string | null;
    last_nutrition_entry_at: string | null;
    last_analytics_event_at: string | null;
  };
  app_configuration: {
    feature_flags: Array<{ key: string; enabled: boolean; description: string }>;
    security_controls: Array<{ key: string; value: string; description: string }>;
    notification_defaults: Array<{ channel: string; enabled: boolean; cadence: string }>;
  };
};

function average(total: number, count: number) {
  if (count <= 0) return 0;
  return Number((total / count).toFixed(2));
}

function toDay(value: string | null | undefined) {
  return value ? value.slice(0, 10) : null;
}

async function listAllAuthUsers(maxUsers = 5000) {
  const supabase = createAdminClient();
  const users: Array<{
    id: string;
    email: string | undefined;
    created_at: string;
    last_sign_in_at: string | null;
    user_metadata: Record<string, unknown> | null;
  }> = [];

  const perPage = 500;
  let page = 1;

  while (users.length < maxUsers) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data.users || [];
    if (batch.length === 0) break;

    users.push(
      ...batch.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        user_metadata: (user.user_metadata as Record<string, unknown> | null) || null,
      }))
    );

    if (batch.length < perPage) break;
    page += 1;
  }

  return users.slice(0, maxUsers);
}

function buildActivityMap(
  sessionsRows: Array<{ user_id: string | null; created_at: string | null }>,
  mealRows: Array<{ user_id: string | null; created_at: string | null }>,
  goalRows: Array<{ user_id: string | null; created_at: string | null }>
) {
  const map = new Map<
    string,
    {
      sessions_count: number;
      meal_plans_count: number;
      goals_count: number;
      last_activity: string | null;
    }
  >();

  const mergeActivity = (
    userId: string | null,
    createdAt: string | null,
    key: "sessions_count" | "meal_plans_count" | "goals_count"
  ) => {
    if (!userId) return;

    const existing =
      map.get(userId) ||
      ({
        sessions_count: 0,
        meal_plans_count: 0,
        goals_count: 0,
        last_activity: null,
      } as const);

    const next = {
      ...existing,
      [key]: existing[key] + 1,
    };

    if (createdAt) {
      const previous = next.last_activity ? new Date(next.last_activity).getTime() : 0;
      const current = new Date(createdAt).getTime();
      if (current > previous) next.last_activity = createdAt;
    }

    map.set(userId, next);
  };

  sessionsRows.forEach((row) => mergeActivity(row.user_id, row.created_at, "sessions_count"));
  mealRows.forEach((row) => mergeActivity(row.user_id, row.created_at, "meal_plans_count"));
  goalRows.forEach((row) => mergeActivity(row.user_id, row.created_at, "goals_count"));

  return map;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { supabase } = await requireAdmin();

  const [
    sessions,
    strengthSets,
    cardioSessions,
    mealPlans,
    activeGoals,
    events,
    sessionUsers,
    mealUsers,
    goalUsers,
  ] = await Promise.all([
    supabase.from("training_sessions").select("id", { count: "exact", head: true }),
    supabase.from("strength_sets").select("id", { count: "exact", head: true }),
    supabase.from("cardio_sessions").select("id", { count: "exact", head: true }),
    supabase.from("meal_plans").select("id", { count: "exact", head: true }),
    supabase.from("fitness_goals").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()),
    supabase.from("training_sessions").select("user_id"),
    supabase.from("meal_plans").select("user_id"),
    supabase.from("fitness_goals").select("user_id"),
  ]);

  const uniqueUsers = new Set<string>();
  (sessionUsers.data || []).forEach((row) => row.user_id && uniqueUsers.add(row.user_id));
  (mealUsers.data || []).forEach((row) => row.user_id && uniqueUsers.add(row.user_id));
  (goalUsers.data || []).forEach((row) => row.user_id && uniqueUsers.add(row.user_id));

  return {
    total_sessions: sessions.count || 0,
    total_strength_sets: strengthSets.count || 0,
    total_cardio_sessions: cardioSessions.count || 0,
    total_meal_plans: mealPlans.count || 0,
    total_users: uniqueUsers.size,
    active_goals: activeGoals.count || 0,
    recent_events: events.count || 0,
  };
}

export async function getAdminUsers(search = "", limit = 400): Promise<AdminUserRow[]> {
  await requireAdmin();

  const supabase = createAdminClient();
  const users = await listAllAuthUsers(5000);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredUserIds = users
    .filter((user) => {
      if (!normalizedSearch) return true;
      const role = typeof user.user_metadata?.role === "string" ? String(user.user_metadata.role).toLowerCase() : "user";
      const haystack = [user.id, user.email || "", role].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    })
    .map((user) => user.id)
    .slice(0, limit);

  let activityMap = new Map<
    string,
    { sessions_count: number; meal_plans_count: number; goals_count: number; last_activity: string | null }
  >();
  if (filteredUserIds.length > 0) {
    const [sessionsResult, mealPlansResult, goalsResult] = await Promise.all([
      supabase.from("training_sessions").select("user_id, created_at").in("user_id", filteredUserIds),
      supabase.from("meal_plans").select("user_id, created_at").in("user_id", filteredUserIds),
      supabase.from("fitness_goals").select("user_id, created_at").in("user_id", filteredUserIds),
    ]);

    if (sessionsResult.error) throw sessionsResult.error;
    if (mealPlansResult.error) throw mealPlansResult.error;
    if (goalsResult.error) throw goalsResult.error;
    activityMap = buildActivityMap(sessionsResult.data || [], mealPlansResult.data || [], goalsResult.data || []);
  }

  const mappedUsers: AdminUserRow[] = users.map((user) => {
    const roleMetadata = typeof user.user_metadata?.role === "string" ? String(user.user_metadata.role).toLowerCase() : "user";
    const activity = activityMap.get(user.id);

    return {
      user_id: user.id,
      email: user.email ?? null,
      role: roleMetadata === "admin" ? "admin" : "user",
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      sessions_count: activity?.sessions_count || 0,
      meal_plans_count: activity?.meal_plans_count || 0,
      goals_count: activity?.goals_count || 0,
      last_activity: activity?.last_activity || null,
    };
  });

  return mappedUsers
    .filter((row) => (filteredUserIds.length > 0 ? filteredUserIds.includes(row.user_id) : !normalizedSearch))
    .sort((a, b) => {
      const aActivity = a.last_activity ? new Date(a.last_activity).getTime() : 0;
      const bActivity = b.last_activity ? new Date(b.last_activity).getTime() : 0;
      if (bActivity !== aActivity) return bActivity - aActivity;

      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bCreated - aCreated;
    })
    .slice(0, limit);
}

export async function getAdminUserStats(days = 90): Promise<AdminUserStats> {
  await requireAdmin();

  const users = await listAllAuthUsers(5000);
  const now = Date.now();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);

  const joinTrendMap = new Map<string, number>();
  const leaveRiskTrendMap = new Map<string, number>();

  let totalAdmins = 0;
  let activeLast30Days = 0;
  let likelyLeaving30Days = 0;
  let likelyLeft90Days = 0;
  let joinedInWindow = 0;

  users.forEach((user) => {
    const role = typeof user.user_metadata?.role === "string" ? String(user.user_metadata.role).toLowerCase() : "user";
    if (role === "admin") totalAdmins += 1;

    const createdAt = user.created_at ? new Date(user.created_at) : null;
    const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;

    if (createdAt && createdAt >= startDate) {
      joinedInWindow += 1;
      const day = toDay(createdAt.toISOString());
      if (day) joinTrendMap.set(day, (joinTrendMap.get(day) || 0) + 1);
    }

    const sinceLastSignInDays = lastSignInAt
      ? (now - lastSignInAt.getTime()) / (1000 * 60 * 60 * 24)
      : Number.POSITIVE_INFINITY;

    if (sinceLastSignInDays <= 30) activeLast30Days += 1;
    if (sinceLastSignInDays > 30) likelyLeaving30Days += 1;
    if (sinceLastSignInDays > 90) likelyLeft90Days += 1;

    if (lastSignInAt && lastSignInAt >= startDate && sinceLastSignInDays > 30) {
      const day = toDay(lastSignInAt.toISOString());
      if (day) leaveRiskTrendMap.set(day, (leaveRiskTrendMap.get(day) || 0) + 1);
    }
  });

  return {
    window_days: days,
    total_users: users.length,
    total_admins: totalAdmins,
    active_last_30_days: activeLast30Days,
    likely_leaving_30_days: likelyLeaving30Days,
    likely_left_90_days: likelyLeft90Days,
    joined_in_window: joinedInWindow,
    join_trend: Array.from(joinTrendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    leave_risk_trend: Array.from(leaveRiskTrendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; message: string }> {
  try {
    const { user } = await requireAdmin();

    if (!["admin", "user"].includes(role)) {
      return { success: false, message: "Invalid role value" };
    }

    const supabase = createAdminClient();
    const [users, targetResult] = await Promise.all([
      listAllAuthUsers(5000),
      supabase.auth.admin.getUserById(userId),
    ]);

    if (targetResult.error) {
      return { success: false, message: targetResult.error.message };
    }
    const targetUser = targetResult.data.user;
    if (!targetUser) {
      return { success: false, message: "User not found" };
    }

    const currentTargetRole =
      typeof targetUser.user_metadata?.role === "string" &&
      String(targetUser.user_metadata.role).toLowerCase() === "admin"
        ? "admin"
        : "user";

    const adminCount = users.filter(
      (entry) => typeof entry.user_metadata?.role === "string" && String(entry.user_metadata.role).toLowerCase() === "admin"
    ).length;

    if (currentTargetRole === "admin" && role === "user" && adminCount <= 1) {
      return { success: false, message: "Cannot remove the last admin account" };
    }

    if (user.id === userId && role !== "admin") {
      return { success: false, message: "You cannot remove your own admin role" };
    }

    const currentMetadata = targetUser.user_metadata || {};
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMetadata,
        role,
        updated_at: new Date().toISOString(),
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "User role updated" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user role",
    };
  }
}

export async function getAdminUserDetail(userId: string) {
  const { supabase } = await requireAdmin();

  const [sessionsResult, cardioResult, mealsResult, goalsResult] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, name, status, date, duration_minutes, created_at")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("cardio_sessions")
      .select("id, activity_type, date, duration_minutes, distance_km, calories_burned")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("meal_plans")
      .select("id, name, status, start_date, end_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("fitness_goals")
      .select("id, goal_type, status, current_weight, target_weight, target_date, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (cardioResult.error) throw cardioResult.error;
  if (mealsResult.error) throw mealsResult.error;
  if (goalsResult.error) throw goalsResult.error;

  const sessionIds = (sessionsResult.data || []).map((session) => session.id);
  let strengthSetsCount = 0;

  if (sessionIds.length > 0) {
    const strengthSetResult = await supabase
      .from("strength_sets")
      .select("id", { count: "exact", head: true })
      .in("workout_id", sessionIds);

    if (strengthSetResult.error) throw strengthSetResult.error;
    strengthSetsCount = strengthSetResult.count || 0;
  }

  return {
    user_id: userId,
    sessions: (sessionsResult.data || []) as AdminTrainingSession[],
    strength_sets_count: strengthSetsCount,
    cardio_sessions: (cardioResult.data || []) as AdminCardioSession[],
    meal_plans: (mealsResult.data || []) as AdminMealPlan[],
    goals: (goalsResult.data || []) as AdminGoal[],
  };
}

export async function getAdminTrainingStats(days = 30): Promise<AdminTrainingStats> {
  const { supabase } = await requireAdmin();
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsResult, cardioResult] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, user_id, date, status, duration_minutes")
      .gte("date", sinceIso)
      .order("date", { ascending: true }),
    supabase.from("cardio_sessions").select("id, user_id, date").gte("date", sinceIso),
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (cardioResult.error) throw cardioResult.error;

  const sessions = sessionsResult.data || [];
  const cardio = cardioResult.data || [];
  const sessionIds = sessions.map((session) => session.id);

  let strengthSets: Pick<StrengthSetRow, "workout_id" | "exercise_name" | "reps" | "weight">[] = [];
  if (sessionIds.length > 0) {
    const strengthResult = await supabase
      .from("strength_sets")
      .select("workout_id, exercise_name, reps, weight")
      .in("workout_id", sessionIds);

    if (strengthResult.error) throw strengthResult.error;
    strengthSets = strengthResult.data || [];
  }

  const statusMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  const weekdayMap = new Map<string, number>([
    ["Mon", 0],
    ["Tue", 0],
    ["Wed", 0],
    ["Thu", 0],
    ["Fri", 0],
    ["Sat", 0],
    ["Sun", 0],
  ]);
  const athleteSet = new Set<string>();

  let sessionDurationTotal = 0;
  sessions.forEach((session) => {
    const status = session.status || "unknown";
    statusMap.set(status, (statusMap.get(status) || 0) + 1);

    const day = (session.date || "").slice(0, 10);
    if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + 1);

    if (day) {
      const date = new Date(day);
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()];
      weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);
    }

    if (session.user_id) athleteSet.add(session.user_id);
    sessionDurationTotal += session.duration_minutes || 0;
  });

  cardio.forEach((entry) => {
    if (entry.user_id) athleteSet.add(entry.user_id);
  });

  let repsTotal = 0;
  let weightTotal = 0;
  let weightCount = 0;
  let volumeTotal = 0;

  const exerciseMap = new Map<string, AdminTopExercise>();

  strengthSets.forEach((set) => {
    const reps = set.reps || 0;
    const weight = set.weight || 0;

    repsTotal += reps;
    if (set.weight !== null) {
      weightTotal += weight;
      weightCount += 1;
    }
    volumeTotal += reps * weight;

    const key = set.exercise_name || "Unknown Exercise";
    const existing =
      exerciseMap.get(key) ||
      ({
        exercise_name: key,
        sets: 0,
        total_reps: 0,
        total_volume_kg: 0,
      } satisfies AdminTopExercise);

    existing.sets += 1;
    existing.total_reps += reps;
    existing.total_volume_kg += reps * weight;
    exerciseMap.set(key, existing);
  });

  return {
    window_days: days,
    total_sessions: sessions.length,
    total_strength_sets: strengthSets.length,
    total_cardio_sessions: cardio.length,
    unique_athletes: athleteSet.size,
    avg_session_duration_minutes: average(sessionDurationTotal, sessions.length),
    avg_sets_per_session: average(strengthSets.length, sessions.length),
    avg_reps_per_set: average(repsTotal, strengthSets.length),
    avg_weight_per_set: average(weightTotal, weightCount),
    total_volume_kg: Number(volumeTotal.toFixed(2)),
    status_breakdown: Array.from(statusMap.entries()).map(([label, count]) => ({ label, count })),
    daily_sessions: Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    top_exercises: Array.from(exerciseMap.values())
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 8),
    sessions_by_weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => ({
      date: weekday,
      count: weekdayMap.get(weekday) || 0,
    })),
  };
}

export async function getAdminNutritionStats(days = 30): Promise<AdminNutritionStats> {
  const { supabase } = await requireAdmin();
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const plansResult = await supabase
    .from("meal_plans")
    .select("id, user_id, status, created_at, start_date")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (plansResult.error) throw plansResult.error;

  const plans = plansResult.data || [];
  const planIds = plans.map((plan) => plan.id);

  let meals: Pick<MealRow, "program_id" | "meal_type" | "calories" | "protein_g" | "carbs_g" | "fats_g">[] = [];
  if (planIds.length > 0) {
    const mealsResult = await supabase
      .from("meal_plan_meals")
      .select("program_id, meal_type, calories, protein_g, carbs_g, fats_g")
      .in("program_id", planIds);

    if (mealsResult.error) throw mealsResult.error;
    meals = mealsResult.data || [];
  }

  const statusMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  const mealTypeMap = new Map<string, number>();
  const athleteSet = new Set<string>();

  plans.forEach((plan) => {
    const status = plan.status || "unknown";
    statusMap.set(status, (statusMap.get(status) || 0) + 1);

    const day = (plan.created_at || plan.start_date || "").slice(0, 10);
    if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + 1);

    if (plan.user_id) athleteSet.add(plan.user_id);
  });

  let caloriesTotal = 0;
  let proteinTotal = 0;
  let carbsTotal = 0;
  let fatsTotal = 0;

  meals.forEach((meal) => {
    caloriesTotal += meal.calories || 0;
    proteinTotal += meal.protein_g || 0;
    carbsTotal += meal.carbs_g || 0;
    fatsTotal += meal.fats_g || 0;

    const type = (meal.meal_type || "other").trim().toLowerCase();
    mealTypeMap.set(type, (mealTypeMap.get(type) || 0) + 1);
  });

  return {
    window_days: days,
    total_meal_plans: plans.length,
    active_meal_plans: plans.filter((plan) => plan.status === "active").length,
    archived_meal_plans: plans.filter((plan) => plan.status === "archived").length,
    unique_athletes: athleteSet.size,
    total_meals: meals.length,
    avg_meals_per_plan: average(meals.length, plans.length),
    avg_calories_per_meal: average(caloriesTotal, meals.length),
    avg_protein_g_per_meal: average(proteinTotal, meals.length),
    avg_carbs_g_per_meal: average(carbsTotal, meals.length),
    avg_fats_g_per_meal: average(fatsTotal, meals.length),
    status_breakdown: Array.from(statusMap.entries()).map(([label, count]) => ({ label, count })),
    daily_plans: Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    meal_type_breakdown: Array.from(mealTypeMap.entries())
      .map(([meal_type, count]) => ({ meal_type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getAdminAnalytics(days = 30): Promise<AdminAnalyticsEvent[]> {
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("analytics_events")
    .select("id, event_name, page_path, user_id, created_at, metadata")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data || []) as AdminAnalyticsEvent[];
}

export async function getAdminSettingsSnapshot(): Promise<AdminSettingsSnapshot> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [users, sessionsCount, plansCount, eventsCount, latestSession, latestMealPlan, latestEvent] = await Promise.all([
    listAllAuthUsers(5000),
    supabase.from("training_sessions").select("id", { count: "exact", head: true }),
    supabase.from("meal_plans").select("id", { count: "exact", head: true }),
    supabase.from("analytics_events").select("id", { count: "exact", head: true }),
    supabase.from("training_sessions").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("meal_plans").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("analytics_events").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (sessionsCount.error) throw sessionsCount.error;
  if (plansCount.error) throw plansCount.error;
  if (eventsCount.error) throw eventsCount.error;
  if (latestSession.error) throw latestSession.error;
  if (latestMealPlan.error) throw latestMealPlan.error;
  if (latestEvent.error) throw latestEvent.error;

  return {
    roles: ["admin", "user"],
    training_statuses: ["draft", "active", "completed", "archived"],
    nutrition_statuses: ["draft", "active", "completed", "archived"],
    environment: {
      has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_openai_key: Boolean(process.env.OPENAI_AI_KEY),
      has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    health: {
      total_users: users.length,
      total_sessions: sessionsCount.count || 0,
      total_meal_plans: plansCount.count || 0,
      total_events: eventsCount.count || 0,
      last_training_entry_at: latestSession.data?.created_at || null,
      last_nutrition_entry_at: latestMealPlan.data?.created_at || null,
      last_analytics_event_at: latestEvent.data?.created_at || null,
    },
    app_configuration: {
      feature_flags: [
        {
          key: "ai_coach_auto_insights",
          enabled: true,
          description: "Dummy config: auto-generate AI insight cards after workout uploads.",
        },
        {
          key: "advanced_progress_benchmarks",
          enabled: false,
          description: "Dummy config: benchmark progress against cohort percentiles.",
        },
      ],
      security_controls: [
        {
          key: "session_timeout_minutes",
          value: "60",
          description: "Dummy config: server-enforced admin session timeout threshold.",
        },
        {
          key: "max_failed_admin_actions",
          value: "5",
          description: "Dummy config: throttle sensitive admin mutations after repeated failures.",
        },
      ],
      notification_defaults: [
        {
          channel: "email",
          enabled: true,
          cadence: "daily",
        },
        {
          channel: "in_app",
          enabled: true,
          cadence: "real_time",
        },
      ],
    },
  };
}
