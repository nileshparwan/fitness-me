"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { runTrackedAction, trackEvent } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Database, Json } from "@/types/database";
import { AppEventName } from "@/types/events";

export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];
export type TicketCommentRow = Database["public"]["Tables"]["ticket_comments"]["Row"];
type TicketUpvoteRow = Database["public"]["Tables"]["ticket_upvotes"]["Row"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketCategory = Database["public"]["Enums"]["ticket_category"];
export type TicketListRow = TicketRow & { viewer_has_upvoted: boolean };

const createTicketSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(4000),
  category: z.enum(["exercise_request", "feature_request", "bug_report", "other"]),
  is_public: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const listSchema = z.object({
  page: z.number().int().min(0).default(0),
  page_size: z.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(120).optional(),
  category: z.enum(["exercise_request", "feature_request", "bug_report", "other"]).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  sort_by: z.enum(["upvotes", "created_at", "updated_at"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

const adminUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  admin_notes: z.string().max(5000).optional().nullable(),
  metadata_patch: z.record(z.string(), z.unknown()).optional(),
});

const ticketIdSchema = z.string().uuid();
const updateTicketContentSchema = z.object({
  ticket_id: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(4000),
});

const createCommentSchema = z.object({
  ticket_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

export type TicketListResult = {
  rows: TicketListRow[];
  page: number;
  page_size: number;
  has_more: boolean;
  total: number;
};

export type TicketAuthor = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type TicketDetail = TicketListRow & {
  author: TicketAuthor;
  viewer_user_id: string;
  viewer_is_admin: boolean;
};

export type TicketCommentDetail = TicketCommentRow & {
  author: TicketAuthor;
};

function asJsonObject(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function isMissingTicketUpvotesTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("ticket_upvotes") && message.includes("schema cache")
  );
}

function revalidateSupportPaths(ticketId?: string) {
  revalidatePath("/support");
  revalidatePath("/support/[id]");
  if (ticketId) revalidatePath(`/support/${ticketId}`);
}

async function getAuthorById(userId: string): Promise<TicketAuthor> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw error || new Error("User not found");
    const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
    const name =
      fullName ||
      (data.user.email ? data.user.email.split("@")[0] : null) ||
      "User";
    const avatar =
      typeof meta.avatar_url === "string" ? meta.avatar_url : null;
    return { id: userId, name, avatar_url: avatar };
  } catch {
    return { id: userId, name: "User", avatar_url: null };
  }
}

async function getViewerUpvotedIds(userId: string, ticketIds: string[]): Promise<Set<string>> {
  if (ticketIds.length === 0) return new Set<string>();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ticket_upvotes")
    .select("ticket_id")
    .eq("user_id", userId)
    .in("ticket_id", ticketIds);

  if (error) return new Set<string>();
  const rows = (data || []) as Pick<TicketUpvoteRow, "ticket_id">[];
  return new Set(rows.map((row) => row.ticket_id));
}

export async function createTicketAction(input: z.input<typeof createTicketSchema>) {
  const payload = createTicketSchema.parse(input);
  let actorUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");
    actorUserId = user.id;

    const computedPublic = payload.category === "bug_report" ? false : (payload.is_public ?? true);

    const insert: TicketInsert = {
      user_id: user.id,
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category,
      status: "open",
      is_public: computedPublic,
      upvotes: 0,
      metadata: (payload.metadata || {}) as Json,
    };

    // Use admin client for insert after authenticating caller.
    // This avoids RLS/session edge cases inside server actions while keeping ownership explicit.
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tickets")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      if (error.code === "42P01") {
        throw new Error("Tickets table is missing. Run the latest Supabase migrations.");
      }
      if (error.code === "22P02" || error.code === "42804") {
        throw new Error("Tickets schema is out of date. Apply the latest migrations.");
      }
      throw new Error(error.message);
    }

    const createdTicket = data as TicketRow;

    // Seed creator upvote so every new ticket starts with one supporter.
    const { error: upvoteInsertError } = await admin.from("ticket_upvotes").insert({
      ticket_id: createdTicket.id,
      user_id: user.id,
    });
    if (upvoteInsertError && upvoteInsertError.code !== "23505") {
      if (isMissingTicketUpvotesTableError(upvoteInsertError)) {
        const { error: legacyUpdateError } = await admin
          .from("tickets")
          .update({ upvotes: 1 })
          .eq("id", createdTicket.id);
        if (legacyUpdateError) throw new Error(legacyUpdateError.message);
      } else {
        throw new Error(upvoteInsertError.message);
      }
    }

    revalidateSupportPaths(createdTicket.id);
    revalidatePath("/admin/tickets");

    trackEvent(
      AppEventName.SUPPORT_TICKET_CREATED,
      {
        user_id: user.id,
        ticket_id: createdTicket.id,
        category: createdTicket.category,
        is_public: createdTicket.is_public,
      },
      "success"
    );

    return createdTicket;
  } catch (error) {
    trackEvent(
      AppEventName.SUPPORT_TICKET_CREATED,
      {
        user_id: actorUserId,
        category: payload.category,
        is_public: payload.is_public ?? null,
        error_message: error instanceof Error ? error.message : "unknown_error",
      },
      "error"
    );
    throw error;
  }
}

