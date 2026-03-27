"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { nextSequentialPosition } from "@/lib/nutrition/meal-ui";
import { mealUnitInputSchema } from "@/lib/nutrition/meal-units";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";
import { resolveGoalTargetForDate, type SubjectRef } from "@/app/actions/_lib/resolve-nutrition-targets";

type MealGroupRow = Database["public"]["Tables"]["meal_groups"]["Row"];
type MealGroupAssignmentRow = Database["public"]["Tables"]["meal_group_assignments"]["Row"];
type MealGroupPlanRow = Database["public"]["Tables"]["meal_group_plans"]["Row"];
type MealGroupItemRow = Database["public"]["Tables"]["meal_group_items"]["Row"];
type MealLogRow = Database["public"]["Tables"]["meal_logs"]["Row"];
type MealLogInsert = Database["public"]["Tables"]["meal_logs"]["Insert"];
type MealLogUpdate = Database["public"]["Tables"]["meal_logs"]["Update"];
type MealLogItemRow = Database["public"]["Tables"]["meal_log_items"]["Row"];
type MealLogItemInsert = Database["public"]["Tables"]["meal_log_items"]["Insert"];
type MealLogItemUpdate = Database["public"]["Tables"]["meal_log_items"]["Update"];
type MealLogSectionRow = Database["public"]["Tables"]["meal_log_sections"]["Row"];
type MealLogSectionInsert = Database["public"]["Tables"]["meal_log_sections"]["Insert"];
type FavoriteRow = Database["public"]["Tables"]["meal_item_favorites"]["Row"];
type MealDayOfWeek = Database["public"]["Enums"]["meal_day_of_week"];
type DailyMacroComplianceInsert = Database["public"]["Tables"]["daily_macro_compliance"]["Insert"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MealLogActivitySnapshot = Pick<
  MealLogRow,
  "subject_user_id" | "subject_client_id" | "meal_type" | "performed_on" | "meal_group_id"
>;

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

const optionalMealTypeSchema = z
  .preprocess((value) => (value === "$undefined" || value === undefined || value === null || value === "" ? undefined : value), z.enum(MEAL_TYPES))
  .optional();

const MEAL_TYPE_DISPLAY_ORDER: MealType[] = [
  "water",
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "other",
  "snacks",
];

export type ManualDiaryItem = MealLogItemRow;
export type ManualDiaryLog = MealLogRow & {
  items: ManualDiaryItem[];
};

export type ActiveNutritionPlan = {
  source: "assignment" | "template";
  id: string;
  meal_group_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
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
  meal_sections: Array<{
    meal_type: MealType;
    position: number;
    source: "configured" | "inferred";
  }>;
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

export type NutritionActivePlanForDate = {
  subject: SubjectRef;
  performed_on: string;
  active_plan: ActiveNutritionPlan | null;
};

type ClientNutritionSummary7d = {
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

const diaryDaySchema = z.object({
  performed_on: isoDate,
  subject: subjectSchema,
  meal_group_id: z.string().uuid().optional(),
});

const activePlanForDateSchema = z.object({
  performed_on: isoDate,
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
  consumed_time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
});

const addMealItemSchema = z.object({
  performed_on: isoDate,
  meal_type: z.enum(MEAL_TYPES),
  subject: subjectSchema,
  meal_group_id: z.string().uuid().optional(),
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
      value.notes !== undefined ||
      value.consumed_time !== undefined,
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
  meal_group_id: z.string().uuid().optional(),
});

const favoritesSchema = z.object({
  limit: z.number().int().min(1).max(200).default(30),
  meal_type: optionalMealTypeSchema,
});

const toggleFavoriteSchema = z.object({
  item: mealItemBaseSchema,
  meal_type: optionalMealTypeSchema,
});

const addMealSectionSchema = z.object({
  meal_group_id: z.string().uuid(),
  performed_on: isoDate,
  meal_type: z.enum(MEAL_TYPES),
  subject: subjectSchema,
});

const logFromPlanSchema = z.object({
  performed_on: isoDate,
  meal_group_id: z.string().uuid(),
  subject: subjectSchema,
});

const diaryNotesSchema = z.object({
  meal_log_id: z.string().uuid(),
  notes: z.string().trim().max(5000).nullable(),
});

const summarySchema = z.object({
  client_id: z.string().uuid(),
  end_date: isoDate.optional(),
});

const MEAL_LOG_ACTIVITY_SELECT = "subject_user_id, subject_client_id, meal_type, performed_on, meal_group_id";

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

function toMealDayOfWeek(dateString: string): MealDayOfWeek {
  const [year, month, day] = dateString.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1));
  const dayCode = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][utcDate.getUTCDay()];
  return dayCode as MealDayOfWeek;
}

function mealTypeOrderRank(type: MealType) {
  const index = MEAL_TYPE_DISPLAY_ORDER.indexOf(type);
  return index >= 0 ? index : MEAL_TYPE_DISPLAY_ORDER.length + 1;
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST200" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /relation .* does not exist/i.test(message) ||
    /could not find .*schema cache/i.test(message) ||
    /schema cache/i.test(message)
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "42703" || /column .* does not exist/i.test(message);
}

