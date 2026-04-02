"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { escapeLikePattern } from "@/lib/utils/search";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type ProgramRow = Database["public"]["Tables"]["programs"]["Row"];
type ProgramInsert = Database["public"]["Tables"]["programs"]["Insert"];
type ProgramUpdate = Database["public"]["Tables"]["programs"]["Update"];
type ProgramItemInsert = Database["public"]["Tables"]["program_workouts"]["Insert"];
type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

const listProgramAssigneesSchema = z.object({
  program_id: z.string().uuid(),
  search: z.string().trim().max(120).optional(),
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(15),
});

const assignProgramToClientSchema = z
  .object({
    program_id: z.string().uuid(),
    client_id: z.string().uuid().nullable().optional(),
    self: z.boolean().default(false),
  })
  .refine((value) => (value.self ? !value.client_id : Boolean(value.client_id)), {
    message: "Choose either self or one client.",
  });

export type ProgramAssigneeOption = {
  id: string;
  full_name: string;
  linked_user_id: string | null;
  is_self?: boolean;
};

function formatClientLabel(client: Pick<ClientRow, "id" | "display_name" | "first_name" | "last_name">) {
  if (client.display_name?.trim()) return client.display_name.trim();
  const fallback = `${client.first_name} ${client.last_name || ""}`.trim();
  if (fallback) return fallback;
  return `Client ${client.id.slice(0, 8)}`;
}

function matchesSelfOption(search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("me") ||
    normalized.includes("self") ||
    normalized.includes("my")
  );
}

async function requireProgramAccess(programId: string): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string };
  program: Pick<ProgramRow, "id" | "user_id">;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, user_id")
    .eq("id", programId)
    .maybeSingle();
  if (programError) throw new Error(programError.message);
  if (!program) throw new Error("Program not found or unauthorized.");

  return { supabase, user: { id: user.id }, program };
}

export async function createProgram(formData: FormData) {
  return runTrackedAction({
    eventName: "program.create",
    payload: { name: formData.get("name") as string },
    action: async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Unauthorized");

      const payload: ProgramInsert = {
        user_id: user.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
      };

      const { error } = await supabase.from("programs").insert(payload);
      if (error) throw new Error(error.message);
      revalidatePath("/programs");
    },
  });
}

export async function updateProgram(id: string, data: Database["public"]["Tables"]["programs"]["Update"]) {
  return runTrackedAction({
    eventName: "program.update",
    payload: { program_id: id },
    action: async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("programs").update(data).eq("id", id);

      if (error) throw new Error(error.message);
      revalidatePath("/programs");
      revalidatePath(`/programs/${id}`);
    },
  });
}

