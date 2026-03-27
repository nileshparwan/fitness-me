"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { SUPPLEMENT_UNIT_VALUES, normalizeSupplementDisplayName } from "@/lib/nutrition/supplements";
import { createClient } from "@/lib/supabase/server";
import { escapeLikePattern } from "@/lib/utils/search";
import type { Database } from "@/types/database";

type SupplementCatalogRow = Database["public"]["Tables"]["supplement_catalog"]["Row"];
type SupplementCatalogInsert = Database["public"]["Tables"]["supplement_catalog"]["Insert"];
type SupplementCatalogUpdate = Database["public"]["Tables"]["supplement_catalog"]["Update"];
type SupplementAssignmentRowDb = Database["public"]["Tables"]["supplement_assignments"]["Row"];
type SupplementAssignmentInsert = Database["public"]["Tables"]["supplement_assignments"]["Insert"];
type SupplementAssignmentUpdate = Database["public"]["Tables"]["supplement_assignments"]["Update"];
type SupplementSubjectProfileRow = Database["public"]["Tables"]["supplement_subject_profiles"]["Row"];
type SupplementSubjectProfileInsert = Database["public"]["Tables"]["supplement_subject_profiles"]["Insert"];
type SupplementSubjectProfileUpdate = Database["public"]["Tables"]["supplement_subject_profiles"]["Update"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ActorProfileLite = Pick<ProfileRow, "id" | "full_name" | "avatar_url">;
type ClientLite = Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name">;

export type SupplementCategory =
  | "vitamin"
  | "mineral"
  | "omega"
  | "protein"
  | "electrolyte"
  | "herbal"
  | "other";

export type SupplementSubject = { type: "me" } | { type: "client"; id: string };

export type SupplementProfileStatus = "active" | "inactive" | "archived" | "completed";

type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

export type SupplementSubjectRow = {
  profile_id: string;
  status: SupplementProfileStatus;
  subject_type: "user" | "client";
  subject_id: string;
  display_name: string;
  avatar_url: string | null;
  supplement_count: number;
  title: string | null;
  workout_program: string | null;
  nutrition_program: string | null;
  last_updated_at: string | null;
};

export type SupplementPersonOption = {
  subject_type: "user" | "client";
  subject: SupplementSubject;
  display_name: string;
  avatar_url: string | null;
};

export type SupplementProgramOption = {
  id: string;
  label: string;
  kind: "workout" | "nutrition";
};

export type SupplementAssignmentRow = {
  id: string;
  supplement_id: string;
  supplement_name: string;
  brand: string | null;
  category: SupplementCategory;
  categories: SupplementCategory[];
  nutrients: Record<string, number>;
  default_servings: number;
  unit: string | null;
  updated_at: string;
};

const categorySchema = z.enum([
  "vitamin",
  "mineral",
  "omega",
  "protein",
  "electrolyte",
  "herbal",
  "other",
]);

const supplementUnitSchema = z.enum(SUPPLEMENT_UNIT_VALUES);
const profileStatusSchema = z.enum(["active", "inactive", "archived", "completed"]);

const subjectSchema: z.ZodType<SupplementSubject> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("me") }),
  z.object({ type: z.literal("client"), id: z.string().uuid() }),
]);

const listCatalogSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: categorySchema.optional(),
});

const createCustomSupplementSchema = z.object({
  name: z.string().trim().min(2).max(180),
  categories: z.array(categorySchema).min(1).max(7),
});

const updateCustomSupplementSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(180),
  categories: z.array(categorySchema).min(1).max(7),
});

const listAssignmentsSchema = z.object({
  subject: subjectSchema,
  profile_id: z.string().uuid().optional(),
});

const listProgramOptionsSchema = z.object({
  subject: subjectSchema,
});

const addAssignmentSchema = z.object({
  subject: subjectSchema,
  profile_id: z.string().uuid().optional(),
  supplement_id: z.string().uuid(),
  default_servings: z.number().min(0.1).max(5000).optional(),
  unit: supplementUnitSchema.optional(),
  title: z.string().trim().max(180).optional(),
  workout_program: z.string().trim().max(180).optional(),
  nutrition_program: z.string().trim().max(180).optional(),
  status: profileStatusSchema.optional(),
});