function safeNumber(input: number | null | undefined) {
  return Number(input ?? 0);
}

type ComplianceTargetSource = "plan_assignment" | "fitness_goal" | "none";
type ComplianceBasis = "complete_log" | "partial_log" | "missing_target" | "no_log";

type ComplianceTargetsSnapshot = {
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_source: ComplianceTargetSource;
};

type ComplianceActualsSnapshot = {
  actual_calories: number;
  actual_protein_g: number;
  actual_carbs_g: number;
  actual_fat_g: number;
  logged_meal_type_count: number;
};

function normalizeComplianceTarget(value: number | null | undefined) {
  const normalized = Math.round(safeNumber(value));
  return normalized > 0 ? normalized : null;
}

function hasCompleteMacroTargets(
  snapshot: ComplianceTargetsSnapshot
): snapshot is ComplianceTargetsSnapshot & {
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
} {
  return (
    snapshot.target_calories !== null &&
    snapshot.target_protein_g !== null &&
    snapshot.target_carbs_g !== null &&
    snapshot.target_fat_g !== null
  );
}

function isWithinComplianceThreshold(actual: number, target: number) {
  return Math.abs(actual - target) / Math.max(target, 1) <= 0.15;
}

async function resolveComplianceTargetsForDate(
  supabase: SupabaseServerClient,
  subject: SubjectRef,
  performedOn: string
): Promise<ComplianceTargetsSnapshot> {
  const goalTarget = await resolveGoalTargetForDate(supabase, subject, performedOn);
  if (goalTarget.source === "fitness_goal") {
    const goalSnapshot: ComplianceTargetsSnapshot = {
      target_calories: normalizeComplianceTarget(goalTarget.calories),
      target_protein_g: normalizeComplianceTarget(goalTarget.protein_g),
      target_carbs_g: normalizeComplianceTarget(goalTarget.carbs_g),
      target_fat_g: normalizeComplianceTarget(goalTarget.fat_g),
      target_source: "fitness_goal",
    };
    if (hasCompleteMacroTargets(goalSnapshot)) {
      return goalSnapshot;
    }
  }

  return {
    target_calories: null,
    target_protein_g: null,
    target_carbs_g: null,
    target_fat_g: null,
    target_source: "none",
  };
}

