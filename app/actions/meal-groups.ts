"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { nextSequentialPosition } from "@/lib/nutrition/meal-ui";
import { mealUnitInputSchema } from "@/lib/nutrition/meal-units";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type MealGroupRow = Database["public"]["Tables"]["meal_groups"]["Row"];
type MealGroupInsert = Database["public"]["Tables"]["meal_groups"]["Insert"];
type MealGroupUpdate = Database["public"]["Tables"]["meal_groups"]["Update"];
type MealPlanRow = Database["public"]["Tables"]["meal_group_plans"]["Row"];
type MealPlanInsert = Database["public"]["Tables"]["meal_group_plans"]["Insert"];
type MealPlanTypeRow = Database["public"]["Tables"]["meal_group_plan_types"]["Row"];
type MealPlanTypeInsert = Database["public"]["Tables"]["meal_group_plan_types"]["Insert"];
type MealItemRow = Database["public"]["Tables"]["meal_group_items"]["Row"];
type MealItemInsert = Database["public"]["Tables"]["meal_group_items"]["Insert"];
type MealItemUpdate = Database["public"]["Tables"]["meal_group_items"]["Update"];
type MealAssignmentRow = Database["public"]["Tables"]["meal_group_assignments"]["Row"];
type MealAssignmentInsert = Database["public"]["Tables"]["meal_group_assignments"]["Insert"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type MealGroupStatus = Database["public"]["Enums"]["meal_group_status"];
export type MealItemType = Database["public"]["Enums"]["meal_item_type"];
export type MealDayOfWeek = Database["public"]["Enums"]["meal_day_of_week"];

const DAY_ORDER: MealDayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<MealDayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MEAL_ITEM_TYPES: Array<{ value: MealItemType; label: string }> = [
  { value: "water", label: "Water" },
  { value: "breakfast", label: "Breakfast" },
  { value: "snack", label: "Snack" },
  { value: "lunch", label: "Lunch" },
  { value: "pre_workout_meal", label: "Pre-workout Meal" },
  { value: "post_workout_meal", label: "Post-workout Meal" },
  { value: "dinner", label: "Dinner" },
  { value: "protein_drink", label: "Protein Drink" },
];

const MEAL_ITEM_LABELS = new Map<MealItemType, string>(MEAL_ITEM_TYPES.map((entry) => [entry.value, entry.label]));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const subjectSchema = z.object({
  subject_user_id: z.string().uuid().nullable().optional(),
  subject_client_id: z.string().uuid().nullable().optional(),
});

const listMealGroupsSchema = z.object({
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(12),
  status: z.enum(["draft", "active", "archived", "all"]).default("all"),
  search: z.string().trim().max(120).optional(),
  include_snapshots: z.boolean().default(false),
});

const mealGroupBaseSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  start_date: dateSchema.nullable().optional(),
  end_date: dateSchema.nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

const upsertMealGroupSchema = mealGroupBaseSchema.extend({
  id: z.string().uuid().optional(),
});

const mealGroupIdSchema = z.object({
  meal_group_id: z.string().uuid(),
});

const mealPlanNoteSchema = z.object({
  meal_plan_id: z.string().uuid(),
  notes: z.string().trim().max(5000).nullable(),
});

const mealItemSchema = z.object({
  meal_plan_id: z.string().uuid(),
  type: z.enum([
    "water",
    "breakfast",
    "snack",
    "lunch",
    "pre_workout_meal",
    "post_workout_meal",
    "dinner",
    "protein_drink",
  ]),
  title: z.string().trim().max(180).nullable().optional(),
  quantity: z.number().min(0).max(10000).nullable().optional(),
  unit: mealUnitInputSchema,
  calories: z.number().int().min(0).max(2000).default(0),
  protein_g: z.number().int().min(0).max(300).default(0),
  carbs_g: z.number().int().min(0).max(300).default(0),
  fat_g: z.number().int().min(0).max(300).default(0),
  notes: z.string().trim().max(4000).nullable().optional(),
  planned_date: dateSchema.nullable().optional(),
  planned_time: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
});

const updateMealItemSchema = z.object({
  meal_item_id: z.string().uuid(),
  changes: mealItemSchema.omit({ meal_plan_id: true }).partial().refine(
    (value) =>
      value.type !== undefined ||
      value.title !== undefined ||
      value.calories !== undefined ||
      value.protein_g !== undefined ||
      value.carbs_g !== undefined ||
      value.fat_g !== undefined ||
      value.notes !== undefined ||
      value.quantity !== undefined ||
      value.unit !== undefined ||
      value.planned_date !== undefined ||
      value.planned_time !== undefined,
    "At least one field must be provided"
  ),
});

const duplicateMealItemSchema = z.object({
  meal_item_id: z.string().uuid(),
});

const addMealPlanTypeSchema = z.object({
  meal_plan_id: z.string().uuid(),
  type: z.enum([
    "water",
    "breakfast",
    "snack",
    "lunch",
    "pre_workout_meal",
    "post_workout_meal",
    "dinner",
    "protein_drink",
  ]),
});

const assignMealGroupSchema = z.object({
  meal_group_id: z.string().uuid(),
  subject: subjectSchema,
  start_date: dateSchema,
  end_date: dateSchema,
  notes: z.string().trim().max(5000).nullable().optional(),
});

const updateAssignmentDatesSchema = z.object({
  assignment_id: z.string().uuid(),
  start_date: dateSchema,
  end_date: dateSchema,
  notes: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
});

const archiveAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
});

