"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ArrowUp, Loader2, MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updateTicketContentAction, type TicketCategory, type TicketCommentDetail, type TicketStatus } from "@/app/actions/tickets";
import { TicketDetailSkeleton } from "@/components/support/ticket-skeletons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCommentMutations, useComments } from "@/hooks/use-comments";
import { useSupportTicketsRealtimeSync } from "@/hooks/use-support-tickets-realtime-sync";
import { useTicketSubscriptionMutations, useTicketSubscriptionState } from "@/hooks/use-ticket-subscriptions";
import { useTicketDetail, useTicketMutations } from "@/hooks/use-tickets";
import { Skeleton } from "@/components/ui/skeleton";

const CommentComposer = dynamic(
  () => import("@/components/support/comment-composer").then((module) => module.CommentComposer),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2">
        <Skeleton className="h-[100px] w-full" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    ),
  }
);

function getStatusClass(status: TicketStatus) {
  if (status === "resolved") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "closed") return "border-border bg-muted text-muted-foreground";
  if (status === "in_progress") return "border-secondary/40 bg-secondary/20 text-secondary-foreground";
  return "border-primary/30 bg-primary/15 text-primary";
}

function getCategoryClass(category: TicketCategory) {
  if (category === "bug_report") return "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (category === "feature_request") return "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (category === "exercise_request") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

function humanizeCategory(category: TicketCategory) {
  return category.replaceAll("_", " ");
}

function initialsFromName(name: string) {
  const chunks = name.split(" ").filter(Boolean);
  if (chunks.length === 0) return "U";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
}

export default function SupportTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = typeof params?.id === "string" ? params.id : "";
  useSupportTicketsRealtimeSync({ ticketId });
  const [commentText, setCommentText] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TicketCommentDetail | null>(null);

  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingTicket, startTicketTransition] = useTransition();

  const ticketQuery = useTicketDetail(ticketId);
  const ticket = ticketQuery.data;

  const commentsQuery = useComments(ticketId);
  const comments = commentsQuery.data || [];
  const { toggleUpvote } = useTicketMutations();
  const subscriptionStateQuery = useTicketSubscriptionState(ticketId);
  const subscriptionMutations = useTicketSubscriptionMutations(ticketId);
  const commentMutations = useCommentMutations(ticketId, {
    id: ticket?.viewer_user_id || "viewer",
    name: "You",
  });

  const updateTicketMutation = useMutation({
    mutationFn: updateTicketContentAction,
    onSuccess: () => {
      toast.success("Ticket updated");
      void ticketQuery.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket");
    },
  });

  const isClosed = ticket?.status === "closed";
  const canEditTicket = Boolean(ticket && ticket.viewer_user_id === ticket.user_id && !isClosed);
  const isReporter = Boolean(ticket && ticket.viewer_user_id === ticket.user_id);
  const viewerIsAdmin = ticket?.viewer_is_admin ?? false;
  const isSubscribed = subscriptionStateQuery.data?.is_subscribed ?? false;
  const canSubscribe = subscriptionStateQuery.data?.can_subscribe ?? false;
  const canShowSubscriptionButton =
    Boolean(ticket) &&
    !viewerIsAdmin &&
    (isSubscribed || canSubscribe);
  const subscriptionBusy =
    subscriptionStateQuery.isLoading ||
    subscriptionMutations.subscribe.isPending ||
    subscriptionMutations.unsubscribe.isPending;

  const onUpvote = async () => {
    if (!ticket) return;
    try {
      await toggleUpvote.mutateAsync(ticket.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle upvote");
    }
  };

  const onSubmitComment = async () => {
    const content = commentText.trim();
    if (!content || isClosed) return;
    try {
      await commentMutations.addComment.mutateAsync(content);
      setCommentText("");
      toast.success("Comment posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    }
  };

  const onSaveTicket = () => {
    if (!ticket) return;
    startTicketTransition(async () => {
      await updateTicketMutation.mutateAsync({
        ticket_id: ticket.id,
        title: editTitle,
        description: editDescription,
      });
      setIsEditTicketOpen(false);
    });
  };

  const onSubscriptionClick = async () => {
    if (!ticket) return;
    try {
      if (isSubscribed) {
        if (isReporter) return;
        await subscriptionMutations.unsubscribe.mutateAsync();
        toast.success("Unsubscribed from ticket");
        return;
      }
      await subscriptionMutations.subscribe.mutateAsync();
      toast.success("Subscribed to ticket updates");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    }
  };

  const onStartEdit = () => {
    if (!ticket) return;
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setIsEditTicketOpen(true);
  };

  const onStartEditComment = (comment: TicketCommentDetail) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const onSaveComment = async () => {
    if (!editingCommentId) return;
    const content = editingCommentText.trim();
    if (!content) return;
    try {
      await commentMutations.updateComment.mutateAsync({
        commentId: editingCommentId,
        content,
      });
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success("Comment updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update comment");
    }
  };

  const onDeleteComment = async () => {
    if (!deleteTarget) return;
    try {
      const result = await commentMutations.deleteComment.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      if (result?.no_op) {
        toast.info("Comment was already removed");
      } else {
        toast.success("Comment deleted");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const pageState = useMemo(() => {
    if (ticketQuery.isLoading) return "loading";
    if (ticketQuery.isError) return "error";
    if (!ticket) return "empty";
    return "ready";
  }, [ticketQuery.isLoading, ticketQuery.isError, ticket]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/support">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Support
        </Link>
      </Button>

      {pageState === "loading" ? (
        <TicketDetailSkeleton />
      ) : null}

      {pageState === "error" ? (
        <section className="native-surface surface-pad text-sm text-destructive">
          {ticketQuery.error instanceof Error ? ticketQuery.error.message : "Failed to load ticket"}
        </section>
      ) : null}

      {pageState === "empty" ? (
        <section className="native-surface surface-pad">
          <p className="text-sm text-muted-foreground">Ticket not found or unavailable.</p>
        </section>
      ) : null}

      {pageState === "ready" && ticket ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-6">
              <section className="color-card native-surface surface-pad space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="page-title-gradient text-xl font-semibold">{ticket.title}</h1>
                    {canEditTicket ? (
                      <Button variant="outline" size="sm" onClick={onStartEdit}>
                        <Pencil className="icon-accent mr-2 h-4 w-4" />
                        Edit Ticket
                      </Button>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{ticket.description}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Avatar size="sm">
                    <AvatarImage src={ticket.author.avatar_url || undefined} alt={ticket.author.name} />
                    <AvatarFallback>{initialsFromName(ticket.author.name)}</AvatarFallback>
                  </Avatar>
                  <span>{ticket.author.name}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                </div>
              </section>

              <section className="color-card native-surface surface-pad space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="icon-accent h-4 w-4" />
                  <h2 className="text-base font-semibold">Comments</h2>
                </div>

                {commentsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : (
                  <></>
                )}
                {commentsQuery.isError ? (
                  <p className="text-sm text-destructive">
                    {commentsQuery.error instanceof Error ? commentsQuery.error.message : "Failed to load comments"}
                  </p>
                ) : null}
                {commentsQuery.isPlaceholderData ? (
                  <p className="text-xs text-muted-foreground">Refreshing comments...</p>
                ) : null}

                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    comments.map((comment) => {
                      const canManageComment = ticket.viewer_user_id === comment.user_id && !isClosed;
                      const isEditing = editingCommentId === comment.id;
                      return (
                        <div key={comment.id} className="rounded-md border bg-card/80 p-3 transition-colors hover:bg-primary/5">
                          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Avatar size="sm">
                                <AvatarImage src={comment.author.avatar_url || undefined} alt={comment.author.name} />
                                <AvatarFallback>{initialsFromName(comment.author.name)}</AvatarFallback>
                              </Avatar>
                              <span>{comment.author.name}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                            </div>
                            {canManageComment ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => onStartEditComment(comment)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(comment)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentText}
                                onChange={(event) => setEditingCommentText(event.target.value)}
                                className="min-h-24"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingCommentText("");
                                  }}
                                  disabled={commentMutations.updateComment.isPending}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void onSaveComment()}
                                  disabled={commentMutations.updateComment.isPending || editingCommentText.trim().length === 0}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {isClosed ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    This ticket is closed. No further comments can be added.
                  </div>
                ) : (
                  <>
                    {!showComposer ? (
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowComposer(true)}>
                          Write Comment
                        </Button>
                      </div>
                    ) : (
                      <CommentComposer
                        value={commentText}
                        onChange={setCommentText}
                        onSubmit={() => void onSubmitComment()}
                        isPending={commentMutations.addComment.isPending}
                      />
                    )}
                  </>
                )}
              </section>
            </div>

            <aside className="color-card native-surface surface-pad h-fit space-y-3 lg:sticky lg:top-6">
              <h2 className="text-sm font-semibold">Ticket Info</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`capitalize ${getCategoryClass(ticket.category)}`}>
                  {humanizeCategory(ticket.category)}
                </Badge>
                <Badge className={`capitalize ${getStatusClass(ticket.status)}`}>
                  {ticket.status.replaceAll("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{ticket.upvotes} upvotes</p>
              {canShowSubscriptionButton ? (
                <Button
                  className="w-full"
                  variant={isSubscribed ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => void onSubscriptionClick()}
                  disabled={subscriptionBusy || (isSubscribed && isReporter)}
                  title={isSubscribed && !isReporter ? "Unsubscribe" : undefined}
                >
                  {subscriptionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Button>
              ) : null}
              {ticket.is_public && !isClosed ? (
                <Button
                  className="w-full"
                  variant={ticket.viewer_has_upvoted ? "default" : "outline"}
                  size="sm"
                  onClick={() => void onUpvote()}
                  disabled={toggleUpvote.isPending}
                >
                  {toggleUpvote.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  {ticket.viewer_has_upvoted ? "Remove upvote" : "Upvote"}
                </Button>
              ) : null}
            </aside>
          </div>
        </>
      ) : null}

      <Dialog open={isEditTicketOpen} onOpenChange={setIsEditTicketOpen}>
        <DialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto md:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ticket</DialogTitle>
            <DialogDescription>Update your ticket title and description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="min-h-[140px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTicketOpen(false)} disabled={savingTicket}>
              Cancel
            </Button>
            <Button
              onClick={onSaveTicket}
              disabled={savingTicket || editTitle.trim().length < 3 || editDescription.trim().length < 10}
            >
              {savingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[95vw] max-h-[85vh] overflow-y-auto md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={commentMutations.deleteComment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={commentMutations.deleteComment.isPending}
              onClick={() => void onDeleteComment()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
