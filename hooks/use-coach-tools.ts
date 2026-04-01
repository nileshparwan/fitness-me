"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  assignTemplateToClientAction,
  createBillingPlanAction,
  createClientGoalAction,
  createMyGoalAction,
  createClientCheckinAction,
  createCoachNoteAction,
  createCoachPlanTemplateAction,
  deleteClientPaymentAction,
  deleteClientGoalAction,
  deleteMyGoalAction,
  getClientBillingPlanAction,
  getClientPaymentLogStatsAction,
  getTodayLogsAction,
  getClientNextSessionAction,
  listClientBillingPlanHistoryAction,
  listClientPaymentLogsAction,
  listClientGoalsAction,
  listMyGoalsAction,
  listCoachPaymentsDashboardAction,
  listClientAssignmentsAction,
  listClientCheckinsAction,
  listClientDetailAction,
  logSessionAction,
  listClientNotesAction,
  listClientPaymentsAction,
  listClientSessionsByRangeAction,
  listClientTodaySessionsAction,
  listCoachClientsAction,
  listCoachPlanTemplatesAction,
  logClientWorkoutAction,
  recordClientPaymentAction,
  renewPackageAction,
  removeClientAction,
  updateBillingPlanAction,
  updateClientPaymentDetailsAction,
  updateClientGoalAction,
  updateClientGoalStatusAction,
  updateMyGoalAction,
  updateMyGoalStatusAction,
  updateClientPaymentStatusAction,
  updateClientCheckinAction,
  updateCoachNoteAction,
  deleteSessionLogAction,
  upsertClientAction,
  type BillingType,
  type ClientGoalItem,
  type ClientGoalsPayload,
  type ClientPaymentLogsPayload,
  type ClientBillingPlanWithRemaining,
  type ClientPaymentLogStats,
  type CoachPaymentsDashboard,
  type PaymentLogRow,
  type PaymentAlert,
} from "@/app/actions/coach-tools";
import {
  coachKeys,
  type ClientPaymentLogsKeyParams,
  type CoachClientsKeyParams,
  type CoachPaymentsKeyParams,
} from "@/lib/query-keys-coach";
import { Database } from "@/types/database";

type ClientPaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];
type GoalStatusFilter = "all" | "active" | "on_track" | "at_risk" | "completed" | "paused" | "archived";
const GOAL_STATUS_FILTER_VALUES: GoalStatusFilter[] = [
  "all",
  "active",
  "on_track",
  "at_risk",
  "completed",
  "paused",
  "archived",
];

function statusFilterFromGoalQueryKey(queryKey: QueryKey): GoalStatusFilter {
  const statusSegment = queryKey[queryKey.length - 1];
  if (typeof statusSegment === "string" && GOAL_STATUS_FILTER_VALUES.includes(statusSegment as GoalStatusFilter)) {
    return statusSegment as GoalStatusFilter;
  }
  return "all";
}