async function resolveComplianceActualsForDate(
  supabase: SupabaseServerClient,
  subject: SubjectRef,
  performedOn: string
): Promise<ComplianceActualsSnapshot> {
  let logsQuery = supabase
    .from("meal_logs")
    .select("id, meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g")
    .eq("performed_on", performedOn);
  logsQuery = applySubjectFilters(logsQuery, subject);

  const { data: logsData, error: logsError } = await logsQuery;
  if (logsError) throw new Error(logsError.message);

  const logs = (logsData || []) as Array<
    Pick<MealLogRow, "id" | "meal_type" | "total_calories" | "total_protein_g" | "total_carbs_g" | "total_fat_g">
  >;
  if (logs.length === 0) {
    return {
      actual_calories: 0,
      actual_protein_g: 0,
      actual_carbs_g: 0,
      actual_fat_g: 0,
      logged_meal_type_count: 0,
    };
  }

  const totals = logs.reduce(
    (acc, log) => {
      acc.actual_calories += safeNumber(log.total_calories);
      acc.actual_protein_g += safeNumber(log.total_protein_g);
      acc.actual_carbs_g += safeNumber(log.total_carbs_g);
      acc.actual_fat_g += safeNumber(log.total_fat_g);
      return acc;
    },
    {
      actual_calories: 0,
      actual_protein_g: 0,
      actual_carbs_g: 0,
      actual_fat_g: 0,
    }
  );

  const logIds = logs.map((log) => log.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from("meal_log_items")
    .select("meal_log_id")
    .in("meal_log_id", logIds);
  if (itemsError) throw new Error(itemsError.message);

  const logIdsWithItems = new Set((itemsData || []).map((row) => row.meal_log_id));
  const mealTypesWithItems = new Set<MealType>();
  for (const log of logs) {
    if (!logIdsWithItems.has(log.id)) continue;
    mealTypesWithItems.add(normalizeMealType(log.meal_type));
  }

  return {
    ...totals,
    logged_meal_type_count: mealTypesWithItems.size,
  };
}

async function upsertDailyCompliance(args: {
  supabase: SupabaseServerClient;
  subject: SubjectRef;
  performedOn: string;
}) {
  const { supabase, subject, performedOn } = args;
  const [targets, actuals] = await Promise.all([
    resolveComplianceTargetsForDate(supabase, subject, performedOn),
    resolveComplianceActualsForDate(supabase, subject, performedOn),
  ]);

  let basis: ComplianceBasis;
  if (actuals.logged_meal_type_count === 0) {
    basis = "no_log";
  } else if (actuals.logged_meal_type_count < 2) {
    basis = "partial_log";
  } else if (targets.target_source === "none") {
    basis = "missing_target";
  } else {
    basis = "complete_log";
  }

  let caloriesCompliant: boolean | null = null;
  let proteinCompliant: boolean | null = null;
  let carbsCompliant: boolean | null = null;
  let fatCompliant: boolean | null = null;
  let overallCompliant: boolean | null = null;

  if (basis === "complete_log" && hasCompleteMacroTargets(targets)) {
    caloriesCompliant = isWithinComplianceThreshold(actuals.actual_calories, targets.target_calories);
    proteinCompliant = isWithinComplianceThreshold(actuals.actual_protein_g, targets.target_protein_g);
    carbsCompliant = isWithinComplianceThreshold(actuals.actual_carbs_g, targets.target_carbs_g);
    fatCompliant = isWithinComplianceThreshold(actuals.actual_fat_g, targets.target_fat_g);
    overallCompliant = Boolean(caloriesCompliant && proteinCompliant && carbsCompliant && fatCompliant);
  }

  const payload: DailyMacroComplianceInsert = {
    subject_user_id: subject.subject_user_id,
    subject_client_id: subject.subject_client_id,
    performed_on: performedOn,
    target_calories: targets.target_calories,
    target_protein_g: targets.target_protein_g,
    target_carbs_g: targets.target_carbs_g,
    target_fat_g: targets.target_fat_g,
    target_source: targets.target_source,
    actual_calories: actuals.actual_calories,
    actual_protein_g: actuals.actual_protein_g,
    actual_carbs_g: actuals.actual_carbs_g,
    actual_fat_g: actuals.actual_fat_g,
    calories_compliant: caloriesCompliant,
    protein_compliant: proteinCompliant,
    carbs_compliant: carbsCompliant,
    fat_compliant: fatCompliant,
    basis,
    overall_compliant: overallCompliant,
  };

  const admin = createAdminClient();
  let existingQuery = admin
    .from("daily_macro_compliance")
    .select("id")
    .eq("performed_on", performedOn)
    .limit(1);
  existingQuery = applySubjectFilters(existingQuery, subject);
  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) {
    if (isMissingRelationError(existingError) || isMissingColumnError(existingError)) {
      return;
    }
    throw new Error(existingError.message);
  }

  const existingId = existingRows?.[0]?.id;
  if (existingId) {
    const { error: updateError } = await admin
      .from("daily_macro_compliance")
      .update(payload)
      .eq("id", existingId);
    if (updateError) {
      if (isMissingRelationError(updateError) || isMissingColumnError(updateError)) return;
      throw new Error(updateError.message);
    }
    return;
  }

  const { error: insertError } = await admin.from("daily_macro_compliance").insert(payload);
  if (insertError) {
    if (isMissingRelationError(insertError) || isMissingColumnError(insertError)) return;
    throw new Error(insertError.message);
  }
}

type MealLogMacroSource = {
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
};

function deriveMealLogTotals(items: MealLogMacroSource[]): DailyTotals {
  return items.reduce<DailyTotals>(
    (acc, item) => {
      acc.calories += safeNumber(item.calories);
      acc.protein_g += safeNumber(item.protein_g);
      acc.carbs_g += safeNumber(item.carbs_g);
      acc.fat_g += safeNumber(item.fat_g);
      acc.fiber_g += safeNumber(item.fiber_g);
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 } satisfies DailyTotals
  );
}

async function setMealLogTotals(
  supabase: SupabaseServerClient,
  mealLogId: string,
  totals: DailyTotals
) {
  const updateRow: MealLogUpdate = {
    total_calories: totals.calories,
    total_protein_g: totals.protein_g,
    total_carbs_g: totals.carbs_g,
    total_fat_g: totals.fat_g,
    total_fiber_g: totals.fiber_g,
  };
  const { error } = await supabase.from("meal_logs").update(updateRow).eq("id", mealLogId);
  if (error) throw new Error(error.message);
}

