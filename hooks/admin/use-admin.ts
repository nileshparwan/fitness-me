"use client";

import {
  getAdminDashboardStats,
  getAdminNutritionStats,
  getAdminUsers,
  getAdminSettingsSnapshot,
  getAdminTrainingStats,
  getAdminUserDetail,
  getAdminUserStats,
  setAdminUserBlocked,
  updateAdminUserRole,
} from "@/app/actions/admin";
import { Database } from "@/types/database";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AppRole = Database["public"]["Enums"]["user_role"];

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: getAdminDashboardStats,
    staleTime: 60_000,
  });
}

export function useInfiniteAdminUsers(search = "", pageSize = 100) {
  return useInfiniteQuery({
    queryKey: ["admin", "users", search, pageSize],
    queryFn: ({ pageParam }) => getAdminUsers(search, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.page + 1 : undefined),
  });
}

export function useAdminUserStats(days = 90) {
  return useQuery({
    queryKey: ["admin", "user-stats", days],
    queryFn: () => getAdminUserStats(days),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getAdminUserDetail(userId),
    enabled: Boolean(userId),
  });
}

export function useAdminTrainingStats(days = 30) {
  return useQuery({
    queryKey: ["admin", "training-stats", days],
    queryFn: () => getAdminTrainingStats(days),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminNutritionStats(days = 30) {
  return useQuery({
    queryKey: ["admin", "nutrition-stats", days],
    queryFn: () => getAdminNutritionStats(days),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminSettingsSnapshot() {
  return useQuery({
    queryKey: ["admin", "settings-snapshot"],
    queryFn: getAdminSettingsSnapshot,
  });
}

export function useUpdateAdminUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; role: AppRole }) => {
      return await updateAdminUserRole(payload.userId, payload.role);
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-stats"] });
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useSetAdminUserBlocked() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; blocked: boolean }) => {
      return await setAdminUserBlocked(payload.userId, payload.blocked);
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-stats"] });
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