const listAssignmentsSchema = z.object({
  subject: subjectSchema.optional(),
  status: z.enum(["all", "active", "paused", "completed", "archived"]).default("active"),
});

export type MealGroupListRow = MealGroupRow & {
  assignment_count: number;
  plans_count: number;
};

export type MealGroupDayPlan = MealPlanRow & {
  meal_types: Array<
    Pick<MealPlanTypeRow, "id" | "type" | "position"> & {
      source: "configured" | "inferred";
    }
  >;
  items: MealItemRow[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

export type MealGroupDetail = {
  group: MealGroupRow;
  plans: MealGroupDayPlan[];
  assignments: MealAssignmentRow[];
};

type MealAssignmentView = MealAssignmentRow & {
  meal_group: Pick<MealGroupRow, "id" | "name" | "status" | "start_date" | "end_date" | "is_snapshot" | "source_group_id"> | null;
  template_group: Pick<MealGroupRow, "id" | "name"> | null;
  subject_client: Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name" | "linked_user_id"> | null;
  subject_user: Pick<ProfileRow, "id" | "full_name"> | null;
};

function titleForType(type: MealItemType) {
  return MEAL_ITEM_LABELS.get(type) || "Meal";
}

function normalizeListMealGroupsPayload(input: z.input<typeof listMealGroupsSchema>) {
  const parsed = listMealGroupsSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  const raw = (input || {}) as {
    page?: unknown;
    page_size?: unknown;
    status?: unknown;
    search?: unknown;
    include_snapshots?: unknown;
  };

  const page = Number(raw.page);
  const pageSize = Number(raw.page_size);
  const status = typeof raw.status === "string" ? raw.status : "";
  const search = typeof raw.search === "string" ? raw.search.trim() : "";

  return {
    page: Number.isFinite(page) && page >= 0 ? Math.trunc(page) : 0,
    page_size: Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(50, Math.trunc(pageSize)) : 12,
    status: status === "draft" || status === "active" || status === "archived" || status === "all" ? status : "all",
    search: search && search !== "$undefined" ? search.slice(0, 120) : undefined,
    include_snapshots: raw.include_snapshots === true,
  } as z.infer<typeof listMealGroupsSchema>;
}

function orderPlans(plans: MealPlanRow[]) {
  return [...plans].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week));
}

function normalizeSubject(input: z.infer<typeof subjectSchema>) {
  const subject_user_id = input.subject_user_id ?? null;
  const subject_client_id = input.subject_client_id ?? null;
  if (!!subject_user_id === !!subject_client_id) {
    throw new Error("Assign exactly one subject: user or client.");
  }
  return { subject_user_id, subject_client_id };
}

function revalidateMealGroupPaths(groupId?: string, subjectClientId?: string | null) {
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/diary");
  revalidatePath("/nutrition/meal-planner");
  revalidatePath("/nutrition/meal-groups");
  revalidatePath("/nutrition/groups");
  if (groupId) {
    revalidatePath(`/nutrition/groups/${groupId}`);
  }
  if (subjectClientId) revalidatePath(`/clients/${subjectClientId}/nutrition`);
}

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

function isRlsInsertError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42501" || /row-level security/i.test(error.message || "");
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

async function listPlansAndItemsForGroup(supabase: Awaited<ReturnType<typeof createClient>>, mealGroupId: string) {
  const [{ data: plans, error: plansError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("meal_group_plans").select("*").eq("meal_group_id", mealGroupId),
    supabase
      .from("meal_group_items")
      .select("*, meal_group_plans!inner(id, meal_group_id)")
      .eq("meal_group_plans.meal_group_id", mealGroupId)
      .order("position", { ascending: true }),
  ]);
  if (plansError) throw new Error(plansError.message);
  if (itemsError) throw new Error(itemsError.message);

  const { data: planTypesData, error: planTypesError } = await supabase
    .from("meal_group_plan_types")
    .select("*, meal_group_plans!inner(id, meal_group_id)")
    .eq("meal_group_plans.meal_group_id", mealGroupId)
    .order("position", { ascending: true });
  if (planTypesError && !isMissingRelationError(planTypesError)) {
    throw new Error(planTypesError.message);
  }

  return {
    plans: (plans || []) as MealPlanRow[],
    items: (items || []) as (MealItemRow & { meal_group_plans: { id: string; meal_group_id: string } })[],
    plan_types: (planTypesData || []) as (MealPlanTypeRow & { meal_group_plans: { id: string; meal_group_id: string } })[],
  };
}