export async function listProgramAssigneesAction(input: z.input<typeof listProgramAssigneesSchema>) {
  const payload = listProgramAssigneesSchema.parse(input);
  return runTrackedAction({
    eventName: "program.assignees.list",
    payload: {
      program_id: payload.program_id,
      page: payload.page,
      page_size: payload.page_size,
      has_search: Boolean(payload.search?.trim()),
    },
    action: async () => {
      const { supabase, user } = await requireProgramAccess(payload.program_id);
      const search = payload.search?.trim() || "";
      const { data: actorProfile, error: actorProfileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (actorProfileError) throw new Error(actorProfileError.message);
      const actorIsSysadmin = actorProfile?.role === "sysadmin";

      let query = supabase
        .from("clients")
        .select("id, display_name, first_name, last_name, linked_user_id, status, created_at")
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
            } satisfies ProgramAssigneeOption,
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

export async function assignProgramToClientAction(input: z.input<typeof assignProgramToClientSchema>) {
  const payload = assignProgramToClientSchema.parse(input);
  return runTrackedAction({
    eventName: "program.assignee.client.update",
    payload,
    action: async () => {
      const { supabase, user, program } = await requireProgramAccess(payload.program_id);
      const { data: actorProfile, error: actorProfileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (actorProfileError) throw new Error(actorProfileError.message);
      const actorIsSysadmin = actorProfile?.role === "sysadmin";
      if (!actorIsSysadmin && program.user_id !== user.id) throw new Error("Unauthorized");

      if (payload.self) {
        const updatePayload: ProgramUpdate = { assigned_client_id: null };
        const { error: assignSelfError } = await supabase
          .from("programs")
          .update(updatePayload)
          .eq("id", payload.program_id);
        if (assignSelfError) throw new Error(assignSelfError.message);

        revalidatePath("/programs");
        revalidatePath(`/programs/${payload.program_id}`);

        return {
          program_id: payload.program_id,
          client_id: null,
          client_name: actorProfile?.full_name?.trim() || "Myself",
          linked_user_id: user.id,
          is_self: true,
        };
      }

      if (!payload.client_id) throw new Error("Client is required.");

      const { data: targetClient, error: targetClientError } = await supabase
        .from("clients")
        .select("id, display_name, first_name, last_name, linked_user_id, primary_coach_id, created_by_user_id, status")
        .eq("id", payload.client_id)
        .maybeSingle();
      if (targetClientError) throw new Error(targetClientError.message);
      if (!targetClient) throw new Error("Client not found.");
      if (targetClient.status === "archived") throw new Error("Archived clients cannot be assigned.");
      if (!targetClient.linked_user_id) {
        throw new Error("This client is not linked to a user account yet. Link the client first.");
      }
      const actorOwnsClient =
        targetClient.primary_coach_id === user.id || targetClient.created_by_user_id === user.id;
      if (!actorIsSysadmin && !actorOwnsClient) {
        throw new Error("You can only assign programs to your own clients.");
      }

      const updatePayload: ProgramUpdate = {
        assigned_client_id: targetClient.id,
      };
      const { error: assignError } = await supabase
        .from("programs")
        .update(updatePayload)
        .eq("id", payload.program_id);
      if (assignError) throw new Error(assignError.message);

      revalidatePath("/programs");
      revalidatePath(`/programs/${payload.program_id}`);

      return {
        program_id: payload.program_id,
        client_id: targetClient.id,
        client_name: formatClientLabel(targetClient),
        linked_user_id: targetClient.linked_user_id,
      };
    },
  });
}

export async function deletePrograms(ids: string[]) {
  return runTrackedAction({
    eventName: "program.delete.bulk",
    payload: { count: ids.length },
    action: async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("programs").delete().in("id", ids);

      if (error) throw new Error(error.message);
      revalidatePath("/programs");
    },
  });
}

export async function addWorkoutsToProgram(programId: string, workoutIds: string[]) {
  return runTrackedAction({
    eventName: "program.workouts.add",
    payload: { program_id: programId, count: workoutIds.length },
    action: async () => {
      const supabase = await createClient();
      const uniqueWorkoutIds = Array.from(new Set(workoutIds));

      if (uniqueWorkoutIds.length === 0) return;

      const { data: existingItems } = await supabase
        .from("program_workouts")
        .select("workout_id")
        .eq("program_id", programId)
        .in("workout_id", uniqueWorkoutIds);

      const existingWorkoutIds = new Set((existingItems || []).map((item) => item.workout_id).filter((id): id is string => Boolean(id)));

      const workoutIdsToInsert = uniqueWorkoutIds.filter((id) => !existingWorkoutIds.has(id));
      if (workoutIdsToInsert.length === 0) return;

      const { count } = await supabase
        .from("program_workouts")
        .select("*", { count: "exact", head: true })
        .eq("program_id", programId);

      const startOrder = count || 0;

      const items: ProgramItemInsert[] = workoutIdsToInsert.map((workoutId, index) => ({
        program_id: programId,
        workout_id: workoutId,
        item_type: "workout",
        order_index: startOrder + index,
        day_label: "Unscheduled",
      }));

      const { error } = await supabase.from("program_workouts").insert(items);
      if (error) throw new Error(error.message);

      revalidatePath(`/programs/${programId}`);
    },
  });
}

export async function removeItemsFromProgram(itemIds: string[], programId: string) {
  return runTrackedAction({
    eventName: "program.items.remove",
    payload: { program_id: programId, count: itemIds.length },
    action: async () => {
      const supabase = await createClient();
      const { error } = await supabase.from("program_workouts").delete().in("id", itemIds);

      if (error) throw new Error(error.message);
      revalidatePath(`/programs/${programId}`);
    },
  });
}

export async function updateProgramItemOrder(
  items: { id: string; order_index: number; day_label?: string; item_type: string }[],
  programId: string
) {
  return runTrackedAction({
    eventName: "program.items.reorder",
    payload: { program_id: programId, count: items.length },
    action: async () => {
      const supabase = await createClient();

      const updates = items.map((item) => ({
        id: item.id,
        program_id: programId,
        item_type: item.item_type,
        order_index: item.order_index,
        day_label: item.day_label || "Unscheduled",
      }));

      const { error } = await supabase
        .from("program_workouts")
        .upsert(updates as ProgramItemInsert[], { onConflict: "id" });

      if (error) throw new Error(error.message);

      revalidatePath(`/programs/${programId}`);
    },
  });
}

export async function linkWorkoutToPrograms(workoutId: string, programIds: string[]) {
  return runTrackedAction({
    eventName: "program.workout.link",
    payload: { workout_id: workoutId, count: programIds.length },
    action: async () => {
      const supabase = await createClient();
      const uniqueProgramIds = Array.from(new Set(programIds));
      if (uniqueProgramIds.length === 0) return;

      const { data: existingItems } = await supabase
        .from("program_workouts")
        .select("program_id")
        .in("program_id", uniqueProgramIds)
        .eq("workout_id", workoutId);

      const existingProgramIds = new Set((existingItems || []).map((item) => item.program_id).filter((id): id is string => Boolean(id)));

      const programIdsToInsert = uniqueProgramIds.filter((id) => !existingProgramIds.has(id));
      if (programIdsToInsert.length === 0) return;

      const items: ProgramItemInsert[] = programIdsToInsert.map((programId) => ({
        program_id: programId,
        workout_id: workoutId,
        item_type: "workout",
        day_label: "Imported",
        order_index: 999,
      }));

      const { error } = await supabase.from("program_workouts").insert(items);
      if (error) throw new Error("Failed to link programs");
    },
  });
}
