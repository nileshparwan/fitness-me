import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "../client";
import type { NotificationType } from "@/types/notifications";

type TicketContext = {
  id: string;
  user_id: string;
  title: string;
  is_public: boolean;
};

type Activity =
  | "created"
  | "content_updated"
  | "comment_added"
  | "comment_edited"
  | "comment_deleted"
  | "status_changed"
  | "closed"
  | "reopened";

function resolveRecipients(input: {
  activity: Activity;
  actorIsAdmin: boolean;
  actorId: string;
  reporterId: string;
  isPublic: boolean;
  adminIds: Set<string>;
  subscriberIds: Set<string>;
}) {
  const recipients = new Set<string>();

  if (input.activity === "created") {
    for (const adminId of input.adminIds) {
      recipients.add(adminId);
    }
  }

  if (input.activity === "content_updated") {
    for (const adminId of input.adminIds) {
      recipients.add(adminId);
    }
    for (const subscriberId of input.subscriberIds) {
      recipients.add(subscriberId);
    }
  }

  if (
    input.activity === "comment_added" ||
    input.activity === "comment_edited" ||
    input.activity === "comment_deleted"
  ) {
    if (input.actorIsAdmin) {
      recipients.add(input.reporterId);
      for (const subscriberId of input.subscriberIds) {
        recipients.add(subscriberId);
      }
    } else {
      for (const adminId of input.adminIds) {
        recipients.add(adminId);
      }
      for (const subscriberId of input.subscriberIds) {
        recipients.add(subscriberId);
      }
    }
  }

  if (
    input.activity === "status_changed" ||
    input.activity === "closed" ||
    input.activity === "reopened"
  ) {
    recipients.add(input.reporterId);
    for (const subscriberId of input.subscriberIds) {
      recipients.add(subscriberId);
    }
  }

  if (!input.isPublic) {
    for (const candidateId of Array.from(recipients)) {
      if (candidateId !== input.reporterId && !input.adminIds.has(candidateId)) {
        recipients.delete(candidateId);
      }
    }
  }

  recipients.delete(input.actorId);
  return recipients;
}

function notificationMeta(activity: Activity): {
  type: NotificationType;
  title: string;
} {
  if (activity === "created") {
    return {
      type: "support_ticket_created",
      title: "New support request",
    };
  }
  if (activity === "content_updated") {
    return {
      type: "support_ticket_updated",
      title: "Ticket updated",
    };
  }
  if (activity === "comment_added") {
    return {
      type: "support_ticket_comment_added",
      title: "New comment on ticket",
    };
  }
  if (activity === "comment_edited") {
    return {
      type: "support_ticket_comment_edited",
      title: "Comment edited on ticket",
    };
  }
  if (activity === "comment_deleted") {
    return {
      type: "support_ticket_comment_deleted",
      title: "Comment removed",
    };
  }
  if (activity === "status_changed") {
    return {
      type: "support_ticket_status_changed",
      title: "Ticket status updated",
    };
  }
  if (activity === "closed") {
    return {
      type: "support_ticket_closed",
      title: "Ticket closed",
    };
  }
  return {
    type: "support_ticket_reopened",
    title: "Ticket reopened",
  };
}

export const notifyTicketActivity = inngest.createFunction(
  {
    id: "notify-ticket-activity",
    concurrency: {
      limit: 10,
      key: "event.data.ticket_id",
    },
  },
  { event: "support/ticket.activity" },
  async ({ event, step }) => {
    const admin = createAdminClient();

    const ticket = await step.run("fetch-ticket-context", async (): Promise<TicketContext | null> => {
      const { data, error } = await admin
        .from("tickets")
        .select("id, user_id, title, is_public")
        .eq("id", event.data.ticket_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return data as TicketContext;
    });

    if (!ticket) {
      return {
        notified: false,
        reason: "ticket-not-found",
      };
    }

    const recipientIds = await step.run("resolve-recipients", async () => {
      const [{ data: adminRows, error: adminError }, { data: subscriberRows, error: subscriberError }] = await Promise.all([
        admin.from("profiles").select("id").eq("role", "sysadmin"),
        admin
          .from("ticket_subscriptions")
          .select("user_id")
          .eq("ticket_id", event.data.ticket_id),
      ]);

      if (adminError) throw new Error(adminError.message);
      if (subscriberError) throw new Error(subscriberError.message);

      const adminIds = new Set((adminRows || []).map((row) => row.id));
      const subscriberIds = new Set((subscriberRows || []).map((row) => row.user_id));

      const resolved = resolveRecipients({
        activity: event.data.activity,
        actorIsAdmin: event.data.actor_is_admin,
        actorId: event.data.actor_user_id,
        reporterId: ticket.user_id,
        isPublic: ticket.is_public,
        adminIds,
        subscriberIds,
      });

      return Array.from(resolved);
    });

    if (recipientIds.length === 0) {
      return {
        notified: false,
        reason: "no-recipients",
      };
    }

    await step.run("insert-notifications", async () => {
      const meta = notificationMeta(event.data.activity);
      const { error } = await admin.from("notifications").insert(
        recipientIds.map((recipientId) => ({
          user_id: recipientId,
          type: meta.type,
          title: meta.title,
          body: `Re: ${ticket.title}`,
          data: {
            ticket_id: event.data.ticket_id,
            actor_user_id: event.data.actor_user_id,
            activity: event.data.activity,
            from_status: event.data.from_status ?? null,
            to_status: event.data.to_status ?? null,
          },
        }))
      );
      if (error) throw new Error(error.message);
    });

    return {
      notified: true,
      recipients_count: recipientIds.length,
    };
  }
);