async function cloneMealGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  sourceGroupId: string,
  options: {
    name: string;
    description?: string | null;
    notes?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: MealGroupStatus;
    is_snapshot?: boolean;
    source_group_id?: string | null;
  }
) {
  const { data: sourceGroup, error: sourceError } = await supabase.from("meal_groups").select("*").eq("id", sourceGroupId).single();
  if (sourceError) throw new Error(sourceError.message);

  const { plans: sourcePlans, items: sourceItems, plan_types: sourcePlanTypes } = await listPlansAndItemsForGroup(supabase, sourceGroupId);

  const newGroupInsert: MealGroupInsert = {
    name: options.name,
    description: options.description ?? sourceGroup.description,
    notes: options.notes ?? sourceGroup.notes,
    start_date: options.start_date ?? sourceGroup.start_date,
    end_date: options.end_date ?? sourceGroup.end_date,
    status: options.status ?? sourceGroup.status,
    owner_user_id: actorId,
    is_snapshot: options.is_snapshot ?? false,
    source_group_id: options.source_group_id ?? null,
  };

  const { data: newGroup, error: newGroupError } = await supabase.from("meal_groups").insert(newGroupInsert).select("*").single();
  if (newGroupError) throw new Error(newGroupError.message);

  const sortedPlans = orderPlans(sourcePlans);
  const planInserts: MealPlanInsert[] = sortedPlans.map((plan) => ({
    meal_group_id: newGroup.id,
    day_of_week: plan.day_of_week,
    label: plan.label,
    notes: plan.notes,
    created_by_user_id: actorId,
  }));
  const { data: insertedPlans, error: insertPlansError } = await supabase.from("meal_group_plans").insert(planInserts).select("*");
  if (insertPlansError) throw new Error(insertPlansError.message);

  const planIdMap = new Map<string, string>();
  for (let i = 0; i < sortedPlans.length; i += 1) {
    const sourcePlan = sortedPlans[i];
    const inserted = insertedPlans?.find((plan) => plan.day_of_week === sourcePlan.day_of_week);
    if (inserted) planIdMap.set(sourcePlan.id, inserted.id);
  }

  if (sourcePlanTypes.length > 0) {
    const planTypeInserts: MealPlanTypeInsert[] = [];
    for (const planType of sourcePlanTypes) {
      const mappedPlanId = planIdMap.get(planType.meal_plan_id);
      if (!mappedPlanId) continue;
      planTypeInserts.push({
        meal_plan_id: mappedPlanId,
        type: planType.type,
        position: planType.position,
        created_by_user_id: actorId,
      });
    }
    if (planTypeInserts.length > 0) {
      const { error: insertPlanTypesError } = await supabase.from("meal_group_plan_types").insert(planTypeInserts);
      if (insertPlanTypesError) throw new Error(insertPlanTypesError.message);
    }
  }

  if (sourceItems.length > 0) {
    const itemInserts: MealItemInsert[] = [];
    for (const item of sourceItems) {
      const mappedPlanId = planIdMap.get(item.meal_plan_id);
      if (!mappedPlanId) continue;
      itemInserts.push({
        meal_plan_id: mappedPlanId,
        type: item.type,
        title: item.title,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        notes: item.notes,
        quantity: item.quantity,
        unit: item.unit,
        position: item.position,
        planned_date: item.planned_date,
        planned_time: item.planned_time,
        created_by_user_id: actorId,
      });
    }

    if (itemInserts.length > 0) {
      const { error: insertItemsError } = await supabase.from("meal_group_items").insert(itemInserts);
      if (insertItemsError) throw new Error(insertItemsError.message);
    }
  }

  return newGroup;
}