async function syncMealLogTotals(
  supabase: SupabaseServerClient,
  mealLogId: string
): Promise<DailyTotals> {
  const { data: items, error } = await supabase
    .from("meal_log_items")
    .select("calories, protein_g, carbs_g, fat_g, fiber_g")
    .eq("meal_log_id", mealLogId);
  if (error) throw new Error(error.message);
  const totals = deriveMealLogTotals((items || []) as MealLogMacroSource[]);
  await setMealLogTotals(supabase, mealLogId, totals);
  return totals;
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

function applyMealGroupFilter<T>(query: T, mealGroupId?: string | null): T {
  const builder = query as unknown as {
    eq: (
      column: string,
      value: unknown
    ) => {
      is: (column: string, value: null) => unknown;
    };
    is: (column: string, value: null) => unknown;
  };

  if (mealGroupId) {
    return builder.eq("meal_group_id", mealGroupId) as T;
  }

  if (mealGroupId === null) {
    return builder.is("meal_group_id", null) as T;
  }

  return query;
}

function mealLogSubject(mealLog: MealLogActivitySnapshot): SubjectRef {
  return {
    subject_user_id: mealLog.subject_user_id,
    subject_client_id: mealLog.subject_client_id,
  };
}

async function upsertComplianceForMealLog(
  supabase: SupabaseServerClient,
  mealLog: MealLogActivitySnapshot | null | undefined
) {
  if (!mealLog?.performed_on) return;
  await upsertDailyCompliance({
    supabase,
    subject: mealLogSubject(mealLog),
    performedOn: mealLog.performed_on,
  });
}

function buildMealItemActivityContext(itemName: string | null | undefined, mealLog: MealLogActivitySnapshot | null | undefined) {
  return {
    item_name: itemName ?? null,
    meal_type: mealLog?.meal_type ?? null,
    performed_on: mealLog?.performed_on ?? null,
    meal_group_id: mealLog?.meal_group_id ?? null,
    subject_user_id: mealLog?.subject_user_id ?? null,
    subject_client_id: mealLog?.subject_client_id ?? null,
  };
}

async function ensureMealLogSections(args: {
  supabase: SupabaseServerClient;
  actorUserId: string;
  subject: SubjectRef;
  meal_group_id: string;
  performed_on: string;
  meal_types: MealType[];
}) {
  const normalizedTypes = Array.from(new Set(args.meal_types.map((type) => normalizeMealType(type))));
  if (normalizedTypes.length === 0) return;

  let sectionQuery = args.supabase
    .from("meal_log_sections")
    .select("*")
    .eq("meal_group_id", args.meal_group_id)
    .eq("performed_on", args.performed_on)
    .order("position", { ascending: true });
  sectionQuery = applySubjectFilters(sectionQuery, args.subject);
  const { data: existingRows, error: existingError } = await sectionQuery;
  if (existingError) {
    // Backward-compatible fallback while new sections table is rolling out.
    if (isMissingRelationError(existingError)) return;
    throw new Error(existingError.message);
  }
  const existing = (existingRows || []) as MealLogSectionRow[];

  const existingTypes = new Set(existing.map((row) => normalizeMealType(row.meal_type)));
  const missing = normalizedTypes.filter((type) => !existingTypes.has(type));
  if (missing.length === 0) return;

  const startPosition = existing.length;
  const sortedMissing = [...missing].sort((a, b) => mealTypeOrderRank(a) - mealTypeOrderRank(b));

  const inserts: MealLogSectionInsert[] = sortedMissing.map((meal_type, index) => ({
    meal_group_id: args.meal_group_id,
    performed_on: args.performed_on,
    subject_user_id: args.subject.subject_user_id,
    subject_client_id: args.subject.subject_client_id,
    meal_type,
    position: startPosition + index + 1,
    created_by_user_id: args.actorUserId,
  }));

  const { error: insertError } = await args.supabase.from("meal_log_sections").insert(inserts);
  if (insertError) {
    if (isMissingRelationError(insertError)) return;
    throw new Error(insertError.message);
  }
}

async function getActiveNutritionPlanForDate(
  subject: SubjectRef,
  performedOn: string,
  supabase: SupabaseClient<Database>
): Promise<ActiveNutritionPlan | null> {
  const emptyTargets = {} as Json;

  const mapAssignment = (assignment: MealGroupAssignmentRow, name: string): ActiveNutritionPlan => ({
    source: "assignment",
    id: assignment.id,
    meal_group_id: assignment.meal_group_id,
    name,
    start_date: assignment.start_date,
    end_date: assignment.end_date,
    daily_calorie_target: null,
    daily_protein_target_g: null,
    daily_carbs_target_g: null,
    daily_fat_target_g: null,
    meal_targets_json: emptyTargets,
  });

  const mapTemplate = (template: MealGroupRow): ActiveNutritionPlan => ({
    source: "template",
    id: template.id,
    meal_group_id: template.id,
    name: template.name,
    start_date: template.start_date ?? performedOn,
    end_date: template.end_date ?? performedOn,
    daily_calorie_target: null,
    daily_protein_target_g: null,
    daily_carbs_target_g: null,
    daily_fat_target_g: null,
    meal_targets_json: emptyTargets,
  });

  let assignmentQuery = supabase
    .from("meal_group_assignments")
    .select("*")
    .eq("status", "active")
    .lte("start_date", performedOn)
    .gte("end_date", performedOn)
    .order("start_date", { ascending: false })
    .limit(1);

  assignmentQuery = applySubjectFilters(assignmentQuery, subject);

  const { data: assignments, error: assignmentError } = await assignmentQuery;
  if (assignmentError) throw new Error(assignmentError.message);

  const assignment = (assignments?.[0] ?? null) as MealGroupAssignmentRow | null;
  if (assignment) {
    const groupIds = Array.from(new Set([assignment.template_group_id, assignment.meal_group_id].filter(Boolean)));
    const { data: groups, error: groupsError } = await supabase
      .from("meal_groups")
      .select("id, name")
      .in("id", groupIds);
    if (groupsError) throw new Error(groupsError.message);

    const groupsById = new Map((groups || []).map((row) => [row.id, row]));
    const assignmentName =
      groupsById.get(assignment.template_group_id)?.name ||
      groupsById.get(assignment.meal_group_id)?.name ||
      "Assigned meal template";

    return mapAssignment(assignment, assignmentName);
  }

  if (!subject.subject_user_id || subject.subject_client_id) {
    return null;
  }

  const { data: templates, error: templatesError } = await supabase
    .from("meal_groups")
    .select("*")
    .eq("owner_user_id", subject.subject_user_id)
    .eq("is_snapshot", false)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (templatesError) throw new Error(templatesError.message);

  const activeTemplate =
    ((templates || []) as MealGroupRow[]).find((row) => (!row.start_date || row.start_date <= performedOn) && (!row.end_date || row.end_date >= performedOn)) ||
    null;

  return activeTemplate ? mapTemplate(activeTemplate) : null;
}

export async function getNutritionActivePlanForDateAction(
  input: z.input<typeof activePlanForDateSchema>
): Promise<NutritionActivePlanForDate> {
  const payload = activePlanForDateSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.active-plan.read",
    payload: {
      performed_on: payload.performed_on,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const activePlan = await getActiveNutritionPlanForDate(subject, payload.performed_on, supabase);
      return {
        subject,
        performed_on: payload.performed_on,
        active_plan: activePlan,
      };
    },
  });
}