export async function listPublicTicketsAction(input: z.input<typeof listSchema>): Promise<TicketListResult> {
  const params = listSchema.parse(input);
  return runTrackedAction({
    eventName: "support.tickets.list.public",
    payload: { page: params.page, page_size: params.page_size },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .eq("is_public", true);

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

  const total = count ?? 0;
  const baseRows = (data || []) as TicketRow[];
  const upvotedIds = await getViewerUpvotedIds(
    user.id,
    baseRows.map((row) => row.id)
  );
  const rows: TicketListRow[] = baseRows.map((row) => ({
    ...row,
    viewer_has_upvoted: upvotedIds.has(row.id),
  }));
  return {
    rows,
    page: params.page,
    page_size: params.page_size,
    has_more: from + rows.length < total,
    total,
  };
    },
  });
}

export async function listMyTicketsAction(input: z.input<typeof listSchema>): Promise<TicketListResult> {
  const params = listSchema.parse(input);
  return runTrackedAction({
    eventName: "support.tickets.list.mine",
    payload: { page: params.page, page_size: params.page_size },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  let query = supabase
    .from("tickets")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  if (params.category) query = query.eq("category", params.category);
  if (params.status) query = query.eq("status", params.status);

  const from = params.page * params.page_size;
  const to = from + params.page_size - 1;

  const sortBy = params.sort_by ?? "created_at";
  const ascending = (params.sort_order ?? "desc") === "asc";

  let sortedQuery = query.order(sortBy, { ascending });
  if (sortBy !== "created_at") {
    sortedQuery = sortedQuery.order("created_at", { ascending: false });
  }

  const { data, error, count } = await sortedQuery.range(from, to);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const baseRows = (data || []) as TicketRow[];
  const upvotedIds = await getViewerUpvotedIds(
    user.id,
    baseRows.map((row) => row.id)
  );
  const rows: TicketListRow[] = baseRows.map((row) => ({
    ...row,
    viewer_has_upvoted: upvotedIds.has(row.id),
  }));
  return {
    rows,
    page: params.page,
    page_size: params.page_size,
    has_more: from + rows.length < total,
    total,
  };
    },
  });
}

export async function toggleUpvoteTicketAction(ticketId: string) {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.upvote.toggle",
    payload: { ticket_id: safeTicketId },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: current, error: fetchError } = await admin
    .from("tickets")
    .select("id, upvotes, is_public, status")
    .eq("id", safeTicketId)
    .single();

  if (fetchError || !current) throw new Error(fetchError?.message || "Ticket not found");
  if (!current.is_public) throw new Error("Only public tickets can be upvoted");
  if (current.status === "closed") throw new Error("This ticket is closed");

  const { data: existingVote, error: existingVoteError } = await admin
    .from("ticket_upvotes")
    .select("ticket_id, user_id")
    .eq("ticket_id", safeTicketId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingVoteError) {
    if (isMissingTicketUpvotesTableError(existingVoteError)) {
      throw new Error(
        "Upvotes migration is not applied yet. Run `supabase db push` to apply migration 20260302162000_create_ticket_upvotes.sql."
      );
    }
    throw new Error(existingVoteError.message);
  }

  let upvoted = false;
  if (existingVote) {
    const { error: deleteError } = await admin
      .from("ticket_upvotes")
      .delete()
      .eq("ticket_id", safeTicketId)
      .eq("user_id", user.id);
    if (deleteError) throw new Error(deleteError.message);
    upvoted = false;
  } else {
    const { error: insertError } = await admin.from("ticket_upvotes").insert({
      ticket_id: safeTicketId,
      user_id: user.id,
    });
    if (insertError) throw new Error(insertError.message);
    upvoted = true;
  }

  const { data: refreshed, error: refreshedError } = await admin
    .from("tickets")
    .select("upvotes")
    .eq("id", safeTicketId)
    .single();
  if (refreshedError || !refreshed) throw new Error(refreshedError?.message || "Failed to refresh upvotes");

  revalidateSupportPaths(safeTicketId);
  revalidatePath("/admin/tickets");
  return { success: true, upvoted, upvotes: refreshed.upvotes ?? 0 };
    },
  });
}

export const upvoteTicketAction = toggleUpvoteTicketAction;

export async function getTicketDetailAction(ticketId: string): Promise<TicketDetail> {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.detail.read",
    payload: { ticket_id: safeTicketId },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", safeTicketId)
    .single();
  if (error || !data) throw new Error(error?.message || "Ticket not found");

  const author = await getAuthorById(data.user_id);
  const upvotedIds = await getViewerUpvotedIds(user.id, [safeTicketId]);
  const appRole =
    typeof user.app_metadata?.role === "string"
      ? user.app_metadata.role.toLowerCase()
      : null;
  const userRole =
    typeof user.user_metadata?.role === "string"
      ? user.user_metadata.role.toLowerCase()
      : null;
  return {
    ...(data as TicketRow),
    viewer_has_upvoted: upvotedIds.has(safeTicketId),
    author,
    viewer_user_id: user.id,
    viewer_is_admin: appRole === "admin" || userRole === "admin",
  };
    },
  });
}

