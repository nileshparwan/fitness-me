"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketCategory = Database["public"]["Enums"]["ticket_category"];

const adminListSchema = z.object({
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  category: z.enum(["exercise_request", "feature_request", "bug_report", "other"]).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  sort_by: z.enum(["upvotes", "created_at", "updated_at"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export type AdminTicketRow = TicketRow & {
  reporter: {
    id: string;
    email: string | null;
    name: string;
  };
  comments_count: number;
};

export type AdminTicketListResult = {
  rows: AdminTicketRow[];
  page: number;
  page_size: number;
  total: number;
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

async function resolveReporter(userId: string): Promise<AdminTicketRow["reporter"]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw error || new Error("User not found");
    const user = data.user;
    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;
    const derivedName = fullName || (user.email ? user.email.split("@")[0] : "User");
    return {
      id: userId,
      email: user.email ?? null,
      name: derivedName,
    };
  } catch {
    return {
      id: userId,
      email: null,
      name: "User",
    };
  }
}

export async function listAdminTicketsAction(
  input: z.input<typeof adminListSchema>
): Promise<AdminTicketListResult> {
  const params = adminListSchema.parse(input);
  return runTrackedAction({
    eventName: "admin.tickets.list",
    payload: { page: params.page, page_size: params.page_size },
    action: async () => {
  await requireAdminUser();
  const admin = createAdminClient();

  let query = admin.from("tickets").select("*", { count: "exact" });

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.category) query = query.eq("category", params.category);
  if (params.status) query = query.eq("status", params.status);

  const from = params.page * params.page_size;
  const to = from + params.page_size - 1;

  const sortBy = params.sort_by ?? "upvotes";
  const ascending = (params.sort_order ?? "desc") === "asc";
  let sortedQuery = query.order(sortBy, { ascending });
  if (sortBy !== "created_at") {
    sortedQuery = sortedQuery.order("created_at", { ascending: false });
  }

  const { data, error, count } = await sortedQuery.range(from, to);

  if (error) throw new Error(error.message);

  const baseRows = (data || []) as TicketRow[];
  const uniqueIds = Array.from(new Set(baseRows.map((row) => row.user_id)));
  const reporters = await Promise.all(uniqueIds.map((id) => resolveReporter(id)));
  const reporterMap = new Map(reporters.map((item) => [item.id, item]));

  const rows: AdminTicketRow[] = baseRows.map((row) => ({
    ...row,
    reporter: reporterMap.get(row.user_id) || {
      id: row.user_id,
      email: null,
      name: "User",
    },
    comments_count: 0,
  }));

  await Promise.all(
    rows.map(async (row) => {
      const { count } = await admin
        .from("ticket_comments")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", row.id);
      row.comments_count = count ?? 0;
    })
  );

  const total = count ?? 0;
  return {
    rows,
    page: params.page,
    page_size: params.page_size,
    total,
    has_more: from + rows.length < total,
  };
    },
  });
}

export async function updateTicketStatusAction(
  input: z.input<typeof updateStatusSchema>
) {
  const payload = updateStatusSchema.parse(input);
  return runTrackedAction({
    eventName: "admin.tickets.status.update",
    payload: { ticket_id: payload.id, status: payload.status },
    action: async () => {
  await requireAdminUser();
  const admin = createAdminClient();

  const { error } = await admin
    .from("tickets")
    .update({ status: payload.status as TicketStatus })
    .eq("id", payload.id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/tickets");
  revalidatePath("/support");
  revalidatePath(`/support/${payload.id}`);
  return { success: true };
    },
  });
}

export async function deleteTicketAction(input: z.input<typeof deleteSchema>) {
  const payload = deleteSchema.parse(input);
  return runTrackedAction({
    eventName: "admin.tickets.delete",
    payload: { ticket_id: payload.id },
    action: async () => {
  await requireAdminUser();
  const admin = createAdminClient();

  const { error } = await admin.from("tickets").delete().eq("id", payload.id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/tickets");
  revalidatePath("/support");
  revalidatePath(`/support/${payload.id}`);
  return { success: true };
    },
  });
}
