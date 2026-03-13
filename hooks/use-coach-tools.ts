"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  assignTemplateToClientAction,
  createClientGoalAction,
  createClientCheckinAction,
  createCoachNoteAction,
  createCoachPlanTemplateAction,
  deleteClientPaymentAction,
  deleteClientGoalAction,
  getClientNextSessionAction,
  listClientGoalsAction,
  listCoachPaymentsDashboardAction,
  listClientAssignmentsAction,
  listClientCheckinsAction,
  listClientDetailAction,
  listClientNotesAction,
  listClientPaymentsAction,
  listClientSessionsByRangeAction,
  listClientTodaySessionsAction,
  listCoachClientsAction,
  listCoachPlanTemplatesAction,
  logClientWorkoutAction,
  recordClientPaymentAction,
  removeClientAction,
  updateClientPaymentDetailsAction,
  updateClientGoalAction,
  updateClientGoalStatusAction,
  updateClientPaymentStatusAction,
  updateClientCheckinAction,
  updateCoachNoteAction,
  upsertClientAction,
  type ClientGoalItem,
  type ClientGoalsPayload,
  type CoachPaymentsDashboard,
  type PaymentAlert,
} from "@/app/actions/coach-tools";
import { coachKeys, type CoachClientsKeyParams, type CoachPaymentsKeyParams } from "@/lib/query-keys-coach";
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
  const statusSegment = queryKey[4];
  if (typeof statusSegment === "string" && GOAL_STATUS_FILTER_VALUES.includes(statusSegment as GoalStatusFilter)) {
    return statusSegment as GoalStatusFilter;
  }
  return "all";
}

export function useCoachClients(params: CoachClientsKeyParams & { enabled?: boolean }) {
  const { enabled = true, ...keyParams } = params;
  return useQuery({
    queryKey: coachKeys.clientList(keyParams) as QueryKey,
    queryFn: () =>
      listCoachClientsAction({
        page: keyParams.page,
        page_size: keyParams.pageSize ?? 12,
        search: keyParams.search?.trim() || undefined,
        status: keyParams.status && keyParams.status !== "all" ? keyParams.status : undefined,
        sort_by: keyParams.sortBy ?? "updated_at",
        sort_dir: keyParams.sortDir ?? "desc",
      }),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useClientDetail(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientDetail(clientId),
    queryFn: () => listClientDetailAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useCoachPlanTemplates() {
  return useQuery({
    queryKey: coachKeys.templates(),
    queryFn: () => listCoachPlanTemplatesAction(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientAssignments(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientAssignments(clientId),
    queryFn: () => listClientAssignmentsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientNextSession(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientNextSession(clientId),
    queryFn: () => getClientNextSessionAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientTodaySessions(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientTodaySessions(clientId),
    queryFn: () => listClientTodaySessionsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 20_000,
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
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientCheckins(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientCheckins(clientId),
    queryFn: () => listClientCheckinsAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: coachKeys.clientNotes(clientId),
    queryFn: () => listClientNotesAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useClientGoals(clientId: string, status: GoalStatusFilter = "all", limit = 80) {
  return useQuery<ClientGoalsPayload>({
    queryKey: coachKeys.clientGoals(clientId, status),
    queryFn: () =>
      listClientGoalsAction({
        client_id: clientId,
        status,
        limit,
      }),
    enabled: Boolean(clientId),
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
    staleTime: 20_000,
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
        page: params?.page ?? 0,
        page_size: params?.pageSize ?? 10,
        sort_by: params?.sortBy ?? "payment_date",
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

  const listGoalQuerySnapshots = (clientId: string) =>
    queryClient.getQueriesData<ClientGoalsPayload>({ queryKey: goalsQueryPrefix(clientId) });

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
      clientId
        ? queryClient.invalidateQueries({ queryKey: coachKeys.clientPayments(clientId) })
        : Promise.resolve(),
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
    recordPayment,
    deletePayment,
    updatePaymentStatus,
    updatePaymentDetails,
  };
}