async function getOrCreateMealLog(args: {
  supabase: SupabaseServerClient;
  actorUserId: string;
  subject: SubjectRef;
  performed_on: string;
  meal_type: MealType;
  meal_group_id?: string | null;
}): Promise<MealLogRow> {
  const { supabase, actorUserId, subject, performed_on, meal_type, meal_group_id } = args;

  let query = supabase
    .from("meal_logs")
    .select("*")
    .eq("performed_on", performed_on)
    .eq("meal_type", meal_type)
    .limit(1);

  query = applySubjectFilters(query, subject);
  query = applyMealGroupFilter(query, meal_group_id);

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
    meal_group_id: meal_group_id ?? null,
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
  retryQuery = applyMealGroupFilter(retryQuery, meal_group_id);
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
    payload: {
      performed_on: payload.performed_on,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      meal_group_id: payload.meal_group_id ?? null,
    },
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
      logsQuery = applyMealGroupFilter(logsQuery, payload.meal_group_id);

      let sectionsQuery = supabase
        .from("meal_log_sections")
        .select("*")
        .eq("performed_on", payload.performed_on)
        .order("position", { ascending: true });
      sectionsQuery = applySubjectFilters(sectionsQuery, subject);
      if (payload.meal_group_id) {
        sectionsQuery = sectionsQuery.eq("meal_group_id", payload.meal_group_id);
      }

      const [{ data: logsData, error: logsError }, { data: sectionsData, error: sectionsError }, activePlan, clientSubjectRes] =
        await Promise.all([
        logsQuery,
        payload.meal_group_id ? sectionsQuery : Promise.resolve({ data: [], error: null }),
        getActiveNutritionPlanForDate(subject, payload.performed_on, supabase),
        subject.subject_client_id
          ? supabase
              .from("clients")
              .select("id, first_name, last_name, display_name, linked_user_id")
              .eq("id", subject.subject_client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        ]);

      if (logsError) {
        if (payload.meal_group_id && (isMissingRelationError(logsError) || isMissingColumnError(logsError))) {
          throw new Error("Meal diary database migration is required. Apply the latest migrations and retry.");
        }
        throw new Error(logsError.message);
      }
      if (sectionsError && !isMissingRelationError(sectionsError)) throw new Error(sectionsError.message);
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

      const logsWithItems: ManualDiaryLog[] = logs.map((log) => {
        const items = itemsByLog.get(log.id) || [];
        const derivedTotals = deriveMealLogTotals(items);
        return {
          ...log,
          total_calories: derivedTotals.calories,
          total_protein_g: derivedTotals.protein_g,
          total_carbs_g: derivedTotals.carbs_g,
          total_fat_g: derivedTotals.fat_g,
          total_fiber_g: derivedTotals.fiber_g,
          items,
        };
      });

      const configuredSections = ((sectionsError ? [] : sectionsData) || []).map((row) => ({
        meal_type: normalizeMealType(row.meal_type),
        position: row.position,
        source: "configured" as const,
      }));

      const configuredTypes = new Set(configuredSections.map((section) => section.meal_type));
      const inferredTypes = Array.from(new Set(logsWithItems.map((log) => normalizeMealType(log.meal_type))))
        .filter((mealType) => !configuredTypes.has(mealType))
        .sort((a, b) => mealTypeOrderRank(a) - mealTypeOrderRank(b));

      const inferredSections = inferredTypes.map((meal_type, index) => ({
        meal_type,
        position: configuredSections.length + index + 1,
        source: "inferred" as const,
      }));

      const meal_sections = [...configuredSections, ...inferredSections].sort((a, b) => a.position - b.position);

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
        meal_sections,
        logs: logsWithItems,
        totals,
        active_plan: activePlan,
        progress: computeProgress(totals, activePlan),
      };
    },
  });
}

