"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type MenstrualCycleRow = Database["public"]["Tables"]["cycle_entries"]["Row"];
type ActorSupabase = Awaited<ReturnType<typeof createClient>>;
type AdminSupabase = ReturnType<typeof createAdminClient>;

export type CycleSubject = { type: "me" } | { type: "client"; id: string };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const subjectSchema: z.ZodType<CycleSubject> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("me") }),
  z.object({ type: z.literal("client"), id: z.string().uuid() }),
]);

const cycleInputSchema = z.object({
  period_start_date: z.string().regex(datePattern),
  period_end_date: z.string().regex(datePattern).nullable().optional(),
  cycle_length_days: z.number().int().min(14).max(60).nullable().optional(),
  period_length_days: z.number().int().min(1).max(14).nullable().optional(),
  energy_level: z.number().int().min(1).max(5).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  cramps: z.number().int().min(0).max(3).nullable().optional(),
  bloating: z.number().int().min(0).max(3).nullable().optional(),
  headache: z.boolean().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

const listCyclesSchema = z.object({
  subject: subjectSchema.optional(),
  limit: z.number().int().min(1).max(365).optional(),
});

type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

type CycleActor = {
  supabase: ActorSupabase;
  admin: AdminSupabase;
  userId: string;
};

type ResolvedCycleSubject = {
  subject: CycleSubject;
  subjectRef: SubjectRef;
  client: ActorSupabase | AdminSupabase;
};

function resolveSubject(subject: CycleSubject, actorUserId: string): SubjectRef {
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

async function requireCycleActor(): Promise<CycleActor> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    supabase,
    admin: createAdminClient(),
    userId: user.id,
  };
}

async function resolveCycleSubject(actor: CycleActor, subjectInput?: CycleSubject): Promise<ResolvedCycleSubject> {
  const subject = subjectSchema.parse(subjectInput ?? { type: "me" });

  if (subject.type === "me") {
    return {
      subject,
      subjectRef: resolveSubject(subject, actor.userId),
      client: actor.supabase,
    };
  }

  const { data: client, error } = await actor.supabase
    .from("clients")
    .select("id, linked_user_id, primary_coach_id, created_by_user_id")
    .eq("id", subject.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!client) throw new Error("Client not found.");

  const canAccess =
    client.primary_coach_id === actor.userId ||
    client.created_by_user_id === actor.userId ||
    client.linked_user_id === actor.userId;

  if (!canAccess) {
    throw new Error("Unauthorized");
  }

  return {
    subject,
    subjectRef: resolveSubject(subject, actor.userId),
    client: actor.admin,
  };
}

export async function logCycleAction(
  subjectInput: CycleSubject,
  input: z.input<typeof cycleInputSchema>
) {
  return runTrackedAction({
    eventName: "cycles.log",
    action: async () => {
      const actor = await requireCycleActor();
      const parsed = cycleInputSchema.parse(input);
      const resolved = await resolveCycleSubject(actor, subjectInput);
      const payload: Database["public"]["Tables"]["cycle_entries"]["Insert"] = {
        logged_by_user_id: actor.userId,
        subject_user_id: resolved.subjectRef.subject_user_id,
        subject_client_id: resolved.subjectRef.subject_client_id,
        period_start_date: parsed.period_start_date,
        period_end_date: parsed.period_end_date ?? null,
        cycle_length_days: parsed.cycle_length_days ?? null,
        period_length_days: parsed.period_length_days ?? null,
        energy_level: parsed.energy_level ?? null,
        mood: parsed.mood ?? null,
        cramps: parsed.cramps ?? null,
        bloating: parsed.bloating ?? null,
        headache: parsed.headache ?? null,
        notes: parsed.notes?.trim() || null,
      };

      const onConflict = resolved.subject.type === "me"
        ? "subject_user_id,subject_client_id,period_start_date"
        : "subject_user_id,subject_client_id,period_start_date";

      const { data, error } = await resolved.client
        .from("cycle_entries")
        .upsert(payload, { onConflict, ignoreDuplicates: false })
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);

      return { success: true, cycle: data as MenstrualCycleRow | null };
    },
  });
}

export async function getCyclesAction(input: { subject?: CycleSubject; limit?: number } = {}) {
  const actor = await requireCycleActor();
  const parsed = listCyclesSchema.parse(input);
  const resolved = await resolveCycleSubject(actor, parsed.subject);

  let query = resolved.client
    .from("cycle_entries")
    .select("*")
    .order("period_start_date", { ascending: false });

  query = applySubjectFilters(query, resolved.subjectRef);

  if (parsed.limit) {
    query = query.limit(parsed.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { cycles: (data ?? []) as MenstrualCycleRow[] };
}

export async function getLatestCycleAction(subjectInput?: CycleSubject) {
  const actor = await requireCycleActor();
  const resolved = await resolveCycleSubject(actor, subjectInput);

  let query = resolved.client
    .from("cycle_entries")
    .select("*")
    .order("period_start_date", { ascending: false })
    .limit(1);

  query = applySubjectFilters(query, resolved.subjectRef);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);

  return { cycle: (data as MenstrualCycleRow | null) ?? null };
}

export async function deleteCycleAction({ id }: { id: string }) {
  return runTrackedAction({
    eventName: "cycles.delete",
    action: async () => {
      const actor = await requireCycleActor();

      const { data: cycle, error: cycleError } = await actor.admin
        .from("cycle_entries")
        .select("id, subject_user_id, subject_client_id")
        .eq("id", id)
        .maybeSingle();

      if (cycleError) throw new Error(cycleError.message);
      if (!cycle) throw new Error("Cycle entry not found.");

      const ownsRow = cycle.subject_user_id === actor.userId;
      let coachesSubject = false;

      if (!ownsRow && cycle.subject_client_id) {
        const { data: client, error: clientError } = await actor.supabase
          .from("clients")
          .select("id")
          .eq("id", cycle.subject_client_id)
          .or(`primary_coach_id.eq.${actor.userId},created_by_user_id.eq.${actor.userId}`)
          .maybeSingle();

        if (clientError) throw new Error(clientError.message);
        coachesSubject = Boolean(client);
      }

      if (!ownsRow && !coachesSubject) {
        throw new Error("Unauthorized");
      }

      const { error } = await actor.admin.from("cycle_entries").delete().eq("id", id);
      if (error) throw new Error(error.message);

      return { success: true };
    },
  });
}
