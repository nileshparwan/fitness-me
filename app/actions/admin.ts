"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type TicketStatus = Database["public"]["Enums"]["ticket_status"];

const updateTicketStatusSchema = z.object({
  ticket_id: z.string().uuid(),
  new_status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

const deleteTicketSchema = z.object({
  ticket_id: z.string().uuid(),
});

type AdminUsersPage = {
  rows: Array<{
    user_id: string;
    email: string | null;
    role: "admin" | "user";
    sessions_count: number;
    meal_plans_count: number;
    goals_count: number;
    last_activity: string | null;
    is_blocked: boolean;
    is_deleted: boolean;
  }>;
  page: number;
  has_more: boolean;
};

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const appRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : null;
  const userRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role.toLowerCase()
      : null;

  if (appRole !== "admin" && userRole !== "admin") {
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

export async function getAdminDashboardStats() {
  await requireAdminUser();

  const [totalUsers, totalSessions, totalSets, totalMealPlans, recentEvents] = await Promise.all([
    safeCount("profiles"),
    safeCount("workout_logs"),
    safeCount("exercise_sets"),
    safeCount("meal_plans"),
    safeCount("audit_events", (q) => q.gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())),
  ]);

  return {
    total_users: totalUsers,
    total_sessions: totalSessions,
    total_strength_sets: totalSets,
    total_meal_plans: totalMealPlans,
    recent_events: recentEvents,
  };
}

export async function getAdminUsers(search = "", page = 1, pageSize = 100): Promise<AdminUsersPage> {
  await requireAdminUser();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  if (error) throw new Error(error.message);

  let users = data.users || [];
  if (search.trim()) {
    const term = search.toLowerCase();
    users = users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const id = u.id.toLowerCase();
      const role = (String(u.app_metadata?.role || u.user_metadata?.role || "user")).toLowerCase();
      return email.includes(term) || id.includes(term) || role.includes(term);
    });
  }

  const rows = users.map((u) => ({
    user_id: u.id,
    email: u.email ?? null,
    role: ((u.app_metadata?.role || u.user_metadata?.role) === "admin" ? "admin" : "user") as "admin" | "user",
    sessions_count: 0,
    meal_plans_count: 0,
    goals_count: 0,
    last_activity: u.last_sign_in_at ?? null,
    is_blocked: Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
    is_deleted: Boolean((u.user_metadata as Record<string, unknown> | undefined)?.deleted_at),
  }));

  return {
    rows,
    page,
    has_more: Boolean(data?.nextPage && data.nextPage > page),
  };
}

export async function getAdminUserStats(days = 90) {
  await requireAdminUser();
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = data?.users || [];
  const now = Date.now();
  const daysMs = days * 86400000;
  const thirtyMs = 30 * 86400000;
  const ninetyMs = 90 * 86400000;

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => (u.app_metadata?.role || u.user_metadata?.role) === "admin").length;
  const activeLast30 = users.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= thirtyMs).length;
  const likelyLeaving = users.filter((u) => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > thirtyMs).length;
  const likelyLeft = users.filter((u) => !u.last_sign_in_at || now - new Date(u.last_sign_in_at).getTime() > ninetyMs).length;
  const joinedInWindow = users.filter((u) => now - new Date(u.created_at).getTime() <= daysMs).length;

  return {
    total_users: totalUsers,
    total_admins: totalAdmins,
    active_last_30_days: activeLast30,
    likely_leaving_30_days: likelyLeaving,
    likely_left_90_days: likelyLeft,
    joined_in_window: joinedInWindow,
    join_trend: [] as Array<{ date: string; count: number }>,
    leave_risk_trend: [] as Array<{ date: string; count: number }>,
  };
}

