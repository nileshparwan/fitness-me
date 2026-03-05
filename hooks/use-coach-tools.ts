"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  addAssistantCoachAction,
  archiveClientPaymentAction,
  assignTemplateToClientAction,
  createClientCheckinAction,
  createCoachNoteAction,
  createCoachPlanTemplateAction,
  disableAssistantCoachAction,
  getClientNextSessionAction,
  listClientAssignmentsAction,
  listClientCheckinsAction,
  listClientDetailAction,
  listClientNotesAction,
  listClientPaymentsAction,
  listClientTodaySessionsAction,
  listCoachClientsAction,
  listCoachPlanTemplatesAction,
  logClientWorkoutAction,
  recordClientPaymentAction,
  updateClientCheckinAction,
  upsertClientAction,
  type PaymentAlert,
} from "@/app/actions/coach-tools";
import { coachKeys, type CoachClientsKeyParams } from "@/lib/query-keys-coach";
import { Database } from "@/types/database";

type ClientPaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];

export function useCoachClients(params: CoachClientsKeyParams) {
  return useQuery({
    queryKey: coachKeys.clientList(params) as QueryKey,
    queryFn: () =>
      listCoachClientsAction({
        page: params.page,
        page_size: params.pageSize ?? 12,
        search: params.search?.trim() || undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
      }),
    staleTime: 30_000,
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

export function useClientPayments(clientId: string, includeArchived = false) {
  return useQuery<{ rows: ClientPaymentRow[]; alerts: PaymentAlert[] }>({
    queryKey: coachKeys.clientPayments(clientId, includeArchived),
    queryFn: () => listClientPaymentsAction(clientId, includeArchived),
    enabled: Boolean(clientId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useCoachToolMutations() {
  const queryClient = useQueryClient();

  const invalidateClient = async (clientId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: coachKeys.clients() }),
      queryClient.invalidateQueries({ queryKey: coachKeys.templates() }),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientDetail(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientAssignments(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientNextSession(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientTodaySessions(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientCheckins(clientId) }) : Promise.resolve(),
      clientId ? queryClient.invalidateQueries({ queryKey: coachKeys.clientNotes(clientId) }) : Promise.resolve(),
      clientId
        ? Promise.all([
            queryClient.invalidateQueries({ queryKey: coachKeys.clientPayments(clientId, false) }),
            queryClient.invalidateQueries({ queryKey: coachKeys.clientPayments(clientId, true) }),
          ]).then(() => undefined)
        : Promise.resolve(),
    ]);
  };

  const upsertClient = useMutation({
    mutationFn: upsertClientAction,
    onSuccess: async (result) => {
      await invalidateClient(result.id || undefined);
    },
  });

  const addAssistantCoach = useMutation({
    mutationFn: addAssistantCoachAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const disableAssistantCoach = useMutation({
    mutationFn: disableAssistantCoachAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.clients() });
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
      await queryClient.invalidateQueries({ queryKey: coachKeys.clients() });
    },
  });

  const createNote = useMutation({
    mutationFn: createCoachNoteAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const recordPayment = useMutation({
    mutationFn: recordClientPaymentAction,
    onSuccess: async (_result, payload) => invalidateClient(payload.client_id),
  });

  const archivePayment = useMutation({
    mutationFn: archiveClientPaymentAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.clients() });
    },
  });

  return {
    upsertClient,
    addAssistantCoach,
    disableAssistantCoach,
    createTemplate,
    assignTemplate,
    logClientWorkout,
    createCheckin,
    updateCheckin,
    createNote,
    recordPayment,
    archivePayment,
  };
}
