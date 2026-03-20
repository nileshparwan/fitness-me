"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const updateCommentSchema = z.object({
  comment_id: z.string().uuid(),
  content: z.string().trim().min(1).max(4000),
});

const deleteCommentSchema = z.object({
  comment_id: z.string().uuid(),
});

function revalidateSupportPaths(ticketId: string) {
  revalidatePath("/support");
  revalidatePath("/support/[id]", "page");
  revalidatePath(`/support/${ticketId}`);
}

function isAdminRoleValue(value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "sysadmin" || normalized === "admin";
}

export async function updateCommentAction(input: z.input<typeof updateCommentSchema>) {
  const payload = updateCommentSchema.parse(input);
  return runTrackedAction({
    eventName: "support.comment.update",
    payload: { comment_id: payload.comment_id },
    action: async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: comment, error: commentError } = await supabase
        .from("ticket_comments")
        .select("id, user_id, ticket_id, content")
        .eq("id", payload.comment_id)
        .maybeSingle();
      if (commentError) throw new Error(commentError.message);
      if (!comment) throw new Error("Comment not found");
      if (comment.user_id !== user.id) throw new Error("Unauthorized");

      const nextContent = payload.content.trim();
      if (nextContent === comment.content) {
        return { success: true, comment };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const actorIsAdmin =
        isAdminRoleValue(profile?.role) ||
        isAdminRoleValue(String(user.app_metadata?.role || ""));

      const { data, error } = await supabase
        .from("ticket_comments")
        .update({ content: nextContent })
        .eq("id", payload.comment_id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Comment not found");

      void inngest.send({
        name: "support/ticket.activity",
        data: {
          ticket_id: comment.ticket_id,
          actor_user_id: user.id,
          activity: "comment_edited",
          actor_is_admin: actorIsAdmin,
        },
      });

      revalidateSupportPaths(comment.ticket_id);
      return { success: true, comment: data };
    },
  });
}

export async function deleteCommentAction(input: z.input<typeof deleteCommentSchema>) {
  const payload = deleteCommentSchema.parse(input);
  return runTrackedAction({
    eventName: "support.comment.delete",
    payload: { comment_id: payload.comment_id },
    action: async () => {
      const supabase = await createClient();
      const admin = createAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const actorIsAdmin =
        isAdminRoleValue(profile?.role) ||
        isAdminRoleValue(String(user.app_metadata?.role || ""));

      const { data: existingComment, error: existingCommentError } = await admin
        .from("ticket_comments")
        .select("id, user_id, ticket_id")
        .eq("id", payload.comment_id)
        .maybeSingle();
      if (existingCommentError) throw new Error(existingCommentError.message);

      // Idempotent delete: stale retries or double-click submits should not fail the request.
      if (!existingComment) {
        return { success: true, comment_id: payload.comment_id, no_op: true as const };
      }

      if (existingComment.user_id !== user.id && !actorIsAdmin) {
        throw new Error("Unauthorized");
      }

      const { data: deletedComment, error: deleteError } = await admin
        .from("ticket_comments")
        .delete()
        .eq("id", payload.comment_id)
        .select("id, ticket_id")
        .maybeSingle();
      if (deleteError) throw new Error(deleteError.message);
      if (!deletedComment) {
        throw new Error("Comment could not be deleted. Please refresh and try again.");
      }

      void inngest.send({
        name: "support/ticket.activity",
        data: {
          ticket_id: deletedComment.ticket_id,
          actor_user_id: user.id,
          activity: "comment_deleted",
          actor_is_admin: actorIsAdmin,
        },
      });

      revalidateSupportPaths(deletedComment.ticket_id);
      return { success: true, comment_id: payload.comment_id };
    },
  });
}
