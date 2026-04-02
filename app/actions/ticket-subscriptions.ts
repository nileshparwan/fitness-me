"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TicketVisibilityRow = Pick<
  Database["public"]["Tables"]["support_tickets"]["Row"],
  "id" | "user_id" | "is_public" | "status"
>;

type SubscriptionState = {
  is_subscribed: boolean;
  can_subscribe: boolean;
};

const ticketIdSchema = z.string().uuid();

function isAdminRoleValue(value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "sysadmin" || normalized === "admin";
}

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    isAdminRoleValue(profile?.role) ||
    isAdminRoleValue(String(user.app_metadata?.role || ""));

  return { supabase, user, isAdmin };
}

async function getTicketContext(ticketId: string): Promise<TicketVisibilityRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .select("id, user_id, is_public, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as TicketVisibilityRow;
}

function canViewTicket(ticket: TicketVisibilityRow, actorId: string, actorIsAdmin: boolean) {
  return ticket.is_public || ticket.user_id === actorId || actorIsAdmin;
}

export async function getTicketSubscriptionStateAction(ticketId: string): Promise<SubscriptionState> {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.subscription.read",
    payload: { ticket_id: safeTicketId },
    action: async () => {
      const { supabase, user, isAdmin } = await requireActor();
      const ticket = await getTicketContext(safeTicketId);
      if (!ticket || !canViewTicket(ticket, user.id, isAdmin)) {
        return { is_subscribed: false, can_subscribe: false };
      }

      const { data, error } = await supabase
        .from("support_subscriptions")
        .select("ticket_id")
        .eq("ticket_id", safeTicketId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);

      return {
        is_subscribed: Boolean(data),
        can_subscribe: ticket.status !== "closed",
      };
    },
  });
}

export async function subscribeToTicketAction(ticketId: string): Promise<void> {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.subscription.create",
    payload: { ticket_id: safeTicketId },
    action: async () => {
      const { supabase, user, isAdmin } = await requireActor();
      const ticket = await getTicketContext(safeTicketId);
      if (!ticket || !canViewTicket(ticket, user.id, isAdmin)) {
        throw new Error("Ticket not found or unavailable");
      }
      if (ticket.status === "closed") {
        throw new Error("Closed support_tickets cannot be subscribed");
      }

      const { error } = await supabase.from("support_subscriptions").upsert(
        {
          ticket_id: safeTicketId,
          user_id: user.id,
        },
        {
          onConflict: "ticket_id,user_id",
          ignoreDuplicates: true,
        }
      );
      if (error) throw new Error(error.message);

      revalidatePath(`/support/${safeTicketId}`);
    },
  });
}

export async function unsubscribeFromTicketAction(ticketId: string): Promise<void> {
  const safeTicketId = ticketIdSchema.parse(ticketId);
  return runTrackedAction({
    eventName: "support.ticket.subscription.delete",
    payload: { ticket_id: safeTicketId },
    action: async () => {
      const { supabase, user, isAdmin } = await requireActor();
      const ticket = await getTicketContext(safeTicketId);
      if (!ticket || !canViewTicket(ticket, user.id, isAdmin)) {
        throw new Error("Ticket not found or unavailable");
      }
      if (ticket.user_id === user.id) {
        throw new Error("Ticket reporter cannot unsubscribe from this ticket");
      }

      const { error } = await supabase
        .from("support_subscriptions")
        .delete()
        .eq("ticket_id", safeTicketId)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);

      revalidatePath(`/support/${safeTicketId}`);
    },
  });
}
