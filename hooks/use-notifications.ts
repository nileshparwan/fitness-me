"use client";

import { useQuery } from "@tanstack/react-query";

import { getNotificationCountAction, getNotificationsAction } from "@/app/actions/notifications";
import { notificationKeys } from "@/lib/query-keys";

export function useNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.count(),
    queryFn: getNotificationCountAction,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.feed(),
    queryFn: getNotificationsAction,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    enabled: false,
    refetchOnWindowFocus: false,
  });
}
