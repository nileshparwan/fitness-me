"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { mealUnitInputSchema } from "@/lib/nutrition/meal-units";
import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";

type MealPlanRow = Database["public"]["Tables"]["meal_plans"]["Row"];
type MealPlanInsert = Database["public"]["Tables"]["meal_plans"]["Insert"];
type MealPlanUpdate = Database["public"]["Tables"]["meal_plans"]["Update"];
type MealPlanMealRow = Database["public"]["Tables"]["meal_plan_meals"]["Row"];
type MealPlanMealInsert = Database["public"]["Tables"]["meal_plan_meals"]["Insert"];
type MealPlanAssignmentRow = Database["public"]["Tables"]["meal_plan_assignments"]["Row"];
type MealPlanAssignmentInsert = Database["public"]["Tables"]["meal_plan_assignments"]["Insert"];
type MealPlanAssignmentMealInsert = Database["public"]["Tables"]["meal_plan_assignment_meals"]["Insert"];
type MealLogRow = Database["public"]["Tables"]["meal_logs"]["Row"];
type MealLogInsert = Database["public"]["Tables"]["meal_logs"]["Insert"];
type MealLogItemRow = Database["public"]["Tables"]["meal_log_items"]["Row"];
type MealLogItemInsert = Database["public"]["Tables"]["meal_log_items"]["Insert"];
type MealLogItemUpdate = Database["public"]["Tables"]["meal_log_items"]["Update"];
type FavoriteRow = Database["public"]["Tables"]["meal_item_favorites"]["Row"];

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

const MEAL_TYPES = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
  // Backward-compatible legacy values.
  "snacks",
  "other",
] as const;
export type MealType = (typeof MEAL_TYPES)[number];

const PLAN_STATUSES = ["draft", "active", "archived"] as const;
export type MealPlanStatus = (typeof PLAN_STATUSES)[number];

type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

export type ManualDiaryItem = MealLogItemRow;
export type ManualDiaryLog = MealLogRow & {
  items: ManualDiaryItem[];
};

export type ActiveNutritionPlan = {
  source: "assignment" | "plan";
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  daily_carbs_target_g: number | null;
  daily_fat_target_g: number | null;
  meal_targets_json: Json;
};

export type DailyTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type NutritionDiaryDay = {
  subject: SubjectRef;
  subject_client: Pick<ClientRow, "id" | "first_name" | "last_name" | "display_name" | "linked_user_id"> | null;
  performed_on: string;
  timezone: string;
  logs: ManualDiaryLog[];
  totals: DailyTotals;
  active_plan: ActiveNutritionPlan | null;
  progress: {
    calories_pct: number | null;
    protein_pct: number | null;
    carbs_pct: number | null;
    fat_pct: number | null;
  };
};

export type NutritionRecentItem = {
  item_name: string;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  notes: string | null;
  last_used_at: string;
};

export type ClientNutritionSummary7d = {
  subject_client_id: string;
  range_start: string;
  range_end: string;
  days_logged_count: number;
  average_calories: number;
  on_target_count: number;
  off_target_count: number;
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const subjectSchema = z
  .object({
    subject_user_id: z.string().uuid().nullable().optional(),
    subject_client_id: z.string().uuid().nullable().optional(),
  })
  .optional();

const listPlansSchema = z.object({
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(12),
  status: z.enum(["draft", "active", "archived", "all"]).default("all"),
  search: z.string().trim().max(120).optional(),
  subject: subjectSchema,
});

const planTargetsSchema = z.object({
  daily_calorie_target: z.number().int().min(0).nullable().optional(),
  daily_protein_target_g: z.number().min(0).nullable().optional(),
  daily_carbs_target_g: z.number().min(0).nullable().optional(),
  daily_fat_target_g: z.number().min(0).nullable().optional(),
  meal_targets_json: z.record(z.string(), z.unknown()).optional(),
});

const upsertPlanSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  start_date: isoDate,
  end_date: isoDate,
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  status: z.enum(PLAN_STATUSES).default("draft"),
  is_public: z.boolean().default(false),
  subject: subjectSchema,
  targets: planTargetsSchema.optional(),
});

const assignPlanSchema = z.object({
  plan_id: z.string().uuid(),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  subject: z.object({
    subject_user_id: z.string().uuid().nullable().optional(),
    subject_client_id: z.string().uuid().nullable().optional(),
  }),
  notes: z.string().trim().max(5000).nullable().optional(),
});

const diaryDaySchema = z.object({
  performed_on: isoDate,
  timezone: z.string().trim().min(1).max(64).optional(),
  subject: subjectSchema,
});