const addBulkAssignmentsSchema = z.object({
  subject: subjectSchema,
  profile_id: z.string().uuid().optional(),
  supplement_ids: z.array(z.string().uuid()).min(1).max(120),
  default_servings: z.number().min(0.1).max(5000).optional(),
  unit: supplementUnitSchema.optional(),
  title: z.string().trim().max(180).optional(),
  workout_program: z.string().trim().max(180).optional(),
  nutrition_program: z.string().trim().max(180).optional(),
  status: profileStatusSchema.optional(),
});

const updateAssignmentSchema = z
  .object({
    id: z.string().uuid(),
    default_servings: z.number().min(0.1).max(5000).optional(),
    unit: supplementUnitSchema.nullish(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => {
    const keys: Array<keyof typeof value> = ["default_servings", "unit", "is_active"];
    return keys.some((key) => value[key] !== undefined);
  }, "No assignment changes provided");

const removeStackSchema = z.object({
  profile_id: z.string().uuid(),
});

function safeName(input?: string | null, fallback = "Unknown") {
  const value = input?.trim();
  return value ? value : fallback;
}

function trimToNullable(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function maxIsoDate(a?: string | null, b?: string | null): string | null {
  if (!a && !b) return null;
  if (!a) return b || null;
  if (!b) return a;
  return a >= b ? a : b;
}

function formatClientName(client: Pick<ClientRow, "display_name" | "first_name" | "last_name">) {
  return (
    client.display_name?.trim() ||
    `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
    "Client"
  );
}

function profileName(profile: Pick<ProfileRow, "full_name"> | null | undefined) {
  return safeName(profile?.full_name, "You");
}

function normalizeNutrients(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const numberValue = Number(raw);
    if (!Number.isFinite(numberValue)) continue;
    output[key] = numberValue;
  }
  return output;
}

function readCategories(row: Pick<SupplementCatalogRow, "category"> & { categories?: unknown }): SupplementCategory[] {
  const fromArray = row.categories;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    const values = fromArray
      .map((item) => String(item))
      .filter((item): item is SupplementCategory => categorySchema.safeParse(item).success);
    if (values.length > 0) return Array.from(new Set(values));
  }

  if (categorySchema.safeParse(row.category).success) {
    return [row.category as SupplementCategory];
  }

  return ["other"];
}

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

async function loadActorProfileAndClients(
  supabase: SupabaseServerClient,
  actorUserId: string,
  clientLimit: number
): Promise<{ profile: ActorProfileLite | null; clients: ClientLite[] }> {
  const [{ data: profile, error: profileError }, { data: clients, error: clientsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("id", actorUserId).maybeSingle(),
    supabase
      .from("clients")
      .select("id, display_name, first_name, last_name")
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(clientLimit),
  ]);

  if (profileError) throw new Error(profileError.message);
  if (clientsError) throw new Error(clientsError.message);

  return {
    profile: (profile || null) as ActorProfileLite | null,
    clients: (clients || []) as ClientLite[],
  };
}

function resolveSubject(subject: SupplementSubject, actorUserId: string): SubjectRef {
  if (subject.type === "me") {
    return {
      subject_user_id: actorUserId,
      subject_client_id: null,
    };
  }

  return {
    subject_user_id: null,
    subject_client_id: subject.id,
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

function toSubjectRef(row: { subject_user_id: string | null; subject_client_id: string | null }): SubjectRef {
  return {
    subject_user_id: row.subject_user_id,
    subject_client_id: row.subject_client_id,
  };
}

async function getAssignmentSubjectRefById(supabase: SupabaseServerClient, assignmentId: string): Promise<SubjectRef> {
  const { data: existing, error: existingError } = await supabase
    .from("supplement_assignments")
    .select("id, subject_user_id, subject_client_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Supplement assignment not found");
  return toSubjectRef(existing);
}

async function getSubjectProfileRefById(supabase: SupabaseServerClient, profileId: string): Promise<SubjectRef> {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("supplement_subject_profiles")
    .select("id, subject_user_id, subject_client_id")
    .eq("id", profileId)
    .maybeSingle();
  if (existingProfileError) throw new Error(existingProfileError.message);
  if (!existingProfile) throw new Error("Assigned supplement stack not found");
  return toSubjectRef(existingProfile);
}

async function ensureSubjectProfile(
  supabase: SupabaseServerClient,
  actorUserId: string,
  subject: SubjectRef,
  input: {
    profile_id?: string;
    title?: string | null;
    workout_program?: string | null;
    nutrition_program?: string | null;
    status?: SupplementProfileStatus;
  }
): Promise<string> {
  const nextTitle = trimToNullable(input.title);
  const nextWorkoutProgram = trimToNullable(input.workout_program);
  const nextNutritionProgram = trimToNullable(input.nutrition_program);

  if (input.profile_id) {
    let profileQuery = supabase
      .from("supplement_subject_profiles")
      .select("id")
      .eq("id", input.profile_id)
      .limit(1)
      .maybeSingle();
    profileQuery = applySubjectFilters(profileQuery, subject);

    const { data: existingProfile, error: existingProfileError } = await profileQuery;
    if (existingProfileError) throw new Error(existingProfileError.message);
    if (!existingProfile) throw new Error("Supplement row not found");

    const hasProfileMetadataUpdate =
      nextTitle !== undefined ||
      nextWorkoutProgram !== undefined ||
      nextNutritionProgram !== undefined ||
      input.status !== undefined;

    if (hasProfileMetadataUpdate) {
      const updates: SupplementSubjectProfileUpdate = {
        updated_by: actorUserId,
      };
      if (nextTitle !== undefined) updates.title = nextTitle;
      if (nextWorkoutProgram !== undefined) updates.workout_program = nextWorkoutProgram;
      if (nextNutritionProgram !== undefined) updates.nutrition_program = nextNutritionProgram;
      if (input.status !== undefined) updates.status = input.status;

      const { error: updateError } = await supabase
        .from("supplement_subject_profiles")
        .update(updates)
        .eq("id", existingProfile.id);
      if (updateError) throw new Error(updateError.message);
    }

    return existingProfile.id;
  }

  const row: SupplementSubjectProfileInsert = {
    subject_user_id: subject.subject_user_id,
    subject_client_id: subject.subject_client_id,
    title: nextTitle ?? null,
    workout_program: nextWorkoutProgram ?? null,
    nutrition_program: nextNutritionProgram ?? null,
    status: input.status || "active",
    updated_by: actorUserId,
  };

  const { data: createdProfile, error: createProfileError } = await supabase
    .from("supplement_subject_profiles")
    .insert(row)
    .select("id")
    .single();
  if (createProfileError) throw new Error(createProfileError.message);

  return createdProfile.id;
}

function revalidateSupplementPaths(subject: SubjectRef) {
  revalidatePath("/supplements");
  revalidatePath("/supplements/assigned");
  revalidatePath("/supplements/assigned/me");
  if (subject.subject_client_id) {
    revalidatePath(`/supplements/assigned/${subject.subject_client_id}`);
  }
}

type CatalogRef = Pick<SupplementCatalogRow, "id" | "name" | "brand" | "category" | "categories" | "nutrients">;

type AssignmentWithCatalog = Pick<
  SupplementAssignmentRowDb,
  "id" | "supplement_id" | "default_servings" | "unit" | "updated_at"
> & {
  supplement: CatalogRef | null;
};

function assignmentToUiRow(row: AssignmentWithCatalog): SupplementAssignmentRow | null {
  const supplement = row.supplement;
  if (!supplement) return null;
  const categories = readCategories({
    category: supplement.category,
    categories: supplement.categories,
  });

  return {
    id: row.id,
    supplement_id: row.supplement_id,
    supplement_name: supplement.name,
    brand: supplement.brand,
    category: categories[0] || "other",
    categories,
    nutrients: normalizeNutrients(supplement.nutrients),
    default_servings: Number(row.default_servings || 1),
    unit: row.unit || null,
    updated_at: row.updated_at,
  };
}

export async function listSupplementCatalogAction(
  input: z.input<typeof listCatalogSchema> = {}
): Promise<SupplementCatalogRow[]> {
  const payload = listCatalogSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.catalog.list",
    payload: {
      search: payload.search ?? null,
      category: payload.category ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      let query = supabase
        .from("supplement_catalog")
        .select("*")
        .or(`is_global.eq.true,owner_user_id.eq.${user.id}`)
        .order("is_global", { ascending: false })
        .order("name", { ascending: true })
        .limit(400);

      if (payload.search) {
        const safe = escapeLikePattern(payload.search);
        query = query.ilike("name", `%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const rows = (data || []) as SupplementCatalogRow[];
      const categoryFiltered = payload.category
        ? rows.filter((row) => readCategories({ category: row.category, categories: row.categories }).includes(payload.category!))
        : rows;

      return categoryFiltered.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export async function createCustomSupplementAction(
  input: z.input<typeof createCustomSupplementSchema>
): Promise<{ id: string }> {
  const payload = createCustomSupplementSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.catalog.create-custom",
    payload: {
      name: payload.name,
      categories: payload.categories,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const normalizedName = normalizeSupplementDisplayName(payload.name);
      const categories = Array.from(new Set(payload.categories));
      const row: SupplementCatalogInsert = {
        name: normalizedName,
        brand: null,
        category: categories[0] || "other",
        categories,
        nutrients: {},
        is_global: false,
        owner_user_id: user.id,
      };

      const { data, error } = await supabase
        .from("supplement_catalog")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      revalidatePath("/supplements");
      return { id: data.id };
    },
  });
}

export async function updateCustomSupplementAction(
  input: z.input<typeof updateCustomSupplementSchema>
): Promise<{ id: string }> {
  const payload = updateCustomSupplementSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.catalog.update-custom",
    payload: {
      id: payload.id,
      name: payload.name,
      categories: payload.categories,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const normalizedName = normalizeSupplementDisplayName(payload.name);
      const categories = Array.from(new Set(payload.categories));
      const updates: SupplementCatalogUpdate = {
        name: normalizedName,
        category: categories[0] || "other",
        categories,
        brand: null,
        nutrients: {},
        is_global: false,
        owner_user_id: user.id,
      };

      const { data, error } = await supabase
        .from("supplement_catalog")
        .update(updates)
        .eq("id", payload.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Supplement not found or not editable");

      revalidatePath("/supplements");
      return { id: data.id };
    },
  });
}

export async function listSupplementPeopleAction(): Promise<SupplementPersonOption[]> {
  return runTrackedAction({
    eventName: "supplements.people.list",
    action: async () => {
      const { supabase, user } = await requireActor();
      const { profile, clients } = await loadActorProfileAndClients(supabase, user.id, 150);

      const rows: SupplementPersonOption[] = [
        {
          subject_type: "user",
          subject: { type: "me" },
          display_name: profileName(profile),
          avatar_url: profile?.avatar_url || null,
        },
      ];

      for (const client of clients || []) {
        rows.push({
          subject_type: "client",
          subject: { type: "client", id: client.id },
          display_name: formatClientName(client),
          avatar_url: null,
        });
      }

      return rows;
    },
  });
}

export async function listSupplementProgramOptionsAction(
  input: z.input<typeof listProgramOptionsSchema>
): Promise<SupplementProgramOption[]> {
  const payload = listProgramOptionsSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.programs.list",
    payload: payload.subject,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      const workoutQuery = subject.subject_client_id
        ? supabase
            .from("training_plans")
            .select("id, name")
            .eq("assigned_client_id", subject.subject_client_id)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(100)
        : supabase
            .from("training_plans")
            .select("id, name")
            .eq("user_id", user.id)
            .is("assigned_client_id", null)
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(100);

      let nutritionAssignmentsQuery = supabase
        .from("meal_group_assignments")
        .select("id, meal_group_id")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(150);
      nutritionAssignmentsQuery = applySubjectFilters(nutritionAssignmentsQuery, subject);

      const [{ data: workoutRows, error: workoutError }, { data: nutritionAssignmentRows, error: nutritionAssignmentsError }] =
        await Promise.all([workoutQuery, nutritionAssignmentsQuery]);

      if (workoutError) throw new Error(workoutError.message);
      if (nutritionAssignmentsError) throw new Error(nutritionAssignmentsError.message);

      const mealGroupIds = Array.from(
        new Set((nutritionAssignmentRows || []).map((row) => row.meal_group_id).filter((value): value is string => Boolean(value)))
      );

      const mealGroupsById = new Map<string, string>();
      if (mealGroupIds.length > 0) {
        const { data: mealGroups, error: mealGroupsError } = await supabase
          .from("meal_groups")
          .select("id, name")
          .in("id", mealGroupIds);
        if (mealGroupsError) throw new Error(mealGroupsError.message);
        for (const group of mealGroups || []) {
          mealGroupsById.set(group.id, safeName(group.name, "Nutrition Program"));
        }
      }

      const rows: SupplementProgramOption[] = [];
      for (const row of workoutRows || []) {
        rows.push({
          id: `workout:${row.id}`,
          label: safeName(row.name, "Workout Program"),
          kind: "workout",
        });
      }

      for (const row of nutritionAssignmentRows || []) {
        const name = mealGroupsById.get(row.meal_group_id);
        if (!name) continue;
        rows.push({
          id: `nutrition:${row.id}`,
          label: name,
          kind: "nutrition",
        });
      }

      const deduped = new Map<string, SupplementProgramOption>();
      for (const row of rows) {
        const key = `${row.kind}:${row.label.toLowerCase()}`;
        if (!deduped.has(key)) {
          deduped.set(key, row);
        }
      }

      return Array.from(deduped.values()).sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "workout" ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
    },
  });
}