export async function getAdminUserDetail(userId: string) {
  await requireAdminUser();
  const admin = createAdminClient();

  const [sessionsRes, mealPlansRes, setsRes] = await Promise.all([
    admin
      .from("workout_logs" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("exercise_sets" as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const sessions = (((sessionsRes.data || []) as unknown) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id || ""),
    name: typeof row.name === "string" ? row.name : null,
    date: typeof row.date === "string" ? row.date : (typeof row.created_at === "string" ? row.created_at : null),
    status: typeof row.status === "string" ? row.status : null,
    duration_minutes: typeof row.duration_minutes === "number" ? row.duration_minutes : null,
  }));

  const mealPlans = (((mealPlansRes.data || []) as unknown) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id || ""),
    name: typeof row.name === "string" ? row.name : null,
    status: typeof row.status === "string" ? row.status : null,
    start_date: typeof row.start_date === "string" ? row.start_date : null,
    end_date: typeof row.end_date === "string" ? row.end_date : null,
  }));

  return {
    sessions,
    meal_plans: mealPlans,
    strength_sets_count: setsRes.count ?? 0,
  };
}

export async function getAdminTrainingStats(_days = 30) {
  await requireAdminUser();
  const [totalSessions, totalSets] = await Promise.all([
    safeCount("workout_logs"),
    safeCount("exercise_sets"),
  ]);

  return {
    total_sessions: totalSessions,
    total_strength_sets: totalSets,
    total_cardio_sessions: 0,
    unique_athletes: 0,
    avg_session_duration_minutes: 0,
    avg_sets_per_session: 0,
    avg_reps_per_set: 0,
    total_volume_kg: 0,
    daily_sessions: [] as Array<{ date: string; count: number }>,
    status_breakdown: [] as Array<{ label: string; count: number }>,
    sessions_by_weekday: [] as Array<{ date: string; count: number }>,
    top_exercises: [] as Array<{ exercise_name: string; sets: number; total_volume_kg: number }>,
  };
}

export async function getAdminNutritionStats(_days = 30) {
  await requireAdminUser();
  const [totalPlans, totalMeals] = await Promise.all([
    safeCount("meal_plans"),
    safeCount("meals"),
  ]);

  return {
    total_meal_plans: totalPlans,
    active_meal_plans: 0,
    total_meals: totalMeals,
    unique_athletes: 0,
    avg_calories_per_meal: 0,
    avg_protein_g_per_meal: 0,
    daily_plans: [] as Array<{ date: string; count: number }>,
    meal_type_breakdown: [] as Array<{ meal_type: string; count: number }>,
    status_breakdown: [] as Array<{ label: string; count: number }>,
  };
}

export async function getAdminSettingsSnapshot() {
  await requireAdminUser();

  return {
    environment: {
      has_openai_key: Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_AI_KEY),
      has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    health: {
      total_users: await safeCount("profiles"),
      total_sessions: await safeCount("workout_logs"),
      total_events: await safeCount("audit_events"),
      last_training_entry_at: null as string | null,
      last_nutrition_entry_at: null as string | null,
      last_analytics_event_at: null as string | null,
    },
    app_configuration: {
      feature_flags: [] as Array<{ key: string; enabled: boolean; description: string }>,
      security_controls: [] as Array<{ key: string; value: string; description: string }>,
    },
  };
}

export async function updateAdminUserRole(userId: string, role: "admin" | "user") {
  await requireAdminUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  if (error) throw new Error(error.message);
  return { success: true, message: `Role updated to ${role}.` };
}

export async function setAdminUserBlocked(userId: string, blocked: boolean) {
  await requireAdminUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);
  return { success: true, message: blocked ? "User blocked." : "User unblocked." };
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
) {
  const payload = updateTicketStatusSchema.parse({
    ticket_id: ticketId,
    new_status: newStatus,
  });

  await requireAdminUser();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tickets")
    .update({ status: payload.new_status })
    .eq("id", payload.ticket_id);

  if (error) throw new Error(error.message);

  revalidatePath("/support");
  revalidatePath("/admin/tickets");
  revalidatePath(`/support/${payload.ticket_id}`);
  return { success: true };
}

export async function deleteTicket(ticketId: string) {
  const payload = deleteTicketSchema.parse({ ticket_id: ticketId });

  await requireAdminUser();
  const admin = createAdminClient();

  const { error } = await admin.from("tickets").delete().eq("id", payload.ticket_id);
  if (error) throw new Error(error.message);

  revalidatePath("/support");
  revalidatePath("/admin/tickets");
  revalidatePath(`/support/${payload.ticket_id}`);
  return { success: true };
}