const mealItemBaseSchema = z.object({
  item_name: z.string().trim().min(1).max(220),
  quantity: z.number().min(0).nullable().optional(),
  unit: mealUnitInputSchema,
  calories: z.number().min(0).nullable().optional(),
  protein_g: z.number().min(0).nullable().optional(),
  carbs_g: z.number().min(0).nullable().optional(),
  fat_g: z.number().min(0).nullable().optional(),
  fiber_g: z.number().min(0).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  is_quick_add: z.boolean().optional(),
});

const addMealItemSchema = z.object({
  performed_on: isoDate,
  meal_type: z.enum(MEAL_TYPES),
  timezone: z.string().trim().min(1).max(64).default("UTC"),
  subject: subjectSchema,
  item: mealItemBaseSchema,
});

const updateMealItemSchema = z.object({
  item_id: z.string().uuid(),
  item: mealItemBaseSchema.partial().refine(
    (value) =>
      value.item_name !== undefined ||
      value.quantity !== undefined ||
      value.unit !== undefined ||
      value.calories !== undefined ||
      value.protein_g !== undefined ||
      value.carbs_g !== undefined ||
      value.fat_g !== undefined ||
      value.fiber_g !== undefined ||
      value.notes !== undefined,
    "At least one field is required"
  ),
});

const removeMealItemSchema = z.object({
  item_id: z.string().uuid(),
});

const copyFromDateSchema = z.object({
  source_date: isoDate,
  target_date: isoDate,
  meal_types: z.array(z.enum(MEAL_TYPES)).optional(),
  subject: subjectSchema,
});

const favoritesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(30),
});

const recentSchema = z.object({
  subject: subjectSchema,
  limit: z.number().int().min(1).max(100).default(30),
});

const toggleFavoriteSchema = z.object({
  item: mealItemBaseSchema,
});

const diaryNotesSchema = z.object({
  meal_log_id: z.string().uuid(),
  notes: z.string().trim().max(5000).nullable(),
});

const archivePlanSchema = z.object({
  plan_id: z.string().uuid(),
});

const duplicatePlanSchema = z.object({
  plan_id: z.string().uuid(),
});

const summarySchema = z.object({
  client_id: z.string().uuid(),
  end_date: isoDate.optional(),
});

function normalizeMealType(input: string | null | undefined): MealType {
  if (!input) return "other";
  const value = input.toLowerCase();
  if (value === "breakfast") return "breakfast";
  if (value === "snack") return "snack";
  if (value === "lunch") return "lunch";
  if (value === "pre_workout_meal") return "pre_workout_meal";
  if (value === "post_workout_meal") return "post_workout_meal";
  if (value === "dinner") return "dinner";
  if (value === "protein_drink") return "protein_drink";
  if (value === "water") return "water";
  if (value === "snacks") return "snack";
  return "other";
}

function safeNumber(input: number | null | undefined) {
  return Number(input ?? 0);
}

function computeProgress(totals: DailyTotals, activePlan: ActiveNutritionPlan | null) {
  if (!activePlan) {
    return {
      calories_pct: null,
      protein_pct: null,
      carbs_pct: null,
      fat_pct: null,
    };
  }

  return {
    calories_pct:
      activePlan.daily_calorie_target && activePlan.daily_calorie_target > 0
        ? Math.round((totals.calories / activePlan.daily_calorie_target) * 100)
        : null,
    protein_pct:
      activePlan.daily_protein_target_g && activePlan.daily_protein_target_g > 0
        ? Math.round((totals.protein_g / activePlan.daily_protein_target_g) * 100)
        : null,
    carbs_pct:
      activePlan.daily_carbs_target_g && activePlan.daily_carbs_target_g > 0
        ? Math.round((totals.carbs_g / activePlan.daily_carbs_target_g) * 100)
        : null,
    fat_pct:
      activePlan.daily_fat_target_g && activePlan.daily_fat_target_g > 0
        ? Math.round((totals.fat_g / activePlan.daily_fat_target_g) * 100)
        : null,
  };
}

function revalidateNutritionPaths(subjectClientId?: string | null) {
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/diary");
  revalidatePath("/nutrition/meal-planner");
  if (subjectClientId) {
    revalidatePath(`/clients/${subjectClientId}/nutrition`);
  }
}

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function resolveSubject(input: z.infer<typeof subjectSchema> | undefined, actorUserId: string): SubjectRef {
  const subject_user_id = input?.subject_user_id ?? null;
  const subject_client_id = input?.subject_client_id ?? null;

  if (subject_user_id && subject_client_id) {
    throw new Error("A nutrition request can target only one subject.");
  }

  if (!subject_user_id && !subject_client_id) {
    return {
      subject_user_id: actorUserId,
      subject_client_id: null,
    };
  }

  return {
    subject_user_id,
    subject_client_id,
  };
}