export async function listSupplementSubjectsAction(): Promise<SupplementSubjectRow[]> {
  return runTrackedAction({
    eventName: "supplements.subjects.list",
    action: async () => {
      const { supabase, user } = await requireActor();
      const { profile, clients } = await loadActorProfileAndClients(supabase, user.id, 200);

      const [subjectProfileUserRes, subjectProfileClientRes] = await Promise.all([
        supabase
          .from("supplement_subject_profiles")
          .select("id, subject_user_id, subject_client_id, status, title, workout_program, nutrition_program, updated_at")
          .eq("subject_user_id", user.id)
          .is("subject_client_id", null)
          .order("updated_at", { ascending: false }),
        supabase
          .from("supplement_subject_profiles")
          .select("id, subject_user_id, subject_client_id, status, title, workout_program, nutrition_program, updated_at")
          .not("subject_client_id", "is", null)
          .order("updated_at", { ascending: false }),
      ]);

      if (subjectProfileUserRes.error) throw new Error(subjectProfileUserRes.error.message);
      if (subjectProfileClientRes.error) throw new Error(subjectProfileClientRes.error.message);

      const profileRows = [
        ...((subjectProfileUserRes.data || []) as Array<
          Pick<
            SupplementSubjectProfileRow,
            "id" | "subject_user_id" | "subject_client_id" | "status" | "title" | "workout_program" | "nutrition_program" | "updated_at"
          >
        >),
        ...((subjectProfileClientRes.data || []) as Array<
          Pick<
            SupplementSubjectProfileRow,
            "id" | "subject_user_id" | "subject_client_id" | "status" | "title" | "workout_program" | "nutrition_program" | "updated_at"
          >
        >),
      ];

      if (profileRows.length === 0) return [];

      const profileIds = profileRows.map((row) => row.id);
      const { data: assignmentRows, error: assignmentError } = await supabase
        .from("supplement_assignments")
        .select("subject_profile_id, updated_at")
        .eq("is_active", true)
        .in("subject_profile_id", profileIds)
        .limit(3000);

      if (assignmentError) throw new Error(assignmentError.message);

      const assignmentCountByProfile = new Map<string, number>();
      const assignmentUpdatedByProfile = new Map<string, string>();
      for (const row of assignmentRows || []) {
        const profileId = row.subject_profile_id;
        assignmentCountByProfile.set(profileId, (assignmentCountByProfile.get(profileId) || 0) + 1);
        assignmentUpdatedByProfile.set(profileId, maxIsoDate(assignmentUpdatedByProfile.get(profileId), row.updated_at) || "");
      }

      const clientById = new Map((clients || []).map((client) => [client.id, client] as const));

      const rows: SupplementSubjectRow[] = profileRows.map((row) => {
        const isUser = Boolean(row.subject_user_id);
        const subjectType: "user" | "client" = isUser ? "user" : "client";
        const subjectId = isUser ? row.subject_user_id! : row.subject_client_id!;
        const client = !isUser ? clientById.get(subjectId) : null;

        return {
          profile_id: row.id,
          status: profileStatusSchema.parse(row.status || "active"),
          subject_type: subjectType,
          subject_id: subjectId,
          display_name: isUser ? profileName(profile) : client ? formatClientName(client) : `Client ${subjectId.slice(0, 8)}`,
          avatar_url: isUser ? profile?.avatar_url || null : null,
          supplement_count: assignmentCountByProfile.get(row.id) || 0,
          title: row.title,
          workout_program: row.workout_program,
          nutrition_program: row.nutrition_program,
          last_updated_at: maxIsoDate(row.updated_at, assignmentUpdatedByProfile.get(row.id)),
        };
      });

      rows.sort((a, b) => {
        if (a.subject_type !== b.subject_type) return a.subject_type === "user" ? -1 : 1;
        const nameOrder = a.display_name.localeCompare(b.display_name);
        if (nameOrder !== 0) return nameOrder;
        return (b.last_updated_at || "").localeCompare(a.last_updated_at || "");
      });

      return rows;
    },
  });
}