export async function addMealLogSectionAction(input: z.input<typeof addMealSectionSchema>) {
  const payload = addMealSectionSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.section.add",
    payload: {
      meal_group_id: payload.meal_group_id,
      performed_on: payload.performed_on,
      meal_type: payload.meal_type,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const normalizedMealType = normalizeMealType(payload.meal_type);

      let existingQuery = supabase
        .from("meal_log_sections")
        .select("*")
        .eq("meal_group_id", payload.meal_group_id)
        .eq("performed_on", payload.performed_on)
        .order("position", { ascending: true });
      existingQuery = applySubjectFilters(existingQuery, subject);
      const { data: existingRows, error: existingError } = await existingQuery;
      if (existingError) {
        if (isMissingRelationError(existingError)) {
          throw new Error("Meal diary database migration is required. Apply the latest migrations and retry.");
        }
        throw new Error(existingError.message);
      }

      const existing = (existingRows || []) as MealLogSectionRow[];
      const nextPosition = nextSequentialPosition(existing.map((row) => row.position));

      const insertRow: MealLogSectionInsert = {
        meal_group_id: payload.meal_group_id,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        performed_on: payload.performed_on,
        meal_type: normalizedMealType,
        position: nextPosition,
        created_by_user_id: user.id,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("meal_log_sections")
        .insert(insertRow)
        .select("*")
        .single();
      if (insertError) {
        if (isMissingRelationError(insertError)) {
          throw new Error("Meal diary database migration is required. Apply the latest migrations and retry.");
        }
        throw new Error(insertError.message);
      }

      activityContext = {
        meal_group_id: payload.meal_group_id,
        performed_on: payload.performed_on,
        meal_type: normalizedMealType,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
      };
      revalidateNutritionPaths(subject.subject_client_id);
      return inserted as MealLogSectionRow;
    },
  });
}

export async function logFromPlanAction(input: z.input<typeof logFromPlanSchema>) {
  const payload = logFromPlanSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.plan.log_from_plan",
    payload: {
      performed_on: payload.performed_on,
      meal_group_id: payload.meal_group_id,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const dayOfWeek = toMealDayOfWeek(payload.performed_on);

      const { data: dayPlan, error: dayPlanError } = await supabase
        .from("meal_group_plans")
        .select("id, day_of_week")
        .eq("meal_group_id", payload.meal_group_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();
      if (dayPlanError) throw new Error(dayPlanError.message);
      if (!dayPlan) {
        activityContext = {
          meal_group_id: payload.meal_group_id,
          subject_user_id: subject.subject_user_id,
          subject_client_id: subject.subject_client_id,
          inserted_count: 0,
          skipped: true,
          reason: "no_plan_for_day",
        };
        return { inserted_count: 0, skipped: true as const, reason: "no_plan_for_day" as const };
      }

      const { data: dayItemsData, error: dayItemsError } = await supabase
        .from("meal_group_items")
        .select("*")
        .eq("meal_plan_id", dayPlan.id)
        .order("position", { ascending: true });
      if (dayItemsError) throw new Error(dayItemsError.message);

      const dayItems = (dayItemsData || []) as MealGroupItemRow[];
      if (dayItems.length === 0) {
        activityContext = {
          meal_group_id: payload.meal_group_id,
          subject_user_id: subject.subject_user_id,
          subject_client_id: subject.subject_client_id,
          inserted_count: 0,
          skipped: true,
          reason: "no_items_for_day",
        };
        return { inserted_count: 0, skipped: true as const, reason: "no_items_for_day" as const };
      }

      const itemsByMealType = new Map<MealType, MealGroupItemRow[]>();
      for (const mealItem of dayItems) {
        const normalizedMealType = normalizeMealType(mealItem.type);
        const existing = itemsByMealType.get(normalizedMealType) || [];
        existing.push(mealItem);
        itemsByMealType.set(normalizedMealType, existing);
      }

      const mealTypes = Array.from(itemsByMealType.keys());
      await ensureMealLogSections({
        supabase,
        actorUserId: user.id,
        subject,
        meal_group_id: payload.meal_group_id,
        performed_on: payload.performed_on,
        meal_types: mealTypes,
      });

      let insertedCount = 0;
      for (const mealType of mealTypes) {
        const planItems = itemsByMealType.get(mealType) || [];
        if (planItems.length === 0) continue;

        const mealLog = await getOrCreateMealLog({
          supabase,
          actorUserId: user.id,
          subject,
          performed_on: payload.performed_on,
          meal_type: mealType,
          meal_group_id: payload.meal_group_id,
        });

        const { data: lastLogItem, error: lastLogItemError } = await supabase
          .from("meal_log_items")
          .select("position")
          .eq("meal_log_id", mealLog.id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastLogItemError) throw new Error(lastLogItemError.message);

        const startPosition = (lastLogItem?.position ?? 0) + 1;
        const logItemInserts: MealLogItemInsert[] = planItems.map((item, index) => ({
          meal_log_id: mealLog.id,
          created_by_user_id: user.id,
          item_name: item.title,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: null,
          notes: item.notes,
          is_quick_add: false,
          consumed_time: item.planned_time ?? null,
          position: startPosition + index,
        }));

        const { error: insertItemsError } = await supabase.from("meal_log_items").insert(logItemInserts);
        if (insertItemsError) throw new Error(insertItemsError.message);

        await syncMealLogTotals(supabase, mealLog.id);
        insertedCount += logItemInserts.length;
      }

      await upsertDailyCompliance({
        supabase,
        subject,
        performedOn: payload.performed_on,
      });

      activityContext = {
        meal_group_id: payload.meal_group_id,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        inserted_count: insertedCount,
        skipped: false,
      };
      revalidateNutritionPaths(subject.subject_client_id);
      return { inserted_count: insertedCount, skipped: false as const };
    },
  });
}