function applySubjectFilters<T>(query: T, subject: SubjectRef): T {
  const builder = query as unknown as {
    eq: (
      column: string,
      value: unknown
    ) => {
      is: (column: string, value: null) => unknown;
    };
  };

  if (subject.subject_user_id) {
    return builder.eq("subject_user_id", subject.subject_user_id).is("subject_client_id", null) as T;
  }

  return builder.eq("subject_client_id", subject.subject_client_id).is("subject_user_id", null) as T;
}

async function getActiveNutritionPlanForDate(
  subject: SubjectRef,
  performedOn: string
): Promise<ActiveNutritionPlan | null> {
  const { supabase } = await requireActor();

  let assignmentQuery = supabase
    .from("meal_plan_assignments")
    .select("*")
    .eq("status", "active")
    .lte("start_date", performedOn)
    .gte("end_date", performedOn)
    .order("start_date", { ascending: false })
    .limit(1);

  assignmentQuery = applySubjectFilters(assignmentQuery, subject);

  const { data: assignments, error: assignmentError } = await assignmentQuery;
  if (assignmentError) throw new Error(assignmentError.message);

  const assignment = (assignments?.[0] ?? null) as MealPlanAssignmentRow | null;
  if (assignment) {
    return {
      source: "assignment",
      id: assignment.id,
      name: assignment.name,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      timezone: assignment.timezone,
      daily_calorie_target: assignment.daily_calorie_target,
      daily_protein_target_g: assignment.daily_protein_target_g,
      daily_carbs_target_g: assignment.daily_carbs_target_g,
      daily_fat_target_g: assignment.daily_fat_target_g,
      meal_targets_json: assignment.meal_targets_json,
    };
  }

  let planQuery = supabase
    .from("meal_plans")
    .select("*")
    .eq("status", "active")
    .lte("start_date", performedOn)
    .gte("end_date", performedOn)
    .order("start_date", { ascending: false })
    .limit(1);

  planQuery = applySubjectFilters(planQuery, subject);

  const { data: plans, error: planError } = await planQuery;
  if (planError) throw new Error(planError.message);

  const plan = (plans?.[0] ?? null) as MealPlanRow | null;
  if (!plan) return null;

  return {
    source: "plan",
    id: plan.id,
    name: plan.name,
    start_date: plan.start_date,
    end_date: plan.end_date,
    timezone: plan.timezone,
    daily_calorie_target: plan.daily_calorie_target,
    daily_protein_target_g: plan.daily_protein_target_g,
    daily_carbs_target_g: plan.daily_carbs_target_g,
    daily_fat_target_g: plan.daily_fat_target_g,
    meal_targets_json: plan.meal_targets_json,
  };
}

async function getOrCreateMealLog(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  actorUserId: string;
  subject: SubjectRef;
  performed_on: string;
  meal_type: MealType;
  timezone: string;
}): Promise<MealLogRow> {
  const { supabase, actorUserId, subject, performed_on, meal_type, timezone } = args;

  let query = supabase
    .from("meal_logs")
    .select("*")
    .eq("performed_on", performed_on)
    .eq("meal_type", meal_type)
    .limit(1);

  query = applySubjectFilters(query, subject);

  const { data: existingRows, error: existingError } = await query;
  if (existingError) throw new Error(existingError.message);
  const existing = (existingRows?.[0] ?? null) as MealLogRow | null;
  if (existing) return existing;

  const insertRow: MealLogInsert = {
    subject_user_id: subject.subject_user_id,
    subject_client_id: subject.subject_client_id,
    created_by_user_id: actorUserId,
    performed_on,
    meal_type,
    timezone,
  };

  const { data: created, error: createError } = await supabase
    .from("meal_logs")
    .insert(insertRow)
    .select("*")
    .single();

  if (!createError) return created as MealLogRow;

  // In case of concurrent unique creation, fetch again.
  let retryQuery = supabase
    .from("meal_logs")
    .select("*")
    .eq("performed_on", performed_on)
    .eq("meal_type", meal_type)
    .limit(1);
  retryQuery = applySubjectFilters(retryQuery, subject);
  const { data: retryRows, error: retryError } = await retryQuery;
  if (retryError) throw new Error(retryError.message);
  const retry = (retryRows?.[0] ?? null) as MealLogRow | null;
  if (!retry) throw new Error(createError.message);
  return retry;
}