export async function listMealGroupsAction(input: z.input<typeof listMealGroupsSchema>) {
  const payload = normalizeListMealGroupsPayload(input);
  return runTrackedAction({
    eventName: "nutrition.meal-groups.list",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const from = payload.page * payload.page_size;
      const to = from + payload.page_size - 1;

      let query = supabase
        .from("meal_groups")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false });

      if (!payload.include_snapshots) query = query.eq("is_snapshot", false);
      if (payload.status !== "all") query = query.eq("status", payload.status);
      if (payload.search) query = query.ilike("name", `%${payload.search}%`);

      const { data, error, count } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const groups = (data || []) as MealGroupRow[];
      const groupIds = groups.map((group) => group.id);
      if (groupIds.length === 0) {
        return { rows: [] as MealGroupListRow[], total: 0, page: payload.page, page_size: payload.page_size, has_more: false };
      }

      const [{ data: plans, error: plansError }, { data: assignments, error: assignmentsError }] = await Promise.all([
        supabase.from("meal_group_plans").select("id, meal_group_id").in("meal_group_id", groupIds),
        supabase.from("meal_group_assignments").select("id, template_group_id, meal_group_id").in("template_group_id", groupIds),
      ]);
      if (plansError && !isMissingRelationError(plansError)) throw new Error(plansError.message);
      if (assignmentsError && !isMissingRelationError(assignmentsError)) throw new Error(assignmentsError.message);

      const plansByGroup = new Map<string, number>();
      for (const row of plans || []) plansByGroup.set(row.meal_group_id, (plansByGroup.get(row.meal_group_id) || 0) + 1);

      const assignmentsByTemplate = new Map<string, number>();
      for (const row of assignments || []) {
        assignmentsByTemplate.set(row.template_group_id, (assignmentsByTemplate.get(row.template_group_id) || 0) + 1);
      }

      const rows: MealGroupListRow[] = groups.map((group) => ({
        ...group,
        assignment_count: assignmentsByTemplate.get(group.id) || 0,
        plans_count: plansByGroup.get(group.id) || 0,
      }));

      const total = count ?? 0;
      return {
        rows,
        total,
        page: payload.page,
        page_size: payload.page_size,
        has_more: from + rows.length < total,
      };
    },
  });
}

export async function listAssignableSubjectsAction() {
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assignable-subjects",
    action: async () => {
      const { supabase, user } = await requireActor();
      const [{ data: profile, error: profileError }, { data: clients, error: clientsError }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("clients")
          .select("id, display_name, first_name, last_name, linked_user_id")
          .eq("is_archived", false)
          .order("updated_at", { ascending: false })
          .limit(100),
      ]);

      if (profileError) throw new Error(profileError.message);
      if (clientsError) throw new Error(clientsError.message);

      return {
        self: profile,
        clients: (clients || []) as Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name" | "linked_user_id">[],
      };
    },
  });
}

export async function getMealGroupDetailAction(mealGroupId: string) {
  const payload = mealGroupIdSchema.parse({ meal_group_id: mealGroupId });
  return runTrackedAction({
    eventName: "nutrition.meal-groups.detail",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const { data: group, error: groupError } = await supabase.from("meal_groups").select("*").eq("id", payload.meal_group_id).single();
      if (groupError) throw new Error(groupError.message);

      const { plans, items, plan_types: planTypes } = await listPlansAndItemsForGroup(supabase, payload.meal_group_id);

      const itemByPlan = new Map<string, MealItemRow[]>();
      for (const row of items) {
        itemByPlan.set(row.meal_plan_id, [...(itemByPlan.get(row.meal_plan_id) || []), row]);
      }

      const typeByPlan = new Map<string, MealPlanTypeRow[]>();
      for (const row of planTypes) {
        typeByPlan.set(row.meal_plan_id, [...(typeByPlan.get(row.meal_plan_id) || []), row]);
      }

      const detailPlans: MealGroupDayPlan[] = orderPlans(plans).map((plan) => {
        const dayItems = (itemByPlan.get(plan.id) || []).sort((a, b) => a.position - b.position);
        const configuredTypes = (typeByPlan.get(plan.id) || [])
          .sort((a, b) => a.position - b.position)
          .map((row) => ({
            id: row.id,
            type: row.type,
            position: row.position,
            source: "configured" as const,
          }));

        const configuredTypeSet = new Set(configuredTypes.map((entry) => entry.type));
        const inferredTypes = Array.from(new Set(dayItems.map((item) => item.type)))
          .filter((type) => !configuredTypeSet.has(type))
          .map((type, index) => ({
            id: `inferred-${plan.id}-${type}`,
            type,
            position: configuredTypes.length + index + 1,
            source: "inferred" as const,
          }));

        const totals = dayItems.reduce(
          (acc, item) => {
            acc.calories += item.calories || 0;
            acc.protein_g += item.protein_g || 0;
            acc.carbs_g += item.carbs_g || 0;
            acc.fat_g += item.fat_g || 0;
            return acc;
          },
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        );
        return {
          ...plan,
          meal_types: [...configuredTypes, ...inferredTypes].sort((a, b) => a.position - b.position),
          items: dayItems,
          totals,
        };
      });

      const { data: assignments, error: assignmentsError } = await supabase
        .from("meal_group_assignments")
        .select("*")
        .or(`meal_group_id.eq.${payload.meal_group_id},template_group_id.eq.${payload.meal_group_id}`)
        .order("created_at", { ascending: false });
      if (assignmentsError) throw new Error(assignmentsError.message);

      return {
        group,
        plans: detailPlans,
        assignments: (assignments || []) as MealAssignmentRow[],
      } satisfies MealGroupDetail;
    },
  });
}