export async function listAssignmentsAction(
  input: z.input<typeof listAssignmentsSchema>
): Promise<SupplementAssignmentRow[]> {
  const payload = listAssignmentsSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.assignments.list",
    payload: payload,
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      let query = supabase
        .from("supplement_assignments")
        .select(
          "id, supplement_id, default_servings, unit, updated_at, supplement:supplement_catalog(id, name, brand, category, categories, nutrients)"
        )
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });
      query = applySubjectFilters(query, subject);
      if (payload.profile_id) {
        query = query.eq("subject_profile_id", payload.profile_id);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const assignments = (data || []) as unknown as AssignmentWithCatalog[];
      if (assignments.length === 0) return [];

      const rows = assignments
        .map((row) => assignmentToUiRow(row))
        .filter((row): row is SupplementAssignmentRow => Boolean(row));

      rows.sort((a, b) => a.supplement_name.localeCompare(b.supplement_name));
      return rows;
    },
  });
}

export async function addSupplementAssignmentAction(
  input: z.input<typeof addAssignmentSchema>
): Promise<{ id: string }> {
  const payload = addAssignmentSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.assignments.add",
    payload: {
      ...payload.subject,
      supplement_id: payload.supplement_id,
      profile_id: payload.profile_id ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      const { data: supplement, error: supplementError } = await supabase
        .from("supplement_catalog")
        .select("id")
        .eq("id", payload.supplement_id)
        .maybeSingle();
      if (supplementError) throw new Error(supplementError.message);
      if (!supplement) throw new Error("Supplement not found");

      const profileId = await ensureSubjectProfile(supabase, user.id, subject, {
        profile_id: payload.profile_id,
        title: payload.title,
        workout_program: payload.workout_program,
        nutrition_program: payload.nutrition_program,
        status: payload.status,
      });

      const { data: existing, error: existingError } = await supabase
        .from("supplement_assignments")
        .select("id")
        .eq("subject_profile_id", profileId)
        .eq("supplement_id", payload.supplement_id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      if (existing) {
        const updates: SupplementAssignmentUpdate = {
          default_servings: payload.default_servings ?? 1,
          unit: payload.unit || null,
          is_active: true,
          assigned_by: user.id,
        };

        const { data: updated, error: updateError } = await supabase
          .from("supplement_assignments")
          .update(updates)
          .eq("id", existing.id)
          .select("id")
          .single();

        if (updateError) throw new Error(updateError.message);

        revalidateSupplementPaths(subject);
        return { id: updated.id };
      }

      const insertRow: SupplementAssignmentInsert = {
        subject_profile_id: profileId,
        subject_user_id: subject.subject_user_id,
        subject_client_id: subject.subject_client_id,
        supplement_id: payload.supplement_id,
        default_servings: payload.default_servings ?? 1,
        unit: payload.unit || null,
        assigned_by: user.id,
        is_active: true,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("supplement_assignments")
        .insert(insertRow)
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      revalidateSupplementPaths(subject);
      return { id: inserted.id };
    },
  });
}