export async function getNutritionDiaryDayAction(input: z.input<typeof diaryDaySchema>): Promise<NutritionDiaryDay> {
  const payload = diaryDaySchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.diary.read",
    payload: { performed_on: payload.performed_on, subject_client_id: payload.subject?.subject_client_id ?? null },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      let logsQuery = supabase
        .from("meal_logs")
        .select("*")
        .eq("performed_on", payload.performed_on)
        .order("meal_type", { ascending: true })
        .order("created_at", { ascending: true });
      logsQuery = applySubjectFilters(logsQuery, subject);

      const [{ data: logsData, error: logsError }, activePlan, clientSubjectRes] = await Promise.all([
        logsQuery,
        getActiveNutritionPlanForDate(subject, payload.performed_on),
        subject.subject_client_id
          ? supabase
              .from("clients")
              .select("id, first_name, last_name, display_name, linked_user_id")
              .eq("id", subject.subject_client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (logsError) throw new Error(logsError.message);
      if (clientSubjectRes.error) throw new Error(clientSubjectRes.error.message);

      const logs = (logsData || []) as MealLogRow[];
      const logIds = logs.map((log) => log.id);

      const itemsByLog = new Map<string, MealLogItemRow[]>();
      if (logIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("meal_log_items")
          .select("*")
          .in("meal_log_id", logIds)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        if (itemsError) throw new Error(itemsError.message);

        for (const item of (itemsData || []) as MealLogItemRow[]) {
          const existing = itemsByLog.get(item.meal_log_id) || [];
          existing.push(item);
          itemsByLog.set(item.meal_log_id, existing);
        }
      }

      const logsWithItems: ManualDiaryLog[] = logs.map((log) => ({
        ...log,
        items: itemsByLog.get(log.id) || [],
      }));

      const totals: DailyTotals = logsWithItems.reduce(
        (acc, log) => {
          acc.calories += safeNumber(log.total_calories);
          acc.protein_g += safeNumber(log.total_protein_g);
          acc.carbs_g += safeNumber(log.total_carbs_g);
          acc.fat_g += safeNumber(log.total_fat_g);
          acc.fiber_g += safeNumber(log.total_fiber_g);
          return acc;
        },
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
      );

      return {
        subject,
        subject_client: (clientSubjectRes.data as NutritionDiaryDay["subject_client"]) || null,
        performed_on: payload.performed_on,
        timezone: payload.timezone || logsWithItems[0]?.timezone || activePlan?.timezone || "UTC",
        logs: logsWithItems,
        totals,
        active_plan: activePlan,
        progress: computeProgress(totals, activePlan),
      };
    },
  });
}