export async function updateTicketContentAction(input: z.input<typeof updateTicketContentSchema>) {
  const payload = updateTicketContentSchema.parse(input);
  return runTrackedAction({
    eventName: "support.ticket.update",
    payload: { ticket_id: payload.ticket_id },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select("id, user_id, status")
    .eq("id", payload.ticket_id)
    .single();
  if (ticketError || !ticket) throw new Error(ticketError?.message || "Ticket not found");
  if (ticket.user_id !== user.id) throw new Error("Unauthorized");
  if (ticket.status === "closed") throw new Error("Closed tickets are read-only");

  const { data, error } = await supabase
    .from("tickets")
    .update({
      title: payload.title.trim(),
      description: payload.description.trim(),
    })
    .eq("id", payload.ticket_id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidateSupportPaths(payload.ticket_id);
  revalidatePath("/admin/tickets");
  return data as TicketRow;
    },
  });
}

export async function listTicketCommentsAction(ticketId: string): Promise<TicketCommentDetail[]> {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.comments.read",
    payload: { ticket_id: safeTicketId },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Ticket read check via RLS.
  const { error: ticketError } = await supabase
    .from("tickets")
    .select("id")
    .eq("id", safeTicketId)
    .single();
  if (ticketError) throw new Error(ticketError.message);

  const { data, error } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", safeTicketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const comments = (data || []) as TicketCommentRow[];
  const userIds = Array.from(new Set(comments.map((comment) => comment.user_id)));
  const authors = await Promise.all(userIds.map((id) => getAuthorById(id)));
  const authorMap = new Map(authors.map((author) => [author.id, author]));

  return comments.map((comment) => ({
    ...comment,
    author: authorMap.get(comment.user_id) || { id: comment.user_id, name: "User", avatar_url: null },
  }));
    },
  });
}

export async function createTicketCommentAction(input: z.input<typeof createCommentSchema>) {
  const payload = createCommentSchema.parse(input);
  return runTrackedAction({
    eventName: "support.ticket.comment.create",
    payload: { ticket_id: payload.ticket_id },
    action: async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Access check via ticket RLS.
  const { data: ticketData, error: ticketError } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", payload.ticket_id)
    .single();
  if (ticketError) throw new Error(ticketError.message);
  if (ticketData?.status === "closed") throw new Error("This ticket is closed");

  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: payload.ticket_id,
    user_id: user.id,
    content: payload.content.trim(),
  });
  if (error) throw new Error(error.message);

  revalidateSupportPaths(payload.ticket_id);
  return { success: true };
    },
  });
}

export async function listAdminTicketsAction(input: z.input<typeof listSchema>): Promise<TicketListResult> {
  const params = listSchema.parse(input);
  return runTrackedAction({
    eventName: "admin.tickets.list.legacy",
    payload: { page: params.page, page_size: params.page_size },
    action: async () => {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase.from("tickets").select("*", { count: "exact" });
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

  const total = count ?? 0;
  const rows = ((data || []) as TicketRow[]).map((row) => ({
    ...row,
    viewer_has_upvoted: false,
  }));
  return {
    rows,
    page: params.page,
    page_size: params.page_size,
    has_more: from + rows.length < total,
    total,
  };
    },
  });
}

export async function adminUpdateTicketAction(input: z.input<typeof adminUpdateSchema>) {
  const params = adminUpdateSchema.parse(input);
  return runTrackedAction({
    eventName: "admin.ticket.update.legacy",
    payload: { ticket_id: params.id, status: params.status },
    action: async () => {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("tickets")
    .select("metadata")
    .eq("id", params.id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const mergedMetadata = {
    ...asJsonObject(existing?.metadata),
    ...(params.metadata_patch || {}),
  } as Json;

  const updatePayload: TicketUpdate = {
    status: params.status as TicketStatus,
    admin_notes: params.admin_notes?.trim() || null,
    metadata: mergedMetadata,
  };

  const { error } = await supabase.from("tickets").update(updatePayload).eq("id", params.id);
  if (error) throw new Error(error.message);

  revalidateSupportPaths(params.id);
  revalidatePath("/admin/tickets");
  return { success: true };
    },
  });
}

export const getTicketByIdAction = getTicketDetailAction;
export const getTicketCommentsAction = listTicketCommentsAction;

const getTicketsSchema = listSchema.extend({
  scope: z.enum(["public", "mine"]).default("public"),
});

export async function getTicketsAction(input: z.input<typeof getTicketsSchema>) {
  const payload = getTicketsSchema.parse(input);
  return runTrackedAction({
    eventName: "support.tickets.read",
    payload: { scope: payload.scope, page: payload.page, page_size: payload.page_size },
    action: async () => {
      if (payload.scope === "mine") {
        return listMyTicketsAction(payload);
      }
      return listPublicTicketsAction(payload);
    },
  });
}
