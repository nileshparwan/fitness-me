"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  revalidatePath("/support/[id]");
  revalidatePath(`/support/${ticketId}`);
}

export async function updateCommentAction(input: z.input<typeof updateCommentSchema>) {
  const payload = updateCommentSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: comment, error: commentError } = await supabase
    .from("ticket_comments")
    .select("id, user_id, ticket_id")
    .eq("id", payload.comment_id)
    .single();
  if (commentError || !comment) throw new Error(commentError?.message || "Comment not found");
  if (comment.user_id !== user.id) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("ticket_comments")
    .update({ content: payload.content.trim() })
    .eq("id", payload.comment_id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  revalidateSupportPaths(comment.ticket_id);
  return { success: true, comment: data };
}

export async function deleteCommentAction(input: z.input<typeof deleteCommentSchema>) {
  const payload = deleteCommentSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: comment, error: commentError } = await supabase
    .from("ticket_comments")
    .select("id, user_id, ticket_id")
    .eq("id", payload.comment_id)
    .single();
  if (commentError || !comment) throw new Error(commentError?.message || "Comment not found");
  if (comment.user_id !== user.id) throw new Error("Unauthorized");

  const { error } = await supabase.from("ticket_comments").delete().eq("id", payload.comment_id);
  if (error) throw new Error(error.message);

  revalidateSupportPaths(comment.ticket_id);
  return { success: true, comment_id: payload.comment_id };
}