export async function listMealPlansAction(input: z.input<typeof listPlansSchema>) {
  const payload = listPlansSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.plans.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const from = payload.page * payload.page_size;
      const to = from + payload.page_size - 1;

      let query = supabase.from("meal_plans").select("*", { count: "exact" }).order("start_date", { ascending: false });
      query = applySubjectFilters(query, subject).range(from, to);

      if (payload.status !== "all") {
        query = query.eq("status", payload.status);
      }

      if (payload.search) {
        query = query.or(`name.ilike.%${payload.search}%,description.ilike.%${payload.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return {
        rows: (data || []) as MealPlanRow[],
        page: payload.page,
        page_size: payload.page_size,
        total: count || 0,
        has_more: (count || 0) > to + 1,
      };
    },
  });
}

export async function listMyMealPlanTemplatesAction() {
  return runTrackedAction({
    eventName: "nutrition.manual.templates.list",
    action: async () => {
      const { supabase, user } = await requireActor();

      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("subject_user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      return (data || []) as MealPlanRow[];
    },
  });
}

export async function upsertMealPlanAction(input: z.input<typeof upsertPlanSchema>) {
  const payload = upsertPlanSchema.parse(input);
  return runTrackedAction({
    eventName: payload.id ? "nutrition.manual.plan.update" : "nutrition.manual.plan.create",
    payload: { plan_id: payload.id ?? null, status: payload.status },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      if (payload.start_date > payload.end_date) {
        throw new Error("Start date must be on or before end date.");
      }

      const base: MealPlanInsert = {
        user_id: user.id,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        name: payload.name,
        description: payload.description || null,
        notes: payload.notes || null,
        start_date: payload.start_date,
        end_date: payload.end_date,
        timezone: payload.timezone,
        status: payload.status,
        is_public: payload.is_public,
        daily_calorie_target: payload.targets?.daily_calorie_target ?? null,
        daily_protein_target_g: payload.targets?.daily_protein_target_g ?? null,
        daily_carbs_target_g: payload.targets?.daily_carbs_target_g ?? null,
        daily_fat_target_g: payload.targets?.daily_fat_target_g ?? null,
        meal_targets_json: (payload.targets?.meal_targets_json || {}) as Json,
      };

      if (payload.id) {
        const updates: MealPlanUpdate = {
          name: base.name,
          description: base.description,
          notes: base.notes,
          start_date: base.start_date,
          end_date: base.end_date,
          timezone: base.timezone,
          status: base.status,
          is_public: base.is_public,
          subject_user_id: base.subject_user_id,
          subject_client_id: base.subject_client_id,
          daily_calorie_target: base.daily_calorie_target,
          daily_protein_target_g: base.daily_protein_target_g,
          daily_carbs_target_g: base.daily_carbs_target_g,
          daily_fat_target_g: base.daily_fat_target_g,
          meal_targets_json: base.meal_targets_json,
          archived_at: payload.status === "archived" ? new Date().toISOString() : null,
        };
        const { data, error } = await supabase.from("meal_plans").update(updates).eq("id", payload.id).select("*").single();
        if (error) throw new Error(error.message);
        revalidateNutritionPaths(subject.subject_client_id);
        return data as MealPlanRow;
      }

      const { data, error } = await supabase.from("meal_plans").insert(base).select("*").single();
      if (error) throw new Error(error.message);
      revalidateNutritionPaths(subject.subject_client_id);
      return data as MealPlanRow;
    },
  });
}

export async function archiveMealPlanAction(input: z.input<typeof archivePlanSchema>) {
  const payload = archivePlanSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.plan.archive",
    payload,
    action: async () => {
      const { supabase } = await requireActor();

      const { data, error } = await supabase
        .from("meal_plans")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", payload.plan_id)
        .select("subject_client_id")
        .single();
      if (error) throw new Error(error.message);

      revalidateNutritionPaths(data.subject_client_id);
      return { success: true };
    },
  });
}

export async function duplicateMealPlanAction(input: z.input<typeof duplicatePlanSchema>) {
  const payload = duplicatePlanSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.plan.duplicate",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();

      const [{ data: original, error: originalError }, { data: meals, error: mealsError }] = await Promise.all([
        supabase.from("meal_plans").select("*").eq("id", payload.plan_id).single(),
        supabase.from("meal_plan_meals").select("*").eq("program_id", payload.plan_id).order("position", { ascending: true }),
      ]);

      if (originalError) throw new Error(originalError.message);
      if (mealsError) throw new Error(mealsError.message);

      const insertPlan: MealPlanInsert = {
        user_id: user.id,
        subject_user_id: original.subject_user_id,
        subject_client_id: original.subject_client_id,
        name: `Copy of ${original.name}`,
        description: original.description,
        notes: original.notes,
        start_date: original.start_date,
        end_date: original.end_date,
        timezone: original.timezone,
        status: "draft",
        is_public: false,
        daily_calorie_target: original.daily_calorie_target,
        daily_protein_target_g: original.daily_protein_target_g,
        daily_carbs_target_g: original.daily_carbs_target_g,
        daily_fat_target_g: original.daily_fat_target_g,
        meal_targets_json: original.meal_targets_json,
      };

      const { data: copiedPlan, error: copyPlanError } = await supabase
        .from("meal_plans")
        .insert(insertPlan)
        .select("*")
        .single();
      if (copyPlanError) throw new Error(copyPlanError.message);

      if ((meals || []).length > 0) {
        const clonedMeals: MealPlanMealInsert[] = (meals as MealPlanMealRow[]).map((meal) => ({
          program_id: copiedPlan.id,
          meal_type: normalizeMealType(meal.meal_type),
          food_name: meal.food_name,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fats_g: meal.fats_g,
          instructions: meal.instructions,
          alternatives: meal.alternatives,
          position: meal.position,
          status: "active",
        }));
        const { error: cloneMealsError } = await supabase.from("meal_plan_meals").insert(clonedMeals);
        if (cloneMealsError) throw new Error(cloneMealsError.message);
      }

      revalidateNutritionPaths(copiedPlan.subject_client_id);
      return copiedPlan as MealPlanRow;
    },
  });
}

export async function assignMealPlanToSubjectAction(input: z.input<typeof assignPlanSchema>) {
  const payload = assignPlanSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.plan.assign",
    payload: { plan_id: payload.plan_id, subject_client_id: payload.subject.subject_client_id ?? null },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      const [{ data: plan, error: planError }, { data: templateMeals, error: templateMealsError }] = await Promise.all([
        supabase.from("meal_plans").select("*").eq("id", payload.plan_id).single(),
        supabase.from("meal_plan_meals").select("*").eq("program_id", payload.plan_id).order("position", { ascending: true }),
      ]);

      if (planError) throw new Error(planError.message);
      if (templateMealsError) throw new Error(templateMealsError.message);

      const assignmentInsert: MealPlanAssignmentInsert = {
        plan_id: plan.id,
        assigned_by_user_id: user.id,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        name: plan.name,
        notes: payload.notes || plan.notes,
        timezone: plan.timezone,
        start_date: payload.start_date || plan.start_date,
        end_date: payload.end_date || plan.end_date,
        status: "active",
        daily_calorie_target: plan.daily_calorie_target,
        daily_protein_target_g: plan.daily_protein_target_g,
        daily_carbs_target_g: plan.daily_carbs_target_g,
        daily_fat_target_g: plan.daily_fat_target_g,
        meal_targets_json: plan.meal_targets_json,
      };

      const { data: assignment, error: assignmentError } = await supabase
        .from("meal_plan_assignments")
        .insert(assignmentInsert)
        .select("*")
        .single();
      if (assignmentError) throw new Error(assignmentError.message);

      if ((templateMeals || []).length > 0) {
        const snapshotRows: MealPlanAssignmentMealInsert[] = (templateMeals as MealPlanMealRow[]).map((meal) => ({
          assignment_id: assignment.id,
          meal_type: normalizeMealType(meal.meal_type),
          item_name: meal.food_name,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fats_g,
          notes: meal.instructions,
          position: meal.position ?? 0,
        }));

        const { error: snapshotError } = await supabase.from("meal_plan_assignment_meals").insert(snapshotRows);
        if (snapshotError) throw new Error(snapshotError.message);
      }

      revalidateNutritionPaths(subject.subject_client_id);
      return assignment as MealPlanAssignmentRow;
    },
  });
}

export async function addMealItemAction(input: z.input<typeof addMealItemSchema>) {
  const payload = addMealItemSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.item.add",
    payload: { performed_on: payload.performed_on, meal_type: payload.meal_type },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      const log = await getOrCreateMealLog({
        supabase,
        actorUserId: user.id,
        subject,
        performed_on: payload.performed_on,
        meal_type: payload.meal_type,
        timezone: payload.timezone,
      });

      const { data: lastItem } = await supabase
        .from("meal_log_items")
        .select("position")
        .eq("meal_log_id", log.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const insertItem: MealLogItemInsert = {
        meal_log_id: log.id,
        created_by_user_id: user.id,
        item_name: payload.item.item_name,
        quantity: payload.item.quantity ?? null,
        unit: payload.item.unit ?? null,
        calories: payload.item.calories ?? null,
        protein_g: payload.item.protein_g ?? null,
        carbs_g: payload.item.carbs_g ?? null,
        fat_g: payload.item.fat_g ?? null,
        fiber_g: payload.item.fiber_g ?? null,
        notes: payload.item.notes ?? null,
        is_quick_add: payload.item.is_quick_add ?? false,
        position: (lastItem?.position ?? 0) + 1,
      };

      const { data: item, error } = await supabase.from("meal_log_items").insert(insertItem).select("*").single();
      if (error) throw new Error(error.message);

      // Update favorite usage when matching favorite exists for actor.
      let favoriteQuery = supabase
        .from("meal_item_favorites")
        .select("id, usage_count")
        .eq("subject_user_id", user.id)
        .eq("item_name", payload.item.item_name);
      favoriteQuery = payload.item.unit ? favoriteQuery.eq("unit", payload.item.unit) : favoriteQuery.is("unit", null);
      const { data: favorite } = await favoriteQuery.maybeSingle();
      if (favorite) {
        await supabase
          .from("meal_item_favorites")
          .update({ usage_count: (favorite.usage_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq("id", favorite.id);
      }

      revalidateNutritionPaths(subject.subject_client_id);
      return {
        meal_log: log,
        item: item as MealLogItemRow,
      };
    },
  });
}

export async function updateMealItemAction(input: z.input<typeof updateMealItemSchema>) {
  const payload = updateMealItemSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.item.update",
    payload: { item_id: payload.item_id },
    action: async () => {
      const { supabase } = await requireActor();

      const updates: MealLogItemUpdate = {
        item_name: payload.item.item_name,
        quantity: payload.item.quantity,
        unit: payload.item.unit,
        calories: payload.item.calories,
        protein_g: payload.item.protein_g,
        carbs_g: payload.item.carbs_g,
        fat_g: payload.item.fat_g,
        fiber_g: payload.item.fiber_g,
        notes: payload.item.notes,
      };

      const { data, error } = await supabase.from("meal_log_items").update(updates).eq("id", payload.item_id).select("*").single();
      if (error) throw new Error(error.message);

      const { data: mealLog } = await supabase
        .from("meal_logs")
        .select("subject_client_id")
        .eq("id", data.meal_log_id)
        .maybeSingle();

      revalidateNutritionPaths(mealLog?.subject_client_id ?? null);
      return data as MealLogItemRow;
    },
  });
}

export async function removeMealItemAction(input: z.input<typeof removeMealItemSchema>) {
  const payload = removeMealItemSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.item.remove",
    payload,
    action: async () => {
      const { supabase } = await requireActor();

      const { data: currentItem, error: itemError } = await supabase
        .from("meal_log_items")
        .select("id, meal_log_id")
        .eq("id", payload.item_id)
        .single();
      if (itemError) throw new Error(itemError.message);

      const { data: mealLog, error: mealLogError } = await supabase
        .from("meal_logs")
        .select("subject_client_id")
        .eq("id", currentItem.meal_log_id)
        .maybeSingle();
      if (mealLogError) throw new Error(mealLogError.message);

      const { error } = await supabase.from("meal_log_items").delete().eq("id", payload.item_id);
      if (error) throw new Error(error.message);

      revalidateNutritionPaths(mealLog?.subject_client_id ?? null);
      return { success: true };
    },
  });
}

export async function updateMealLogNotesAction(input: z.input<typeof diaryNotesSchema>) {
  const payload = diaryNotesSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.log.notes.update",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("meal_logs")
        .update({ notes: payload.notes })
        .eq("id", payload.meal_log_id)
        .select("subject_client_id")
        .single();
      if (error) throw new Error(error.message);
      revalidateNutritionPaths(data.subject_client_id ?? null);
      return { success: true };
    },
  });
}

export async function copyMealsFromDateAction(input: z.input<typeof copyFromDateSchema>) {
  const payload = copyFromDateSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.day.copy",
    payload: { source_date: payload.source_date, target_date: payload.target_date },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const targetMealTypes = payload.meal_types && payload.meal_types.length > 0 ? payload.meal_types : [...MEAL_TYPES];

      let sourceQuery = supabase
        .from("meal_logs")
        .select("*")
        .eq("performed_on", payload.source_date)
        .in("meal_type", targetMealTypes);
      sourceQuery = applySubjectFilters(sourceQuery, subject);

      const { data: sourceLogs, error: sourceError } = await sourceQuery;
      if (sourceError) throw new Error(sourceError.message);
      const sourceRows = (sourceLogs || []) as MealLogRow[];
      if (sourceRows.length === 0) {
        return { copied_count: 0 };
      }

      const sourceLogIds = sourceRows.map((row) => row.id);
      const { data: sourceItems, error: sourceItemsError } = await supabase
        .from("meal_log_items")
        .select("*")
        .in("meal_log_id", sourceLogIds)
        .order("position", { ascending: true });
      if (sourceItemsError) throw new Error(sourceItemsError.message);

      const itemsByMealType = new Map<MealType, MealLogItemRow[]>();
      const sourceById = new Map(sourceRows.map((row) => [row.id, row]));
      for (const item of (sourceItems || []) as MealLogItemRow[]) {
        const srcLog = sourceById.get(item.meal_log_id);
        if (!srcLog) continue;
        const mealType = normalizeMealType(srcLog.meal_type);
        const existing = itemsByMealType.get(mealType) || [];
        existing.push(item);
        itemsByMealType.set(mealType, existing);
      }

      let copiedCount = 0;
      for (const mealType of targetMealTypes) {
        const sourceMealItems = itemsByMealType.get(mealType) || [];
        if (sourceMealItems.length === 0) continue;

        const targetLog = await getOrCreateMealLog({
          supabase,
          actorUserId: user.id,
          subject,
          performed_on: payload.target_date,
          meal_type: mealType,
          timezone: sourceRows[0]?.timezone || "UTC",
        });

        // Replace target meal content for deterministic copy behavior.
        const { error: clearError } = await supabase.from("meal_log_items").delete().eq("meal_log_id", targetLog.id);
        if (clearError) throw new Error(clearError.message);

        const copiedRows: MealLogItemInsert[] = sourceMealItems.map((item, index) => ({
          meal_log_id: targetLog.id,
          created_by_user_id: user.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          notes: item.notes,
          is_quick_add: item.is_quick_add,
          position: index + 1,
        }));

        const { error: insertError } = await supabase.from("meal_log_items").insert(copiedRows);
        if (insertError) throw new Error(insertError.message);
        copiedCount += copiedRows.length;
      }

      revalidateNutritionPaths(subject.subject_client_id);
      return { copied_count: copiedCount };
    },
  });
}

export async function listRecentMealItemsAction(input: z.input<typeof recentSchema>): Promise<NutritionRecentItem[]> {
  const payload = recentSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.items.recent",
    payload: { limit: payload.limit },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      let logsQuery = supabase
        .from("meal_logs")
        .select("id, performed_on")
        .order("performed_on", { ascending: false })
        .limit(50);
      logsQuery = applySubjectFilters(logsQuery, subject);

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw new Error(logsError.message);
      const logIds = (logs || []).map((row) => row.id);
      if (logIds.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from("meal_log_items")
        .select("*")
        .in("meal_log_id", logIds)
        .order("created_at", { ascending: false })
        .limit(Math.max(payload.limit * 3, 30));
      if (itemsError) throw new Error(itemsError.message);

      const deduped = new Map<string, NutritionRecentItem>();
      for (const item of (items || []) as MealLogItemRow[]) {
        const key = `${item.item_name.trim().toLowerCase()}::${item.unit || ""}`;
        if (deduped.has(key)) continue;
        deduped.set(key, {
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          notes: item.notes,
          last_used_at: item.created_at,
        });
      }

      return Array.from(deduped.values()).slice(0, payload.limit);
    },
  });
}

export async function listFavoriteMealItemsAction(input: z.input<typeof favoritesSchema>): Promise<FavoriteRow[]> {
  const payload = favoritesSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.items.favorites",
    payload: { limit: payload.limit },
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data, error } = await supabase
        .from("meal_item_favorites")
        .select("*")
        .eq("subject_user_id", user.id)
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(payload.limit);
      if (error) throw new Error(error.message);
      return (data || []) as FavoriteRow[];
    },
  });
}

export async function toggleFavoriteMealItemAction(input: z.input<typeof toggleFavoriteSchema>) {
  const payload = toggleFavoriteSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.favorite.toggle",
    payload: { item_name: payload.item.item_name },
    action: async () => {
      const { supabase, user } = await requireActor();

      let existingQuery = supabase
        .from("meal_item_favorites")
        .select("id")
        .eq("subject_user_id", user.id)
        .eq("item_name", payload.item.item_name);
      existingQuery = payload.item.unit ? existingQuery.eq("unit", payload.item.unit) : existingQuery.is("unit", null);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existing) {
        const { error: deleteError } = await supabase.from("meal_item_favorites").delete().eq("id", existing.id);
        if (deleteError) throw new Error(deleteError.message);
        revalidateNutritionPaths();
        return { favorited: false };
      }

      const { error: insertError } = await supabase.from("meal_item_favorites").insert({
        subject_user_id: user.id,
        item_name: payload.item.item_name,
        quantity: payload.item.quantity ?? null,
        unit: payload.item.unit ?? null,
        calories: payload.item.calories ?? null,
        protein_g: payload.item.protein_g ?? null,
        carbs_g: payload.item.carbs_g ?? null,
        fat_g: payload.item.fat_g ?? null,
        fiber_g: payload.item.fiber_g ?? null,
        notes: payload.item.notes ?? null,
      });
      if (insertError) throw new Error(insertError.message);

      revalidateNutritionPaths();
      return { favorited: true };
    },
  });
}

export async function getClientNutritionSummary7dAction(input: z.input<typeof summarySchema>): Promise<ClientNutritionSummary7d> {
  const payload = summarySchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.client.summary7d",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const endDate = payload.end_date || new Date().toISOString().slice(0, 10);
      const start = new Date(endDate);
      start.setDate(start.getDate() - 6);
      const startDate = start.toISOString().slice(0, 10);

      const { data: logs, error: logsError } = await supabase
        .from("meal_logs")
        .select("performed_on, total_calories")
        .eq("subject_client_id", payload.client_id)
        .is("subject_user_id", null)
        .gte("performed_on", startDate)
        .lte("performed_on", endDate)
        .order("performed_on", { ascending: true });
      if (logsError) throw new Error(logsError.message);

      const totalsByDay = new Map<string, number>();
      for (const row of logs || []) {
        const day = row.performed_on;
        totalsByDay.set(day, (totalsByDay.get(day) || 0) + safeNumber(row.total_calories));
      }

      const { data: assignments, error: assignmentsError } = await supabase
        .from("meal_plan_assignments")
        .select("start_date, end_date, daily_calorie_target")
        .eq("subject_client_id", payload.client_id)
        .is("subject_user_id", null)
        .eq("status", "active");
      if (assignmentsError) throw new Error(assignmentsError.message);

      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("start_date, end_date, daily_calorie_target")
        .eq("subject_client_id", payload.client_id)
        .is("subject_user_id", null)
        .eq("status", "active");
      if (plansError) throw new Error(plansError.message);

      const activeTargetForDay = (date: string) => {
        const assignmentTarget = (assignments || []).find((row) => row.start_date <= date && row.end_date >= date)?.daily_calorie_target;
        if (assignmentTarget && assignmentTarget > 0) return assignmentTarget;
        const planTarget = (plans || []).find((row) => row.start_date <= date && row.end_date >= date)?.daily_calorie_target;
        return planTarget && planTarget > 0 ? planTarget : null;
      };

      const dailyValues = Array.from(totalsByDay.entries());
      const daysLoggedCount = dailyValues.length;
      const avgCalories =
        daysLoggedCount > 0
          ? Math.round(dailyValues.reduce((sum, [, calories]) => sum + calories, 0) / daysLoggedCount)
          : 0;

      let onTargetCount = 0;
      let offTargetCount = 0;
      for (const [day, calories] of dailyValues) {
        const target = activeTargetForDay(day);
        if (!target) continue;
        const delta = Math.abs(calories - target);
        if (delta <= target * 0.1) onTargetCount += 1;
        else offTargetCount += 1;
      }

      return {
        subject_client_id: payload.client_id,
        range_start: startDate,
        range_end: endDate,
        days_logged_count: daysLoggedCount,
        average_calories: avgCalories,
        on_target_count: onTargetCount,
        off_target_count: offTargetCount,
      };
    },
  });
}