export async function upsertMealGroupAction(input: z.input<typeof upsertMealGroupSchema>) {
  const payload = upsertMealGroupSchema.parse(input);
  return runTrackedAction({
    eventName: payload.id ? "nutrition.meal-groups.update" : "nutrition.meal-groups.create",
    payload: { id: payload.id || null, group_name: payload.name, status: payload.status },
    action: async () => {
      const { supabase, user } = await requireActor();
      const admin = createAdminClient();

      const values: MealGroupUpdate = {
        name: payload.name,
        description: payload.description || null,
        notes: payload.notes || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        status: payload.status,
      };

      if (payload.id) {
        const { data, error } = await supabase.from("meal_groups").update(values).eq("id", payload.id).select("*").single();
        if (error) throw new Error(error.message);
        revalidateMealGroupPaths(data.id);
        return { success: true, id: data.id };
      }

      const insertRow: MealGroupInsert = {
        name: payload.name,
        description: payload.description || null,
        notes: payload.notes || null,
        start_date: payload.start_date || null,
        end_date: payload.end_date || null,
        status: payload.status,
        owner_user_id: user.id,
        is_snapshot: false,
        source_group_id: null,
      };

      let writeClient = supabase;
      let group: MealGroupRow;
      const { data: groupData, error: groupError } = await supabase.from("meal_groups").insert(insertRow).select("*").single();
      if (!groupError) {
        group = groupData;
      } else {
        if (!isRlsInsertError(groupError)) throw new Error(groupError.message);
        const { data: adminGroup, error: adminGroupError } = await admin.from("meal_groups").insert(insertRow).select("*").single();
        if (adminGroupError) throw new Error(adminGroupError.message);
        group = adminGroup;
        writeClient = admin;
      }

      const dayRows: MealPlanInsert[] = DAY_ORDER.map((day) => ({
        meal_group_id: group.id,
        day_of_week: day,
        label: DAY_LABELS[day],
        notes: null,
        created_by_user_id: user.id,
      }));
      const { error: plansError } = await writeClient.from("meal_group_plans").insert(dayRows);
      if (plansError) {
        if (writeClient !== supabase || !isRlsInsertError(plansError)) {
          throw new Error(plansError.message);
        }
        const { error: adminPlansError } = await admin.from("meal_group_plans").insert(dayRows);
        if (adminPlansError) throw new Error(adminPlansError.message);
      }

      revalidateMealGroupPaths(group.id);
      return { success: true, id: group.id };
    },
  });
}

export async function deleteMealGroupAction(input: z.input<typeof mealGroupIdSchema>) {
  const payload = mealGroupIdSchema.parse(input);
  let activityContext: Record<string, unknown> = { meal_group_id: payload.meal_group_id };
  return runTrackedAction({
    eventName: "nutrition.meal-groups.delete",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data: group } = await supabase.from("meal_groups").select("name").eq("id", payload.meal_group_id).maybeSingle();

      const { error } = await supabase.from("meal_groups").delete().eq("id", payload.meal_group_id);
      if (error) {
        // Fallback to archive when references prevent hard delete.
        const archiveRes = await supabase
          .from("meal_groups")
          .update({ status: "archived" })
          .eq("id", payload.meal_group_id)
          .select("id")
          .single();
        if (archiveRes.error) throw new Error(archiveRes.error.message);
      }
      activityContext = {
        meal_group_id: payload.meal_group_id,
        group_name: group?.name ?? null,
      };
      revalidateMealGroupPaths(payload.meal_group_id);
      return { success: true };
    },
  });
}

export async function duplicateMealGroupAction(input: z.input<typeof mealGroupIdSchema>) {
  const payload = mealGroupIdSchema.parse(input);
  let activityContext: Record<string, unknown> = { meal_group_id: payload.meal_group_id };
  return runTrackedAction({
    eventName: "nutrition.meal-groups.duplicate",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data: source, error: sourceError } = await supabase.from("meal_groups").select("name").eq("id", payload.meal_group_id).single();
      if (sourceError) throw new Error(sourceError.message);

      const cloned = await cloneMealGroup(supabase, user.id, payload.meal_group_id, {
        name: `Copy of ${source.name}`,
        status: "draft",
        is_snapshot: false,
        source_group_id: payload.meal_group_id,
      });

      activityContext = {
        meal_group_id: cloned.id,
        source_meal_group_id: payload.meal_group_id,
        group_name: cloned.name,
      };
      revalidateMealGroupPaths(cloned.id);
      return { success: true, id: cloned.id };
    },
  });
}

export async function updateMealPlanNoteAction(input: z.input<typeof mealPlanNoteSchema>) {
  const payload = mealPlanNoteSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-plan.note.update",
    payload: { meal_plan_id: payload.meal_plan_id },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("meal_group_plans")
        .update({ notes: payload.notes || null })
        .eq("id", payload.meal_plan_id)
        .select("id, meal_group_id, day_of_week")
        .single();
      if (error) throw new Error(error.message);

      activityContext = {
        meal_plan_id: data.id,
        meal_group_id: data.meal_group_id,
        day_of_week: data.day_of_week,
      };
      revalidateMealGroupPaths(data.meal_group_id);
      return { success: true };
    },
  });
}

