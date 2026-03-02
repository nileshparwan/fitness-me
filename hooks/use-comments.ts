"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createTicketCommentAction,
  listTicketCommentsAction,
  type TicketCommentDetail,
} from "@/app/actions/tickets";
import { deleteCommentAction, updateCommentAction } from "@/app/actions/comments";
import { ticketKeys, commentKeys } from "@/lib/query-keys";

type ViewerMeta = {
  id: string;
  name?: string;
  avatar_url?: string | null;
};

export function useComments(ticketId: string) {
  return useQuery({
    queryKey: commentKeys.list(ticketId),
    queryFn: () => listTicketCommentsAction(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useCommentMutations(ticketId: string, viewer?: ViewerMeta) {
  const queryClient = useQueryClient();

  const addComment = useMutation({
    mutationFn: (content: string) =>
      createTicketCommentAction({
        ticket_id: ticketId,
        content,
      }),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(ticketId) });
      const previous = queryClient.getQueryData<TicketCommentDetail[]>(
        commentKeys.list(ticketId)
      );

      const optimistic: TicketCommentDetail = {
        id: `optimistic-${crypto.randomUUID()}`,
        ticket_id: ticketId,
        user_id: viewer?.id || "viewer",
        content,
        created_at: new Date().toISOString(),
        author: {
          id: viewer?.id || "viewer",
          name: viewer?.name || "You",
          avatar_url: viewer?.avatar_url ?? null,
        },
      };

      queryClient.setQueryData<TicketCommentDetail[]>(commentKeys.list(ticketId), [
        ...(previous || []),
        optimistic,
      ]);

      return { previous };
    },
    onError: (_error, _content, context) => {
      if (!context) return;
      queryClient.setQueryData(commentKeys.list(ticketId), context.previous);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
      ]);
    },
  });

  const updateComment = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateCommentAction({
        comment_id: commentId,
        content,
      }),
    onMutate: async ({ commentId, content }) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(ticketId) });
      const previous = queryClient.getQueryData<TicketCommentDetail[]>(
        commentKeys.list(ticketId)
      );

      queryClient.setQueryData<TicketCommentDetail[]>(
        commentKeys.list(ticketId),
        (current = []) =>
          current.map((item) =>
            item.id === commentId
              ? {
                  ...item,
                  content,
                }
              : item
          )
      );

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      queryClient.setQueryData(commentKeys.list(ticketId), context.previous);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
      ]);
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      deleteCommentAction({
        comment_id: commentId,
      }),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.list(ticketId) });
      const previous = queryClient.getQueryData<TicketCommentDetail[]>(
        commentKeys.list(ticketId)
      );

      queryClient.setQueryData<TicketCommentDetail[]>(
        commentKeys.list(ticketId),
        (current = []) => current.filter((item) => item.id !== commentId)
      );

      return { previous };
    },
    onError: (_error, _commentId, context) => {
      if (!context) return;
      queryClient.setQueryData(commentKeys.list(ticketId), context.previous);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.list(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
      ]);
    },
  });

  return {
    addComment,
    updateComment,
    deleteComment,
  };
}

export function useAddComment(ticketId: string, viewer?: ViewerMeta) {
  return useCommentMutations(ticketId, viewer).addComment;
}