export async function addSupplementAssignmentsBulkAction(
  input: z.input<typeof addBulkAssignmentsSchema>
): Promise<{ created_count: number; updated_count: number; profile_id: string }> {
  const payload = addBulkAssignmentsSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.assignments.add-bulk",
    payload: {
      ...payload.subject,
      supplement_count: payload.supplement_ids.length,
      profile_id: payload.profile_id ?? null,
    },
    action: async () => {
      const { supabase, user } = await requireActor();
      const subject = resolveSubject(payload.subject, user.id);

      const profileId = await ensureSubjectProfile(supabase, user.id, subject, {
        profile_id: payload.profile_id,
        title: payload.title,
        workout_program: payload.workout_program,
        nutrition_program: payload.nutrition_program,
        status: payload.status,
      });

      const supplementIds = Array.from(new Set(payload.supplement_ids));
      const { data: supplements, error: supplementsError } = await supabase
        .from("supplement_catalog")
        .select("id")
        .in("id", supplementIds);
      if (supplementsError) throw new Error(supplementsError.message);

      const existingIds = new Set((supplements || []).map((row) => row.id));
      const missingSupplements = supplementIds.filter((id) => !existingIds.has(id));
      if (missingSupplements.length > 0) {
        throw new Error("Some selected supplements no longer exist");
      }

      const { data: existingAssignments, error: existingAssignmentsError } = await supabase
        .from("supplement_assignments")
        .select("id, supplement_id")
        .eq("subject_profile_id", profileId)
        .in("supplement_id", supplementIds)
        .limit(500);

      if (existingAssignmentsError) throw new Error(existingAssignmentsError.message);

      const existingBySupplementId = new Map(
        (existingAssignments || []).map((row) => [row.supplement_id, row.id] as const)
      );

      const updateRows: Array<{ id: string; updates: SupplementAssignmentUpdate }> = [];
      const insertRows: SupplementAssignmentInsert[] = [];

      for (const supplementId of supplementIds) {
        const existingId = existingBySupplementId.get(supplementId);
        if (existingId) {
          const updates: SupplementAssignmentUpdate = {
            default_servings: payload.default_servings ?? 1,
            unit: payload.unit || null,
            is_active: true,
            assigned_by: user.id,
          };
          updateRows.push({ id: existingId, updates });
          continue;
        }

        insertRows.push({
          subject_profile_id: profileId,
          subject_user_id: subject.subject_user_id,
          subject_client_id: subject.subject_client_id,
          supplement_id: supplementId,
          default_servings: payload.default_servings ?? 1,
          unit: payload.unit || null,
          assigned_by: user.id,
          is_active: true,
        });
      }

      for (const row of updateRows) {
        const { error } = await supabase.from("supplement_assignments").update(row.updates).eq("id", row.id);
        if (error) throw new Error(error.message);
      }

      if (insertRows.length > 0) {
        const { error: insertError } = await supabase.from("supplement_assignments").insert(insertRows);
        if (insertError) throw new Error(insertError.message);
      }

      revalidateSupplementPaths(subject);
      return {
        created_count: insertRows.length,
        updated_count: updateRows.length,
        profile_id: profileId,
      };
    },
  });
}