export async function createMealPlanTypeAction(input: z.input<typeof addMealPlanTypeSchema>) {
  const payload = addMealPlanTypeSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-plan.type.create",
    payload: { meal_plan_id: payload.meal_plan_id, type: payload.type },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();

      const { data: plan, error: planError } = await supabase
        .from("meal_group_plans")
        .select("id, meal_group_id, day_of_week")
        .eq("id", payload.meal_plan_id)
        .single();
      if (planError) throw new Error(planError.message);

      const { data: existingRows, error: existingError } = await supabase
        .from("meal_group_plan_types")
        .select("*")
        .eq("meal_plan_id", payload.meal_plan_id)
        .order("position", { ascending: true });
      if (existingError) {
        if (isMissingRelationError(existingError)) {
          throw new Error("Meal planner database migration is required. Apply the latest migrations and retry.");
        }
        throw new Error(existingError.message);
      }

      const existing = (existingRows || []) as MealPlanTypeRow[];
      const nextPosition = nextSequentialPosition(existing.map((row) => row.position));

      const insertRow: MealPlanTypeInsert = {
        meal_plan_id: payload.meal_plan_id,
        type: payload.type,
        position: nextPosition,
        created_by_user_id: user.id,
      };

      const { data: created, error: createError } = await supabase
        .from("meal_group_plan_types")
        .insert(insertRow)
        .select("*")
        .single();
      if (createError) {
        if (isMissingRelationError(createError)) {
          throw new Error("Meal planner database migration is required. Apply the latest migrations and retry.");
        }
        throw new Error(createError.message);
      }

      activityContext = {
        meal_plan_id: plan.id,
        meal_group_id: plan.meal_group_id,
        day_of_week: plan.day_of_week,
        meal_type: payload.type,
      };
      revalidateMealGroupPaths(plan.meal_group_id);
      return created as MealPlanTypeRow;
    },
  });
}

export async function createMealItemAction(input: z.input<typeof mealItemSchema>) {
  const payload = mealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-item.create",
    payload: {
      meal_plan_id: payload.meal_plan_id,
      meal_type: payload.type,
      planned_date: payload.planned_date ?? null,
      item_name: payload.title?.trim() || titleForType(payload.type),
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();

      const [{ data: plan, error: planError }, { data: maxPosition }] = await Promise.all([
        supabase.from("meal_group_plans").select("id, meal_group_id, day_of_week").eq("id", payload.meal_plan_id).single(),
        supabase
          .from("meal_group_items")
          .select("position")
          .eq("meal_plan_id", payload.meal_plan_id)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (planError) throw new Error(planError.message);

      const insertRow: MealItemInsert = {
        meal_plan_id: payload.meal_plan_id,
        type: payload.type,
        title: payload.title?.trim() || titleForType(payload.type),
        calories: payload.calories,
        protein_g: payload.protein_g,
        carbs_g: payload.carbs_g,
        fat_g: payload.fat_g,
        notes: payload.notes || null,
        quantity: payload.quantity ?? null,
        unit: payload.unit || null,
        planned_date: payload.planned_date || null,
        planned_time: payload.planned_time || null,
        position: (maxPosition?.position || 0) + 1,
        created_by_user_id: user.id,
      };

      const { data: item, error } = await supabase.from("meal_group_items").insert(insertRow).select("*").single();
      if (error) throw new Error(error.message);

      activityContext = {
        meal_plan_id: payload.meal_plan_id,
        meal_group_id: plan.meal_group_id,
        day_of_week: plan.day_of_week,
        meal_type: item.type,
        item_name: item.title,
        planned_date: item.planned_date,
      };
      revalidateMealGroupPaths(plan.meal_group_id);
      return item as MealItemRow;
    },
  });
}