export async function addMealItemAction(input: z.input<typeof addMealItemSchema>) {
  const payload = addMealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.item.add",
    payload: {
      performed_on: payload.performed_on,
      meal_type: payload.meal_type,
      meal_group_id: payload.meal_group_id ?? null,
      item_name: payload.item.item_name,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const normalizedMealType = normalizeMealType(payload.meal_type);

      if (payload.meal_group_id) {
        await ensureMealLogSections({
          supabase,
          actorUserId: user.id,
          subject,
          meal_group_id: payload.meal_group_id,
          performed_on: payload.performed_on,
          meal_types: [normalizedMealType],
        });
      }

      const log = await getOrCreateMealLog({
        supabase,
        actorUserId: user.id,
        subject,
        performed_on: payload.performed_on,
        meal_type: normalizedMealType,
        meal_group_id: payload.meal_group_id ?? null,
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
        consumed_time: payload.item.consumed_time ?? null,
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
      favoriteQuery = favoriteQuery.eq("meal_type", normalizedMealType);
      const { data: favorite } = await favoriteQuery.maybeSingle();
      if (favorite) {
        await supabase
          .from("meal_item_favorites")
          .update({ usage_count: (favorite.usage_count || 0) + 1, last_used_at: new Date().toISOString() })
          .eq("id", favorite.id);
      }

      await syncMealLogTotals(supabase, log.id);
      await upsertDailyCompliance({
        supabase,
        subject,
        performedOn: payload.performed_on,
      });

      activityContext = {
        item_name: item.item_name,
        meal_type: normalizedMealType,
        performed_on: payload.performed_on,
        meal_group_id: payload.meal_group_id ?? null,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
      };
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
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.item.update",
    payload: { item_id: payload.item_id, item_name: payload.item.item_name ?? null },
    getSuccessPayload: () => activityContext,
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
        consumed_time: payload.item.consumed_time,
      };

      const { data, error } = await supabase.from("meal_log_items").update(updates).eq("id", payload.item_id).select("*").single();
      if (error) throw new Error(error.message);

      await syncMealLogTotals(supabase, data.meal_log_id);

      const { data: mealLog } = await supabase
        .from("meal_logs")
        .select(MEAL_LOG_ACTIVITY_SELECT)
        .eq("id", data.meal_log_id)
        .maybeSingle();

      await upsertComplianceForMealLog(supabase, mealLog as MealLogActivitySnapshot | null);

      activityContext = buildMealItemActivityContext(data.item_name || payload.item.item_name || null, mealLog as MealLogActivitySnapshot | null);
      revalidateNutritionPaths(mealLog?.subject_client_id ?? null);
      return data as MealLogItemRow;
    },
  });
}

export async function removeMealItemAction(input: z.input<typeof removeMealItemSchema>) {
  const payload = removeMealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.item.remove",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();

      const { data: currentItem, error: itemError } = await supabase
        .from("meal_log_items")
        .select("id, meal_log_id, item_name")
        .eq("id", payload.item_id)
        .single();
      if (itemError) throw new Error(itemError.message);

      const { data: mealLog, error: mealLogError } = await supabase
        .from("meal_logs")
        .select(MEAL_LOG_ACTIVITY_SELECT)
        .eq("id", currentItem.meal_log_id)
        .maybeSingle();
      if (mealLogError) throw new Error(mealLogError.message);

      const { error } = await supabase.from("meal_log_items").delete().eq("id", payload.item_id);
      if (error) throw new Error(error.message);

      await syncMealLogTotals(supabase, currentItem.meal_log_id);
      await upsertComplianceForMealLog(supabase, mealLog as MealLogActivitySnapshot | null);

      activityContext = buildMealItemActivityContext(currentItem.item_name, mealLog as MealLogActivitySnapshot | null);
      revalidateNutritionPaths(mealLog?.subject_client_id ?? null);
      return { success: true };
    },
  });
}

export async function updateMealLogNotesAction(input: z.input<typeof diaryNotesSchema>) {
  const payload = diaryNotesSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.log.notes.update",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("meal_logs")
        .update({ notes: payload.notes })
        .eq("id", payload.meal_log_id)
        .select(MEAL_LOG_ACTIVITY_SELECT)
        .single();
      if (error) throw new Error(error.message);
      activityContext = {
        meal_type: data.meal_type,
        performed_on: data.performed_on,
        meal_group_id: data.meal_group_id,
        subject_user_id: data.subject_user_id,
        subject_client_id: data.subject_client_id,
      };
      revalidateNutritionPaths(data.subject_client_id ?? null);
      return { success: true };
    },
  });
}