export async function updateSupplementAssignmentAction(
  input: z.input<typeof updateAssignmentSchema>
): Promise<void> {
  const payload = updateAssignmentSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.assignments.update",
    payload: { id: payload.id },
    action: async () => {
      const { supabase } = await requireActor();
      const subject = await getAssignmentSubjectRefById(supabase, payload.id);

      const updates: SupplementAssignmentUpdate = {};
      if (payload.default_servings !== undefined) updates.default_servings = payload.default_servings;
      if (payload.unit !== undefined) updates.unit = payload.unit || null;
      if (payload.is_active !== undefined) updates.is_active = payload.is_active;

      const { error } = await supabase.from("supplement_assignments").update(updates).eq("id", payload.id);
      if (error) throw new Error(error.message);

      revalidateSupplementPaths(subject);
    },
  });
}

export async function removeSupplementAssignmentAction(id: string): Promise<void> {
  const assignmentId = z.string().uuid().parse(id);
  return runTrackedAction({
    eventName: "supplements.assignments.remove",
    payload: { id: assignmentId },
    action: async () => {
      const { supabase } = await requireActor();
      const subject = await getAssignmentSubjectRefById(supabase, assignmentId);

      const { error: deleteError } = await supabase.from("supplement_assignments").delete().eq("id", assignmentId);
      if (deleteError) throw new Error(deleteError.message);

      revalidateSupplementPaths(subject);
    },
  });
}

export async function removeSupplementStackAction(
  input: z.input<typeof removeStackSchema>
): Promise<void> {
  const payload = removeStackSchema.parse(input);
  return runTrackedAction({
    eventName: "supplements.stacks.remove",
    payload,
    action: async () => {
      const { supabase } = await requireActor();
      const subject = await getSubjectProfileRefById(supabase, payload.profile_id);

      const { error: deleteError } = await supabase
        .from("supplement_subject_profiles")
        .delete()
        .eq("id", payload.profile_id);
      if (deleteError) throw new Error(deleteError.message);

      revalidateSupplementPaths(subject);
    },
  });
}