export async function updateMealItemAction(input: z.input<typeof updateMealItemSchema>) {
  const payload = updateMealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-item.update",
    payload: {
      meal_item_id: payload.meal_item_id,
      meal_type: payload.changes.type ?? null,
      planned_date: payload.changes.planned_date ?? null,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data: current, error: currentError } = await supabase
        .from("meal_group_items")
        .select("id, meal_plan_id, type, title, planned_date")
        .eq("id", payload.meal_item_id)
        .single();
      if (currentError) throw new Error(currentError.message);

      const updates: MealItemUpdate = {};
      if (payload.changes.type !== undefined) updates.type = payload.changes.type;
      if (payload.changes.title !== undefined) {
        updates.title = payload.changes.title?.trim() || titleForType(payload.changes.type || current.type);
      }
      if (payload.changes.calories !== undefined) updates.calories = payload.changes.calories;
      if (payload.changes.protein_g !== undefined) updates.protein_g = payload.changes.protein_g;
      if (payload.changes.carbs_g !== undefined) updates.carbs_g = payload.changes.carbs_g;
      if (payload.changes.fat_g !== undefined) updates.fat_g = payload.changes.fat_g;
      if (payload.changes.notes !== undefined) updates.notes = payload.changes.notes || null;
      if (payload.changes.quantity !== undefined) updates.quantity = payload.changes.quantity ?? null;
      if (payload.changes.unit !== undefined) updates.unit = payload.changes.unit || null;
      if (payload.changes.planned_date !== undefined) updates.planned_date = payload.changes.planned_date || null;
      if (payload.changes.planned_time !== undefined) updates.planned_time = payload.changes.planned_time || null;

      const { data, error } = await supabase.from("meal_group_items").update(updates).eq("id", payload.meal_item_id).select("*").single();
      if (error) throw new Error(error.message);

      const { data: plan } = await supabase.from("meal_group_plans").select("meal_group_id, day_of_week").eq("id", current.meal_plan_id).single();
      if (plan) {
        activityContext = {
          meal_item_id: data.id,
          meal_group_id: plan.meal_group_id,
          day_of_week: plan.day_of_week,
          meal_type: data.type,
          item_name: data.title || payload.changes.title || current.title,
          planned_date: data.planned_date || payload.changes.planned_date || current.planned_date,
        };
        revalidateMealGroupPaths(plan.meal_group_id);
      }
      return data as MealItemRow;
    },
  });
}

export async function deleteMealItemAction(input: z.input<typeof duplicateMealItemSchema>) {
  const payload = duplicateMealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-item.delete",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data: current, error: currentError } = await supabase
        .from("meal_group_items")
        .select("id, meal_plan_id, type, title, planned_date")
        .eq("id", payload.meal_item_id)
        .single();
      if (currentError) throw new Error(currentError.message);

      const { error } = await supabase.from("meal_group_items").delete().eq("id", payload.meal_item_id);
      if (error) throw new Error(error.message);

      const { data: plan } = await supabase.from("meal_group_plans").select("meal_group_id, day_of_week").eq("id", current.meal_plan_id).single();
      if (plan) {
        activityContext = {
          meal_group_id: plan.meal_group_id,
          day_of_week: plan.day_of_week,
          meal_type: current.type,
          item_name: current.title,
          planned_date: current.planned_date,
        };
        revalidateMealGroupPaths(plan.meal_group_id);
      }
      return { success: true };
    },
  });
}

export async function duplicateMealItemAction(input: z.input<typeof duplicateMealItemSchema>) {
  const payload = duplicateMealItemSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-item.duplicate",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const { data: current, error: currentError } = await supabase
        .from("meal_group_items")
        .select("*")
        .eq("id", payload.meal_item_id)
        .single();
      if (currentError) throw new Error(currentError.message);

      const { data: maxPosition } = await supabase
        .from("meal_group_items")
        .select("position")
        .eq("meal_plan_id", current.meal_plan_id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const insertRow: MealItemInsert = {
        meal_plan_id: current.meal_plan_id,
        type: current.type,
        title: `${current.title} (Copy)`,
        calories: current.calories,
        protein_g: current.protein_g,
        carbs_g: current.carbs_g,
        fat_g: current.fat_g,
        notes: current.notes,
        quantity: current.quantity,
        unit: current.unit,
        planned_date: current.planned_date,
        planned_time: current.planned_time,
        position: (maxPosition?.position || 0) + 1,
        created_by_user_id: user.id,
      };

      const { data, error } = await supabase.from("meal_group_items").insert(insertRow).select("*").single();
      if (error) throw new Error(error.message);

      const { data: plan } = await supabase.from("meal_group_plans").select("meal_group_id, day_of_week").eq("id", current.meal_plan_id).single();
      if (plan) {
        activityContext = {
          meal_group_id: plan.meal_group_id,
          day_of_week: plan.day_of_week,
          meal_type: data.type,
          item_name: data.title,
          planned_date: data.planned_date,
        };
        revalidateMealGroupPaths(plan.meal_group_id);
      }
      return data as MealItemRow;
    },
  });
}

export async function assignMealGroupToSubjectAction(input: z.input<typeof assignMealGroupSchema>) {
  const payload = assignMealGroupSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assign",
    payload: {
      meal_group_id: payload.meal_group_id,
      subject_user_id: payload.subject.subject_user_id ?? null,
      subject_client_id: payload.subject.subject_client_id ?? null,
      start_date: payload.start_date,
      end_date: payload.end_date,
    },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = normalizeSubject(payload.subject);

      const { data: sourceGroup } = await supabase.from("meal_groups").select("name").eq("id", payload.meal_group_id).maybeSingle();

      const snapshot = await cloneMealGroup(supabase, user.id, payload.meal_group_id, {
        name: `Assigned • ${new Date().toLocaleDateString()}`,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: "active",
        is_snapshot: true,
        source_group_id: payload.meal_group_id,
      });

      const assignmentInsert: MealAssignmentInsert = {
        template_group_id: payload.meal_group_id,
        meal_group_id: snapshot.id,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        assigned_by_user_id: user.id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        status: "active",
        notes: payload.notes || null,
      };

      const { data: assignment, error } = await supabase.from("meal_group_assignments").insert(assignmentInsert).select("*").single();
      if (error) throw new Error(error.message);

      activityContext = {
        meal_group_id: payload.meal_group_id,
        group_name: sourceGroup?.name ?? null,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
      };
      revalidateMealGroupPaths(payload.meal_group_id, subject.subject_client_id);
      revalidateMealGroupPaths(snapshot.id, subject.subject_client_id);
      return {
        assignment,
        snapshot_group_id: snapshot.id,
      };
    },
  });
}