export async function copyMealsFromDateAction(input: z.input<typeof copyFromDateSchema>) {
  const payload = copyFromDateSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.manual.day.copy",
    payload: {
      source_date: payload.source_date,
      target_date: payload.target_date,
      meal_group_id: payload.meal_group_id ?? null,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);
      const requestedMealTypes = payload.meal_types && payload.meal_types.length > 0 ? payload.meal_types : [...MEAL_TYPES];
      const targetMealTypes = Array.from(new Set(requestedMealTypes.map((type) => normalizeMealType(type))));

      let sourceQuery = supabase
        .from("meal_logs")
        .select("*")
        .eq("performed_on", payload.source_date)
        .in("meal_type", requestedMealTypes);
      sourceQuery = applySubjectFilters(sourceQuery, subject);
      sourceQuery = applyMealGroupFilter(sourceQuery, payload.meal_group_id);

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

      if (payload.meal_group_id) {
        await ensureMealLogSections({
          supabase,
          actorUserId: user.id,
          subject,
          meal_group_id: payload.meal_group_id,
          performed_on: payload.target_date,
          meal_types: targetMealTypes,
        });
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
          meal_group_id: payload.meal_group_id ?? null,
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
          consumed_time: item.consumed_time,
          position: index + 1,
        }));

        const { error: insertError } = await supabase.from("meal_log_items").insert(copiedRows);
        if (insertError) throw new Error(insertError.message);
        await setMealLogTotals(supabase, targetLog.id, deriveMealLogTotals(copiedRows));
        copiedCount += copiedRows.length;
      }

      await upsertDailyCompliance({
        supabase,
        subject,
        performedOn: payload.target_date,
      });

      activityContext = {
        source_date: payload.source_date,
        target_date: payload.target_date,
        meal_group_id: payload.meal_group_id ?? null,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        copied_count: copiedCount,
      };
      revalidateNutritionPaths(subject.subject_client_id);
      return { copied_count: copiedCount };
    },
  });
}

export async function listFavoriteMealItemsAction(input: z.input<typeof favoritesSchema>): Promise<FavoriteRow[]> {
  const payload = favoritesSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.manual.items.favorites",
    payload: { limit: payload.limit, meal_type: payload.meal_type ?? null },
    action: async () => {
      const { supabase, user } = await requireActor();
      let query = supabase
        .from("meal_item_favorites")
        .select("*")
        .eq("subject_user_id", user.id)
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(payload.limit);
      if (payload.meal_type) {
        query = query.eq("meal_type", normalizeMealType(payload.meal_type));
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as FavoriteRow[];
    },
  });
}

export async function toggleFavoriteMealItemAction(input: z.input<typeof toggleFavoriteSchema>) {
  const payload = toggleFavoriteSchema.parse(input);
  const normalizedMealType = payload.meal_type ? normalizeMealType(payload.meal_type) : null;
  let favoriteAction: "added" | "removed" = "added";
  let actorUserId: string | null = null;
  return runTrackedAction({
    eventName: "nutrition.manual.favorite.toggle",
    payload: { item_name: payload.item.item_name, meal_type: normalizedMealType },
    getSuccessPayload: () => ({
      favorite_action: favoriteAction,
      subject_user_id: actorUserId,
    }),
    action: async () => {
      const { supabase, user } = await requireActor();
      actorUserId = user.id;

      let existingQuery = supabase
        .from("meal_item_favorites")
        .select("id")
        .eq("subject_user_id", user.id)
        .eq("item_name", payload.item.item_name);
      existingQuery = payload.item.unit ? existingQuery.eq("unit", payload.item.unit) : existingQuery.is("unit", null);
      existingQuery = normalizedMealType ? existingQuery.eq("meal_type", normalizedMealType) : existingQuery.is("meal_type", null);
      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existing) {
        favoriteAction = "removed";
        const { error: deleteError } = await supabase.from("meal_item_favorites").delete().eq("id", existing.id);
        if (deleteError) throw new Error(deleteError.message);
        revalidateNutritionPaths();
        return { favorited: false };
      }

      favoriteAction = "added";
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
        meal_type: normalizedMealType,
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

      const dailyValues = Array.from(totalsByDay.entries());
      const daysLoggedCount = dailyValues.length;
      const avgCalories =
        daysLoggedCount > 0
          ? Math.round(dailyValues.reduce((sum, [, calories]) => sum + calories, 0) / daysLoggedCount)
          : 0;

      let onTargetCount = 0;
      let offTargetCount = 0;
      for (const [day, calories] of dailyValues) {
        const goalTarget = await resolveGoalTargetForDate(
          supabase,
          { subject_client_id: payload.client_id, subject_user_id: null },
          day
        );
        const target =
          goalTarget.source === "fitness_goal" && goalTarget.calories && goalTarget.calories > 0
            ? goalTarget.calories
            : null;
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