export function useCoachClients(params: CoachClientsKeyParams & { enabled?: boolean }) {
  const { enabled = true, ...keyParams } = params;
  return useInfiniteQuery({
    queryKey: coachKeys.clientList(keyParams) as QueryKey,
    queryFn: ({ pageParam }) =>
      listCoachClientsAction({
        cursor: (pageParam as string | null) ?? null,
        page_size: keyParams.pageSize ?? 12,
        search: keyParams.search?.trim() || undefined,
        status: keyParams.status && keyParams.status !== "all" ? keyParams.status : undefined,
        sort_by: keyParams.sortBy ?? "updated_at",
        sort_dir: keyParams.sortDir ?? "desc",
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientDetail(
  clientId: string,
  options?: {
    initialData?: Awaited<ReturnType<typeof listClientDetailAction>>;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: coachKeys.clientDetail(clientId),
    queryFn: () => listClientDetailAction(clientId),
    initialData: options?.initialData,
    enabled: options?.enabled ?? Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCoachPlanTemplates() {
  return useQuery({
    queryKey: coachKeys.templates(),
    queryFn: () => listCoachPlanTemplatesAction(),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientAssignments(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientAssignments(clientId),
    queryFn: () => listClientAssignmentsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientNextSession(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientNextSession(clientId),
    queryFn: () => getClientNextSessionAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientTodaySessions(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientTodaySessions(clientId),
    queryFn: () => listClientTodaySessionsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientSessionsRange(clientId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: coachKeys.clientSessionsRange(clientId, startDate, endDate),
    queryFn: () =>
      listClientSessionsByRangeAction({
        client_id: clientId,
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: Boolean(clientId && startDate && endDate),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientCheckins(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientCheckins(clientId),
    queryFn: () => listClientCheckinsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientNotes(clientId),
    queryFn: () => listClientNotesAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientGoals(
  clientId: string,
  status: GoalStatusFilter = "all",
  limit = 80,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? Boolean(clientId);
  return useQuery<ClientGoalsPayload>({
    queryKey: coachKeys.clientGoals(clientId, status),
    queryFn: () =>
      listClientGoalsAction({
        client_id: clientId,
        status,
        limit,
      }),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useMyGoals(
  status: GoalStatusFilter = "all",
  limit = 80,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  return useQuery<ClientGoalsPayload>({
    queryKey: coachKeys.myGoals(status),
    queryFn: () =>
      listMyGoalsAction({
        status,
        limit,
      }),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientPayments(clientId: string) {
  return useQuery<{ rows: ClientPaymentRow[]; alerts: PaymentAlert[] }>({
    queryKey: coachKeys.clientPayments(clientId),
    queryFn: () => listClientPaymentsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientBillingPlan(
  clientId: string,
  options?: {
    initialData?: ClientBillingPlanWithRemaining | null;
  }
) {
  return useQuery<ClientBillingPlanWithRemaining | null>({
    queryKey: coachKeys.billingPlan(clientId),
    queryFn: () => getClientBillingPlanAction(clientId),
    initialData: options?.initialData,
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientBillingPlanHistory(
  clientId: string,
  options?: {
    initialData?: ClientBillingPlanWithRemaining[];
  }
) {
  return useQuery<ClientBillingPlanWithRemaining[]>({
    queryKey: coachKeys.billingPlanHistory(clientId),
    queryFn: () => listClientBillingPlanHistoryAction(clientId),
    initialData: options?.initialData,
    enabled: Boolean(clientId),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientPaymentLogs(
  clientId: string,
  params?: ClientPaymentLogsKeyParams,
  options?: {
    initialData?: ClientPaymentLogsPayload;
  }
) {
  return useQuery<ClientPaymentLogsPayload>({
    queryKey: coachKeys.paymentLogs(clientId, params),
    queryFn: () =>
      listClientPaymentLogsAction({
        client_id: clientId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        limit: params?.limit ?? 20,
        page: params?.page ?? 0,
        sort_by: params?.sortBy ?? "session_date",
        sort_dir: params?.sortDir ?? "desc",
        status: params?.status ?? "all",
        search: params?.search?.trim() || undefined,
      }),
    initialData: options?.initialData,
    enabled: Boolean(clientId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientPaymentLogStats(
  clientId: string,
  options?: {
    initialData?: ClientPaymentLogStats;
  }
) {
  return useQuery<ClientPaymentLogStats>({
    queryKey: [...coachKeys.clients(), "payment-log-stats", clientId],
    queryFn: () => getClientPaymentLogStatsAction(clientId),
    initialData: options?.initialData,
    enabled: Boolean(clientId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useTodayLogs() {
  return useQuery<Record<string, PaymentLogRow>>({
    queryKey: coachKeys.todayLogs(),
    queryFn: () => getTodayLogsAction(),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useCoachPaymentsDashboard(
  params?: CoachPaymentsKeyParams,
  options?: {
    initialData?: CoachPaymentsDashboard;
  }
) {
  return useQuery<CoachPaymentsDashboard>({
    queryKey: coachKeys.paymentsSnapshot(params),
    queryFn: () =>
      listCoachPaymentsDashboardAction({
        search: params?.search?.trim() || undefined,
        status: params?.status || "all",
        limit: params?.limit ?? 1000,
        cursor: params?.cursor ?? null,
        page: params?.page ?? 0,
        page_size: params?.pageSize ?? 10,
        sort_by: params?.sortBy ?? "created_at",
        sort_dir: params?.sortDir ?? "desc",
      }),
    initialData: options?.initialData,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useCoachToolMutations() {
  const queryClient = useQueryClient();
  const goalsQueryPrefix = (clientId: string): QueryKey => [...coachKeys.clients(), "goals", clientId];
  const myGoalsQueryPrefix = (): QueryKey => [...coachKeys.all, "my-goals"];

  const listGoalQuerySnapshots = (clientId: string) =>
    queryClient.getQueriesData<ClientGoalsPayload>({ queryKey: goalsQueryPrefix(clientId) });
  const listMyGoalQuerySnapshots = () =>
    queryClient.getQueriesData<ClientGoalsPayload>({ queryKey: myGoalsQueryPrefix() });

  const upsertGoalCaches = (clientId: string, nextGoal: ClientGoalItem) => {
    const snapshots = listGoalQuerySnapshots(clientId);
    for (const [queryKey, payload] of snapshots) {
      if (!payload) continue;
      const statusFilter = statusFilterFromGoalQueryKey(queryKey);
      const nextCategories = payload.categories.includes(nextGoal.category)
        ? payload.categories
        : [...payload.categories, nextGoal.category].sort((a, b) => a.localeCompare(b));
      const nextGoalsBase = payload.goals.filter((goal) => goal.id !== nextGoal.id);
      const shouldIncludeGoal = statusFilter === "all" || nextGoal.status === statusFilter;
      const nextGoals = shouldIncludeGoal ? [nextGoal, ...nextGoalsBase] : nextGoalsBase;
      queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
        ...payload,
        categories: nextCategories,
        goals: nextGoals,
      });
    }
  };

  const removeGoalCaches = (clientId: string, goalId: string) => {
    const snapshots = listGoalQuerySnapshots(clientId);
    for (const [queryKey, payload] of snapshots) {
      if (!payload) continue;
      const nextGoals = payload.goals.filter((goal) => goal.id !== goalId);
      const nextCategories = Array.from(new Set(nextGoals.map((goal) => goal.category))).sort((a, b) =>
        a.localeCompare(b)
      );
      queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
        ...payload,
        categories: nextCategories,
        goals: nextGoals,
      });
    }
  };

  const upsertMyGoalCaches = (nextGoal: ClientGoalItem) => {
    const snapshots = listMyGoalQuerySnapshots();
    for (const [queryKey, payload] of snapshots) {
      if (!payload) continue;
      const statusFilter = statusFilterFromGoalQueryKey(queryKey);
      const nextCategories = payload.categories.includes(nextGoal.category)
        ? payload.categories
        : [...payload.categories, nextGoal.category].sort((a, b) => a.localeCompare(b));
      const nextGoalsBase = payload.goals.filter((goal) => goal.id !== nextGoal.id);
      const shouldIncludeGoal = statusFilter === "all" || nextGoal.status === statusFilter;
      const nextGoals = shouldIncludeGoal ? [nextGoal, ...nextGoalsBase] : nextGoalsBase;
      queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
        ...payload,
        categories: nextCategories,
        goals: nextGoals,
      });
    }
  };

  const removeMyGoalCaches = (goalId: string) => {
    const snapshots = listMyGoalQuerySnapshots();
    for (const [queryKey, payload] of snapshots) {
      if (!payload) continue;
      const nextGoals = payload.goals.filter((goal) => goal.id !== goalId);
      const nextCategories = Array.from(new Set(nextGoals.map((goal) => goal.category))).sort((a, b) =>
        a.localeCompare(b)
      );
      queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
        ...payload,
        categories: nextCategories,
        goals: nextGoals,
      });
    }
  };

  const invalidateClient = async (clientId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
      queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() }),
      queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
      queryClient.invalidateQueries({ queryKey: coachKeys.templates() }),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientDetail(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientAssignments(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientNextSession(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientTodaySessions(clientId) }) : Promise.resolve(),
      clientId
        ? queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "sessions-range", clientId] })
        : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientCheckins(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientNotes(clientId) }) : Promise.resolve(),
      clientId
        ? queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "goals", clientId] })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix() }),
      clientId
        ? queryClient.invalidateQueries({ queryKey: coachKeys.clientPayments(clientId) })
        : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.billingPlan(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.billingPlanHistory(clientId) }) : Promise.resolve(),
      clientId
        ? queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-logs", clientId] })
        : Promise.resolve(),
      clientId
        ? queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-log-stats", clientId] })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: coachKeys.todayLogs() }),
    ]);
  };

  const upsertClient = useMutation({
    mutationFn: upsertClientAction,
    onSuccess: async (result) => {
      await invalidateClient(result.id || undefined);
    },
  });

  const removeClient = useMutation({
    mutationFn: removeClientAction,
    onSuccess: async (_result, payload) => {
      await invalidateClient(payload.client_id);
    },
  });

  const createTemplate = useMutation({
    mutationFn: createCoachPlanTemplateAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.templates() });
    },
  });

  const assignTemplate = useMutation({
    mutationFn: assignTemplateToClientAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const logClientWorkout = useMutation({
    mutationFn: logClientWorkoutAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const createCheckin = useMutation({
    mutationFn: createClientCheckinAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.subject_client_id || undefined),
  });

  const updateCheckin = useMutation({
    mutationFn: updateClientCheckinAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
      ]);
    },
  });

  const createNote = useMutation({
    mutationFn: createCoachNoteAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const updateNote = useMutation({
    mutationFn: updateCoachNoteAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const recordPayment = useMutation({
    mutationFn: recordClientPaymentAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const deletePayment = useMutation({
    mutationFn: deleteClientPaymentAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
      ]);
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: updateClientPaymentStatusAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
      ]);
    },
  });

  const updatePaymentDetails = useMutation({
    mutationFn: updateClientPaymentDetailsAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
      ]);
    },
  });

  const createBillingPlan = useMutation({
    mutationFn: createBillingPlanAction,
    onSuccess: async (result) => {
      await invalidateClient(result.client_id);
    },
  });

  const updateBillingPlan = useMutation({
    mutationFn: updateBillingPlanAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.todayLogs() }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "billing-plan"] }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "billing-plan-history"] }),
      ]);
    },
  });

  const renewPackage = useMutation({
    mutationFn: renewPackageAction,
    onSuccess: async (result) => {
      await invalidateClient(result.plan.client_id);
    },
  });

  const logSession = useMutation({
    mutationFn: logSessionAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: coachKeys.todayLogs() });
      const previousTodayLogs = queryClient.getQueryData<Record<string, PaymentLogRow>>(coachKeys.todayLogs());
      const todayIso = new Date().toISOString().slice(0, 10);
      const sessionDate = payload.session_date || todayIso;
      const optimisticToday = sessionDate === todayIso;

      if (optimisticToday) {
        const nextMap = {
          ...(previousTodayLogs || {}),
          [payload.client_id]: {
            id: `optimistic-${payload.client_id}-${todayIso}`,
            client_id: payload.client_id,
            coach_id: "",
            billing_plan_id: null,
            session_date: todayIso,
            amount: null,
            session_rate_snapshot: 0,
            sessions_remaining_after: null,
            billing_type_snapshot: "per_session" as BillingType,
            status: "logged",
            notes: payload.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as PaymentLogRow,
        };
        queryClient.setQueryData(coachKeys.todayLogs(), nextMap);
      }

      return { previousTodayLogs, clientId: payload.client_id, optimisticToday };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      queryClient.setQueryData(coachKeys.todayLogs(), context.previousTodayLogs || {});
    },
    onSuccess: async (result, payload) => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const sessionDate = payload.session_date || todayIso;
      if (sessionDate === todayIso) {
        queryClient.setQueryData<Record<string, PaymentLogRow>>(coachKeys.todayLogs(), (current) => ({
          ...(current || {}),
          [payload.client_id]: result.log,
        }));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.clientPayments(payload.client_id) }),
        queryClient.invalidateQueries({ queryKey: coachKeys.billingPlan(payload.client_id) }),
        queryClient.invalidateQueries({ queryKey: coachKeys.paymentLogs(payload.client_id) }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-log-stats", payload.client_id] }),
      ]);
    },
    onSettled: async (_result, _error, payload) => {
      if (!payload) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.todayLogs() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.paymentLogs(payload.client_id) }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-log-stats", payload.client_id] }),
      ]);
    },
  });

  const deleteSessionLog = useMutation({
    mutationFn: deleteSessionLogAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: coachKeys.todayLogs() });
      const previousTodayLogs = queryClient.getQueryData<Record<string, PaymentLogRow>>(coachKeys.todayLogs());
      const todayIso = new Date().toISOString().slice(0, 10);

      if (payload.client_id && payload.session_date === todayIso) {
        queryClient.setQueryData<Record<string, PaymentLogRow>>(coachKeys.todayLogs(), (current) => {
          if (!current) return current;
          const next = { ...current };
          delete next[payload.client_id as string];
          return next;
        });
      }

      return {
        previousTodayLogs,
      };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      queryClient.setQueryData(coachKeys.todayLogs(), context.previousTodayLogs || {});
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachKeys.todayLogs() }),
        queryClient.invalidateQueries({ queryKey: coachKeys.payments() }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-logs"] }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "billing-plan"] }),
        queryClient.invalidateQueries({ queryKey: [...coachKeys.clients(), "payment-log-stats"] }),
      ]);
    },
  });

  const createGoal = useMutation({
    mutationFn: createClientGoalAction,
    onSuccess: (result, payload) => {
      upsertGoalCaches(payload.client_id, result);
      void queryClient.invalidateQueries({ queryKey: goalsQueryPrefix(payload.client_id), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
  });

  const updateGoal = useMutation({
    mutationFn: updateClientGoalAction,
    onSuccess: (result, payload) => {
      upsertGoalCaches(payload.client_id, result);
      void queryClient.invalidateQueries({ queryKey: goalsQueryPrefix(payload.client_id), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
  });

  const updateGoalStatus = useMutation({
    mutationFn: updateClientGoalStatusAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: goalsQueryPrefix(payload.client_id) });
      const previous = listGoalQuerySnapshots(payload.client_id);
      const optimisticUpdatedAt = new Date().toISOString();

      for (const [queryKey, goalPayload] of previous) {
        if (!goalPayload) continue;
        const statusFilter = statusFilterFromGoalQueryKey(queryKey);
        const nextGoals = goalPayload.goals
          .map((goal) =>
            goal.id === payload.goal_id
              ? {
                  ...goal,
                  status: payload.status,
                  updated_at: optimisticUpdatedAt,
                }
              : goal
          )
          .filter((goal) => (statusFilter === "all" ? true : goal.status === statusFilter));
        queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
          ...goalPayload,
          goals: nextGoals,
        });
      }

      return { previous, clientId: payload.client_id };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      for (const [queryKey, snapshot] of context.previous) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: (result, payload) => {
      upsertGoalCaches(payload.client_id, result);
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
    onSettled: (_result, _error, payload) => {
      if (!payload) return;
      void queryClient.invalidateQueries({ queryKey: goalsQueryPrefix(payload.client_id), refetchType: "inactive" });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: deleteClientGoalAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: goalsQueryPrefix(payload.client_id) });
      const previous = listGoalQuerySnapshots(payload.client_id);
      removeGoalCaches(payload.client_id, payload.goal_id);
      return { previous, clientId: payload.client_id };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      for (const [queryKey, snapshot] of context.previous) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({ queryKey: goalsQueryPrefix(payload.client_id), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
    onSettled: (_result, _error, payload) => {
      if (!payload) return;
      void queryClient.invalidateQueries({ queryKey: goalsQueryPrefix(payload.client_id), refetchType: "inactive" });
    },
  });

  const createOwnGoal = useMutation({
    mutationFn: createMyGoalAction,
    onSuccess: (result) => {
      upsertMyGoalCaches(result);
      void queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix(), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
  });

  const updateOwnGoal = useMutation({
    mutationFn: updateMyGoalAction,
    onSuccess: (result) => {
      upsertMyGoalCaches(result);
      void queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix(), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
  });

  const updateOwnGoalStatus = useMutation({
    mutationFn: updateMyGoalStatusAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: myGoalsQueryPrefix() });
      const previous = listMyGoalQuerySnapshots();
      const optimisticUpdatedAt = new Date().toISOString();

      for (const [queryKey, goalPayload] of previous) {
        if (!goalPayload) continue;
        const statusFilter = statusFilterFromGoalQueryKey(queryKey);
        const nextGoals = goalPayload.goals
          .map((goal) =>
            goal.id === payload.goal_id
              ? {
                  ...goal,
                  status: payload.status,
                  updated_at: optimisticUpdatedAt,
                }
              : goal
          )
          .filter((goal) => (statusFilter === "all" ? true : goal.status === statusFilter));
        queryClient.setQueryData<ClientGoalsPayload>(queryKey, {
          ...goalPayload,
          goals: nextGoals,
        });
      }

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      for (const [queryKey, snapshot] of context.previous) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: (result) => {
      upsertMyGoalCaches(result);
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix(), refetchType: "inactive" });
    },
  });

  const deleteOwnGoal = useMutation({
    mutationFn: deleteMyGoalAction,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: myGoalsQueryPrefix() });
      const previous = listMyGoalQuerySnapshots();
      removeMyGoalCaches(payload.goal_id);
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      for (const [queryKey, snapshot] of context.previous) {
        queryClient.setQueryData(queryKey, snapshot);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix(), refetchType: "inactive" });
      void queryClient.invalidateQueries({ queryKey: coachKeys.dashboard(), refetchType: "inactive" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: myGoalsQueryPrefix(), refetchType: "inactive" });
    },
  });

  return {
    upsertClient,
    removeClient,
    createTemplate,
    assignTemplate,
    logClientWorkout,
    createCheckin,
    updateCheckin,
    createNote,
    updateNote,
    createGoal,
    updateGoal,
    updateGoalStatus,
    deleteGoal,
    createOwnGoal,
    updateOwnGoal,
    updateOwnGoalStatus,
    deleteOwnGoal,
    recordPayment,
    deletePayment,
    updatePaymentStatus,
    updatePaymentDetails,
    createBillingPlan,
    updateBillingPlan,
    renewPackage,
    logSession,
    deleteSessionLog,
  };
}