export async function updateMealGroupAssignmentAction(input: z.input<typeof updateAssignmentDatesSchema>) {
  const payload = updateAssignmentDatesSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assignment.update",
    payload: { assignment_id: payload.assignment_id },
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("meal_group_assignments")
        .update({
          start_date: payload.start_date,
          end_date: payload.end_date,
          notes: payload.notes || null,
          status: payload.status,
        })
        .eq("id", payload.assignment_id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      activityContext = {
        assignment_id: data.id,
        meal_group_id: data.template_group_id,
        subject_user_id: data.subject_user_id,
        subject_client_id: data.subject_client_id,
      };
      revalidateMealGroupPaths(data.template_group_id, data.subject_client_id);
      revalidateMealGroupPaths(data.meal_group_id, data.subject_client_id);
      return data as MealAssignmentRow;
    },
  });
}

export async function archiveMealGroupAssignmentAction(input: z.input<typeof archiveAssignmentSchema>) {
  const payload = archiveAssignmentSchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assignment.archive",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      const { supabase } = await requireActor();
      const { data, error } = await supabase
        .from("meal_group_assignments")
        .update({ status: "archived" })
        .eq("id", payload.assignment_id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      activityContext = {
        assignment_id: data.id,
        meal_group_id: data.template_group_id,
        subject_user_id: data.subject_user_id,
        subject_client_id: data.subject_client_id,
      };
      revalidateMealGroupPaths(data.template_group_id, data.subject_client_id);
      revalidateMealGroupPaths(data.meal_group_id, data.subject_client_id);
      return { success: true };
    },
  });
}

export async function listMealGroupAssignmentsAction(input: z.input<typeof listAssignmentsSchema>) {
  const payload = listAssignmentsSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assignments.list",
    payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = payload.subject ? normalizeSubject(payload.subject) : { subject_user_id: user.id, subject_client_id: null };

      let query = supabase.from("meal_group_assignments").select("*").order("created_at", { ascending: false });
      if (payload.status !== "all") query = query.eq("status", payload.status);
      if (subject.subject_user_id) query = query.eq("subject_user_id", subject.subject_user_id).is("subject_client_id", null);
      if (subject.subject_client_id) query = query.eq("subject_client_id", subject.subject_client_id).is("subject_user_id", null);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const assignments = (data || []) as MealAssignmentRow[];
      const mealGroupIds = Array.from(new Set(assignments.flatMap((row) => [row.meal_group_id, row.template_group_id])));
      const clientIds = Array.from(new Set(assignments.map((row) => row.subject_client_id).filter((value): value is string => Boolean(value))));
      const userIds = Array.from(new Set(assignments.map((row) => row.subject_user_id).filter((value): value is string => Boolean(value))));

      const [groupsRes, clientsRes, usersRes] = await Promise.all([
        mealGroupIds.length
          ? supabase.from("meal_groups").select("id, name, status, start_date, end_date, is_snapshot, source_group_id").in("id", mealGroupIds)
          : Promise.resolve({ data: [], error: null }),
        clientIds.length ? supabase.from("clients").select("id, display_name, first_name, last_name, linked_user_id").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
        userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (groupsRes.error) throw new Error(groupsRes.error.message);
      if (clientsRes.error) throw new Error(clientsRes.error.message);
      if (usersRes.error) throw new Error(usersRes.error.message);

      const groupsById = new Map((groupsRes.data || []).map((group) => [group.id, group]));
      const clientsById = new Map((clientsRes.data || []).map((client) => [client.id, client]));
      const usersById = new Map((usersRes.data || []).map((profile) => [profile.id, profile]));

      const rows: MealAssignmentView[] = assignments.map((assignment) => ({
        ...assignment,
        meal_group: groupsById.get(assignment.meal_group_id) || null,
        template_group: groupsById.get(assignment.template_group_id) || null,
        subject_client: assignment.subject_client_id ? clientsById.get(assignment.subject_client_id) || null : null,
        subject_user: assignment.subject_user_id ? usersById.get(assignment.subject_user_id) || null : null,
      }));
      return rows;
    },
  });
}
