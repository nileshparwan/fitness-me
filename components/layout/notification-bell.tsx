"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Bell,
  CheckCircle2,
  CheckSquare,
  FileEdit,
  Inbox,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Target,
  Utensils,
  X,
} from "lucide-react";

import {
  dismissAllNotificationsAction,
  dismissNotificationAction,
  type NotificationRow,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationsRealtimeSync } from "@/hooks/use-notifications-realtime";
import { useNotificationCount, useNotifications } from "@/hooks/use-notifications";
import { notificationKeys } from "@/lib/query-keys";
import { cn } from "@/utils";

function notificationMeta(type: NotificationRow["type"]) {
  if (type === "goal_achieved") return { icon: Target, toneClass: "bg-emerald-100 text-emerald-600" };
  if (type === "checkin_submitted") return { icon: CheckSquare, toneClass: "bg-blue-100 text-blue-600" };
  if (type === "meal_reminder") return { icon: Utensils, toneClass: "bg-orange-100 text-orange-600" };
  if (type === "health_checkin_reminder") return { icon: Activity, toneClass: "bg-teal-100 text-teal-600" };
  if (type === "goal_checkin_reminder") return { icon: Target, toneClass: "bg-amber-100 text-amber-600" };
  if (type === "support_ticket_created") return { icon: Inbox, toneClass: "bg-violet-100 text-violet-600" };
  if (type === "support_ticket_updated") return { icon: FileEdit, toneClass: "bg-amber-100 text-amber-600" };
  if (type === "support_ticket_comment_added") return { icon: MessageSquare, toneClass: "bg-sky-100 text-sky-600" };
  if (type === "support_ticket_comment_edited") return { icon: MessageSquare, toneClass: "bg-sky-100 text-sky-600" };
  if (type === "support_ticket_comment_deleted") {
    return { icon: MessageSquare, toneClass: "bg-slate-100 text-slate-600" };
  }
  if (type === "support_ticket_status_changed") {
    return { icon: RefreshCw, toneClass: "bg-orange-100 text-orange-600" };
  }
  if (type === "support_ticket_closed") {
    return { icon: CheckCircle2, toneClass: "bg-emerald-100 text-emerald-600" };
  }
  return { icon: RotateCcw, toneClass: "bg-blue-100 text-blue-600" };
}

function formatRelativeTime(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function getTicketIdFromNotification(notification: NotificationRow) {
  const value = notification.data.ticket_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getActionUrlFromNotification(notification: NotificationRow) {
  const value = notification.data.url;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function NotificationBell({
  userId,
  className,
}: {
  userId: string | null;
  className?: string;
}) {
  useNotificationsRealtimeSync(userId);

  const queryClient = useQueryClient();
  const countQuery = useNotificationCount();
  const feedQuery = useNotifications();

  const [open, setOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const count = countQuery.data ?? 0;
  const notifications = feedQuery.data ?? [];
  const loadingFeed = feedQuery.isFetching && !feedQuery.data;
  const showEmptyState = !loadingFeed && (count === 0 || notifications.length === 0);

  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };

  const dismissOne = async (id: string) => {
    setDismissingId(id);
    try {
      await dismissNotificationAction(id);
      await refreshNotifications();
    } finally {
      setDismissingId(null);
    }
  };

  const clearAll = async () => {
    setClearingAll(true);
    try {
      await dismissAllNotificationsAction();
      await refreshNotifications();
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            void feedQuery.refetch();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="relative h-9 w-9 rounded-xl border border-border/70 bg-background/80 p-0 hover:bg-muted/60"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {notifications.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-md px-2 text-xs"
                onClick={() => void clearAll()}
                disabled={clearingAll || dismissingId !== null}
              >
                {clearingAll ? "Clearing..." : "Clear all"}
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loadingFeed ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`notification-skeleton-${index}`} className="flex items-start gap-3 p-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                  </div>
                </div>
              ))
            ) : showEmptyState ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((notification) => {
                const meta = notificationMeta(notification.type);
                const Icon = meta.icon;
                const isDismissing = dismissingId === notification.id;
                const ticketId = getTicketIdFromNotification(notification);
                const actionUrl = getActionUrlFromNotification(notification);
                const href = ticketId ? `/support/${ticketId}` : actionUrl;
                const content = (
                  <>
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.toneClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                      <p className="text-[11px] text-muted-foreground">{formatRelativeTime(notification.created_at)}</p>
                    </div>
                  </>
                );

                return (
                  <div key={notification.id} className="group flex items-start gap-3 p-3">
                    {href ? (
                      <Link
                        href={href}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-md hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setOpen(false)}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => void dismissOne(notification.id)}
                      disabled={isDismissing || clearingAll}
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
