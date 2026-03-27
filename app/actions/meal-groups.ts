"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { nextSequentialPosition } from "@/lib/nutrition/meal-ui";
import { mealUnitInputSchema } from "@/lib/nutrition/meal-units";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { escapeLikePattern } from "@/lib/utils/search";
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
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AssigneeClientLookupRow = Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name" | "linked_user_id">;
type AssigneeProfileLookupRow = Pick<ProfileRow, "id" | "full_name">;

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

const listMealGroupAssigneesSchema = z.object({
  meal_group_id: z.string().uuid(),
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(15),
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

const copyMealPlanDaySchema = z.object({
  meal_group_id: z.string().uuid(),
  source_day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  target_day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
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

const toggleMealGroupPublicShareSchema = z.object({
  meal_group_id: z.string().uuid(),
  is_public: z.boolean(),
});

const listAssignmentsSchema = z.object({
  subject: subjectSchema.optional(),
  status: z.enum(["all", "active", "paused", "completed", "archived"]).default("active"),
});

export type MealGroupListRow = MealGroupRow & {
  assignment_count: number;
  plans_count: number;
  assignee_preview: MealGroupAssigneePreview[];
};

export type MealGroupAssigneeOption = {
  id: string;
  full_name: string;
  linked_user_id: string | null;
  is_self?: boolean;
};

export type MealGroupAssigneePreview = {
  id: string;
  name: string;
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

export type PublicMealGroupDetail = {
  group: Pick<
    MealGroupRow,
    "id" | "name" | "description" | "notes" | "start_date" | "end_date" | "status" | "is_public"
  >;
  plans: MealGroupDayPlan[];
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

function formatClientLabel(client: Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name">) {
  if (client.display_name?.trim()) return client.display_name.trim();
  const fallback = `${client.first_name} ${client.last_name || ""}`.trim();
  if (fallback) return fallback;
  return `Client ${client.id.slice(0, 8)}`;
}

function formatProfileLabel(profile: Pick<ProfileRow, "id" | "full_name">) {
  if (profile.full_name?.trim()) return profile.full_name.trim();
  return `User ${profile.id.slice(0, 8)}`;
}

function matchesSelfOption(search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return normalized.includes("me") || normalized.includes("self") || normalized.includes("my");
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

async function requireMealGroupAccess(mealGroupId: string): Promise<{
  supabase: SupabaseServerClient;
  user: { id: string };
  group: Pick<MealGroupRow, "id" | "owner_user_id" | "start_date" | "end_date" | "is_snapshot">;
}> {
  const { supabase, user } = await requireActor();
  const { data: group, error: groupError } = await supabase
    .from("meal_groups")
    .select("id, owner_user_id, start_date, end_date, is_snapshot")
    .eq("id", mealGroupId)
    .maybeSingle();
  if (groupError) throw new Error(groupError.message);
  if (!group) throw new Error("Meal group not found or unauthorized.");
  return { supabase, user: { id: user.id }, group };
}

function revalidateAssignmentMealGroupPaths(
  assignment: Pick<MealAssignmentRow, "template_group_id" | "meal_group_id" | "subject_client_id">
) {
  revalidateMealGroupPaths(assignment.template_group_id, assignment.subject_client_id);
  revalidateMealGroupPaths(assignment.meal_group_id, assignment.subject_client_id);
}

function buildAssignmentActivityContext(
  assignment: Pick<MealAssignmentRow, "id" | "template_group_id" | "subject_user_id" | "subject_client_id">
) {
  return {
    assignment_id: assignment.id,
    meal_group_id: assignment.template_group_id,
    subject_user_id: assignment.subject_user_id,
    subject_client_id: assignment.subject_client_id,
  };
}

async function loadAssigneeLookupMaps(
  supabase: SupabaseServerClient,
  clientIds: string[],
  userIds: string[]
): Promise<{
  clientsById: Map<string, AssigneeClientLookupRow>;
  profilesById: Map<string, AssigneeProfileLookupRow>;
}> {
  const [clientsRes, profilesRes] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("clients").select("id, display_name, first_name, last_name, linked_user_id").in("id", clientIds)
      : Promise.resolve({ data: [] as AssigneeClientLookupRow[], error: null }),
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as AssigneeProfileLookupRow[], error: null }),
  ]);
  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  return {
    clientsById: new Map((clientsRes.data || []).map((client) => [client.id, client] as const)),
    profilesById: new Map((profilesRes.data || []).map((profile) => [profile.id, profile] as const)),
  };
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
  const admin = createAdminClient();
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

  let writeClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> = supabase;
  let newGroup: MealGroupRow | null = null;
  const { data: insertedGroup, error: newGroupError } = await supabase.from("meal_groups").insert(newGroupInsert).select("*").single();
  if (newGroupError) {
    if (!isRlsInsertError(newGroupError)) {
      throw new Error(newGroupError.message);
    }
    const { data: adminGroup, error: adminGroupError } = await admin.from("meal_groups").insert(newGroupInsert).select("*").single();
    if (adminGroupError) throw new Error(adminGroupError.message);
    newGroup = adminGroup;
    writeClient = admin;
  } else {
    newGroup = insertedGroup;
  }
  if (!newGroup) throw new Error("Unable to create meal group snapshot.");

  const sortedPlans = orderPlans(sourcePlans);
  const planInserts: MealPlanInsert[] = sortedPlans.map((plan) => ({
    meal_group_id: newGroup.id,
    day_of_week: plan.day_of_week,
    label: plan.label,
    notes: plan.notes,
    created_by_user_id: actorId,
  }));
  const { data: insertedPlans, error: insertPlansError } = await writeClient.from("meal_group_plans").insert(planInserts).select("*");
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
      const { error: insertPlanTypesError } = await writeClient.from("meal_group_plan_types").insert(planTypeInserts);
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
      const { error: insertItemsError } = await writeClient.from("meal_group_items").insert(itemInserts);
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
      if (payload.search) query = query.ilike("name", `%${escapeLikePattern(payload.search)}%`);

      const { data, error, count } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const groups = (data || []) as MealGroupRow[];
      const groupIds = groups.map((group) => group.id);
      if (groupIds.length === 0) {
        return { rows: [] as MealGroupListRow[], total: 0, page: payload.page, page_size: payload.page_size, has_more: false };
      }

      const [{ data: plans, error: plansError }, { data: assignments, error: assignmentsError }] = await Promise.all([
        supabase.from("meal_group_plans").select("id, meal_group_id").in("meal_group_id", groupIds),
        supabase
          .from("meal_group_assignments")
          .select("id, template_group_id, meal_group_id, subject_client_id, subject_user_id, status")
          .in("template_group_id", groupIds)
          .in("status", ["active", "paused"])
          .order("created_at", { ascending: false }),
      ]);
      if (plansError && !isMissingRelationError(plansError)) throw new Error(plansError.message);
      if (assignmentsError && !isMissingRelationError(assignmentsError)) throw new Error(assignmentsError.message);

      const plansByGroup = new Map<string, number>();
      for (const row of plans || []) plansByGroup.set(row.meal_group_id, (plansByGroup.get(row.meal_group_id) || 0) + 1);

      const assignmentRows = (assignments || []) as Array<
        Pick<
          MealAssignmentRow,
          "id" | "template_group_id" | "meal_group_id" | "subject_client_id" | "subject_user_id" | "status"
        >
      >;
      const assignmentsByTemplate = new Map<string, number>();
      const assignmentRowsByTemplate = new Map<string, typeof assignmentRows>();
      const clientIds = new Set<string>();
      const userIds = new Set<string>();
      for (const row of assignmentRows) {
        assignmentsByTemplate.set(row.template_group_id, (assignmentsByTemplate.get(row.template_group_id) || 0) + 1);
        assignmentRowsByTemplate.set(row.template_group_id, [...(assignmentRowsByTemplate.get(row.template_group_id) || []), row]);
        if (row.subject_client_id) clientIds.add(row.subject_client_id);
        if (row.subject_user_id) userIds.add(row.subject_user_id);
      }

      const { clientsById, profilesById } = await loadAssigneeLookupMaps(
        supabase,
        Array.from(clientIds),
        Array.from(userIds)
      );

      const rows: MealGroupListRow[] = groups.map((group) => ({
        ...group,
        assignment_count: assignmentsByTemplate.get(group.id) || 0,
        plans_count: plansByGroup.get(group.id) || 0,
        assignee_preview: (() => {
          const preview: MealGroupAssigneePreview[] = [];
          const seen = new Set<string>();
          const templateAssignments = assignmentRowsByTemplate.get(group.id) || [];

          for (const assignment of templateAssignments) {
            if (assignment.subject_client_id) {
              const key = `client:${assignment.subject_client_id}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const client = clientsById.get(assignment.subject_client_id);
              preview.push({
                id: key,
                name: client ? formatClientLabel(client) : `Client ${assignment.subject_client_id.slice(0, 8)}`,
              });
            } else if (assignment.subject_user_id) {
              const key = `user:${assignment.subject_user_id}`;
              if (seen.has(key)) continue;
              seen.add(key);
              const profile = profilesById.get(assignment.subject_user_id);
              preview.push({
                id: key,
                name: profile ? formatProfileLabel(profile) : `User ${assignment.subject_user_id.slice(0, 8)}`,
              });
            }
            if (preview.length >= 3) break;
          }

          return preview;
        })(),
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

export async function listMealGroupAssigneesAction(input: z.input<typeof listMealGroupAssigneesSchema>) {
  const payload = listMealGroupAssigneesSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.meal-groups.assignees.list",
    payload: {
      meal_group_id: payload.meal_group_id,
      page: payload.page,
      page_size: payload.page_size,
      has_search: Boolean(payload.search?.trim()),
    },
    action: async () => {
      const { supabase, user, group } = await requireMealGroupAccess(payload.meal_group_id);
      const search = payload.search?.trim() || "";

      const { data: actorProfile, error: actorProfileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (actorProfileError) throw new Error(actorProfileError.message);
      const actorIsSysadmin = actorProfile?.role === "sysadmin";
      if (!actorIsSysadmin && group.owner_user_id !== user.id) throw new Error("Unauthorized");

      let query = supabase
        .from("clients")
        .select("id, display_name, first_name, last_name, linked_user_id, status, is_archived, created_at")
        .eq("is_archived", false)
        .neq("status", "archived")
        .order("display_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!actorIsSysadmin) {
        query = query.eq("primary_coach_id", user.id);
      }

      if (search) {
        const safeSearch = escapeLikePattern(search);
        query = query.or(
          `display_name.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%`
        );
      }

      // Query one extra row to infer "has_more" without a costly COUNT(*).
      const from = payload.page * payload.page_size;
      const to = from + payload.page_size;
      const { data, error } = await query.range(from, to);
      if (error) throw new Error(error.message);

      const rows = (data || []) as Array<
        Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name" | "linked_user_id">
      >;
      const hasMore = rows.length > payload.page_size;
      const pageRows = hasMore ? rows.slice(0, payload.page_size) : rows;
      const selfName = actorProfile?.full_name?.trim() || "Myself";
      const includeSelf = payload.page === 0 && matchesSelfOption(search);
      const selfOption = includeSelf
        ? [
            {
              id: "self",
              full_name: selfName,
              linked_user_id: user.id,
              is_self: true,
            } satisfies MealGroupAssigneeOption,
          ]
        : [];

      return {
        items: [
          ...selfOption,
          ...pageRows.map((row) => ({
            id: row.id,
            full_name: formatClientLabel(row),
            linked_user_id: row.linked_user_id,
          })),
        ],
        page: payload.page,
        page_size: payload.page_size,
        has_more: hasMore,
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

export async function getPublicMealGroupAction(shareToken: string) {
  const payload = z.string().uuid().parse(shareToken);
  return runTrackedAction({
    eventName: "nutrition.meal-groups.public.read",
    payload: { share_token: payload },
    action: async () => {
      const admin = createAdminClient();
      const { data: group, error: groupError } = await admin
        .from("meal_groups")
        .select("id, name, description, notes, start_date, end_date, status, is_public")
        .eq("public_share_token", payload)
        .eq("is_public", true)
        .eq("is_snapshot", false)
        .maybeSingle();
      if (groupError) throw new Error(groupError.message);
      if (!group) return null;

      const [{ data: plans, error: plansError }, { data: items, error: itemsError }, { data: planTypes, error: planTypesError }] =
        await Promise.all([
          admin.from("meal_group_plans").select("*").eq("meal_group_id", group.id),
          admin
            .from("meal_group_items")
            .select("*, meal_group_plans!inner(id, meal_group_id)")
            .eq("meal_group_plans.meal_group_id", group.id)
            .order("position", { ascending: true }),
          admin
            .from("meal_group_plan_types")
            .select("*, meal_group_plans!inner(id, meal_group_id)")
            .eq("meal_group_plans.meal_group_id", group.id)
            .order("position", { ascending: true }),
        ]);
      if (plansError) throw new Error(plansError.message);
      if (itemsError) throw new Error(itemsError.message);
      if (planTypesError && !isMissingRelationError(planTypesError)) {
        throw new Error(planTypesError.message);
      }

      const itemByPlan = new Map<string, MealItemRow[]>();
      for (const row of ((items || []) as Array<MealItemRow>)) {
        itemByPlan.set(row.meal_plan_id, [...(itemByPlan.get(row.meal_plan_id) || []), row]);
      }

      const typeByPlan = new Map<string, MealPlanTypeRow[]>();
      for (const row of ((planTypes || []) as Array<MealPlanTypeRow>)) {
        typeByPlan.set(row.meal_plan_id, [...(typeByPlan.get(row.meal_plan_id) || []), row]);
      }

      const detailPlans: MealGroupDayPlan[] = orderPlans((plans || []) as MealPlanRow[]).map((plan) => {
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

      return {
        group,
        plans: detailPlans,
      } satisfies PublicMealGroupDetail;
    },
  });
}

export async function toggleMealGroupPublicShareAction(
  input: z.input<typeof toggleMealGroupPublicShareSchema>
) {
  const payload = toggleMealGroupPublicShareSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.meal-groups.share.toggle",
    payload,
    action: async () => {
      const { supabase } = await requireMealGroupAccess(payload.meal_group_id);
      const { data, error } = await supabase
        .from("meal_groups")
        .update({ is_public: payload.is_public })
        .eq("id", payload.meal_group_id)
        .select("id, is_public, public_share_token")
        .single();
      if (error) throw new Error(error.message);
      revalidateMealGroupPaths(payload.meal_group_id);
      return data;
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

export async function copyMealPlanDayAction(input: z.input<typeof copyMealPlanDaySchema>) {
  const payload = copyMealPlanDaySchema.parse(input);
  let activityContext: Record<string, unknown> = {};
  return runTrackedAction({
    eventName: "nutrition.meal-plan.day.copy",
    payload,
    getSuccessPayload: () => activityContext,
    action: async () => {
      if (payload.source_day === payload.target_day) {
        throw new Error("Choose a different day to copy from.");
      }

      const { supabase, user } = await requireActor();

      const { data: plans, error: plansError } = await supabase
        .from("meal_group_plans")
        .select("id, meal_group_id, day_of_week")
        .eq("meal_group_id", payload.meal_group_id)
        .in("day_of_week", [payload.source_day, payload.target_day]);
      if (plansError) throw new Error(plansError.message);

      const sourcePlan = (plans || []).find((plan) => plan.day_of_week === payload.source_day) || null;
      const targetPlan = (plans || []).find((plan) => plan.day_of_week === payload.target_day) || null;
      if (!sourcePlan || !targetPlan) {
        throw new Error("Unable to resolve planner days for copy.");
      }

      const { data: sourceItems, error: sourceItemsError } = await supabase
        .from("meal_group_items")
        .select("*")
        .eq("meal_plan_id", sourcePlan.id)
        .order("position", { ascending: true });
      if (sourceItemsError) throw new Error(sourceItemsError.message);
      if (!sourceItems || sourceItems.length === 0) {
        return {
          copied_count: 0,
          source_day: payload.source_day,
          target_day: payload.target_day,
        };
      }

      const { data: maxPosition, error: maxPositionError } = await supabase
        .from("meal_group_items")
        .select("position")
        .eq("meal_plan_id", targetPlan.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxPositionError) throw new Error(maxPositionError.message);

      const positionOffset = maxPosition?.position || 0;
      const inserts: MealItemInsert[] = sourceItems.map((item, index) => ({
        meal_plan_id: targetPlan.id,
        type: item.type,
        title: item.title,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        notes: item.notes,
        quantity: item.quantity,
        unit: item.unit,
        planned_date: item.planned_date,
        planned_time: item.planned_time,
        position: positionOffset + index + 1,
        created_by_user_id: user.id,
      }));

      const { error: insertError } = await supabase.from("meal_group_items").insert(inserts);
      if (insertError) throw new Error(insertError.message);

      activityContext = {
        meal_group_id: payload.meal_group_id,
        source_day: payload.source_day,
        target_day: payload.target_day,
        copied_count: inserts.length,
      };
      revalidateMealGroupPaths(payload.meal_group_id);
      return {
        copied_count: inserts.length,
        source_day: payload.source_day,
        target_day: payload.target_day,
      };
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

      const { data: existingAssignment, error: existingAssignmentError } = await supabase
        .from("meal_group_assignments")
        .select("id, subject_user_id, subject_client_id")
        .eq("template_group_id", payload.meal_group_id)
        .in("status", ["active", "paused"])
        .limit(1)
        .maybeSingle();
      if (existingAssignmentError) throw new Error(existingAssignmentError.message);
      if (existingAssignment) {
        const assignedToSameSubject =
          (existingAssignment.subject_user_id && existingAssignment.subject_user_id === subject.subject_user_id) ||
          (existingAssignment.subject_client_id && existingAssignment.subject_client_id === subject.subject_client_id);
        if (assignedToSameSubject) {
          throw new Error("This meal program is already assigned to this person.");
        }
        throw new Error("This meal program is already assigned to another person. Archive or complete it before reassigning.");
      }

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
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("This meal program is already assigned. Archive or complete it before reassigning.");
        }
        throw new Error(error.message);
      }

      activityContext = {
        meal_group_id: payload.meal_group_id,
        group_name: sourceGroup?.name ?? null,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
      };
      revalidateAssignmentMealGroupPaths({
        template_group_id: payload.meal_group_id,
        meal_group_id: snapshot.id,
        subject_client_id: subject.subject_client_id,
      });
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
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("This meal program is already assigned to another person.");
        }
        throw new Error(error.message);
      }
      activityContext = buildAssignmentActivityContext(data);
      revalidateAssignmentMealGroupPaths(data);
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
      activityContext = buildAssignmentActivityContext(data);
      revalidateAssignmentMealGroupPaths(data);
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

      const [groupsRes] = await Promise.all([
        mealGroupIds.length
          ? supabase.from("meal_groups").select("id, name, status, start_date, end_date, is_snapshot, source_group_id").in("id", mealGroupIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (groupsRes.error) throw new Error(groupsRes.error.message);

      const groupsById = new Map((groupsRes.data || []).map((group) => [group.id, group]));
      const { clientsById, profilesById: usersById } = await loadAssigneeLookupMaps(supabase, clientIds, userIds);

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
