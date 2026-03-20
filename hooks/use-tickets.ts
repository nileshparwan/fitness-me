"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  createTicketAction,
  getTicketDetailAction,
  getTicketsAction,
  toggleUpvoteTicketAction,
  type TicketCategory,
  type TicketDetail,
  type TicketListResult,
  type TicketListRow,
  type TicketStatus,
} from "@/app/actions/tickets";
import {
  listAdminTicketsAction,
  updateTicketStatusAction,
  type AdminTicketListResult,
} from "@/app/actions/admin-tickets";
import {
  ticketKeys,
  type AdminTicketListKeyParams as UseAdminTicketsParams,
  type TicketListKeyParams as UseTicketsParams,
  type TicketSortBy,
} from "@/lib/query-keys";

export type { TicketSortBy };

function buildTicketsQueryOptions(params: UseTicketsParams) {
  return {
    queryKey: ticketKeys.list(params) as QueryKey,
    queryFn: () =>
      getTicketsAction({
        scope: params.scope,
        page: params.page,
        page_size: params.pageSize ?? 12,
        search: params.search?.trim() || undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
        category: params.category && params.category !== "all" ? params.category : undefined,
        sort_by: params.sortBy ?? (params.scope === "public" ? "upvotes" : "created_at"),
        sort_order: params.sortOrder ?? "desc",
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  };
}

export async function prefetchTicketsPage(
  queryClient: QueryClient,
  params: UseTicketsParams
) {
  await queryClient.prefetchQuery(buildTicketsQueryOptions(params));
}

function updateTicketInListResult(
  queryClient: QueryClient,
  matcher: readonly unknown[],
  ticketId: string,
  updater: (ticket: TicketListRow) => TicketListRow
) {
  const entries = queryClient.getQueriesData<TicketListResult>({ queryKey: matcher });
  for (const [key, value] of entries) {
    if (!value?.rows) continue;
    queryClient.setQueryData<TicketListResult>(key, {
      ...value,
      rows: value.rows.map((row) => (row.id === ticketId ? updater(row) : row)),
    });
  }
}

function updateAdminTicketStatusInList(
  queryClient: QueryClient,
  ticketId: string,
  status: TicketStatus
) {
  const entries = queryClient.getQueriesData<AdminTicketListResult>({
    queryKey: ticketKeys.adminLists(),
  });
  for (const [key, value] of entries) {
    if (!value?.rows) continue;
    queryClient.setQueryData<AdminTicketListResult>(key, {
      ...value,
      rows: value.rows.map((row) => (row.id === ticketId ? { ...row, status } : row)),
    });
  }
}

export function useTickets(params: UseTicketsParams & { enabled?: boolean }) {
  const { enabled = true, ...queryParams } = params;
  const queryOptions = buildTicketsQueryOptions(queryParams);
  return useQuery({
    ...queryOptions,
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

export function useAdminTickets(params: UseAdminTicketsParams) {
  return useQuery({
    queryKey: ticketKeys.adminList(params),
    queryFn: async () =>
      listAdminTicketsAction({
        page: params.page,
        page_size: params.pageSize ?? 20,
        search: params.search?.trim() || undefined,
        status: params.status && params.status !== "all" ? params.status : undefined,
        category: params.category && params.category !== "all" ? params.category : undefined,
        sort_by: params.sortBy ?? "upvotes",
        sort_order: params.sortOrder ?? "desc",
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTicketDetail(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => getTicketDetailAction(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTicketMutations() {
  const queryClient = useQueryClient();

  const createTicket = useMutation({
    mutationFn: createTicketAction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
      ]);
    },
  });

  const toggleUpvote = useMutation({
    mutationFn: (ticketId: string) => toggleUpvoteTicketAction(ticketId),
    onMutate: async (ticketId) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ticketKeys.lists() }),
        queryClient.cancelQueries({ queryKey: ticketKeys.detail(ticketId) }),
      ]);

      const previousLists = queryClient.getQueriesData<TicketListResult>({
        queryKey: ticketKeys.lists(),
      });
      const previousDetail = queryClient.getQueryData<TicketDetail>(
        ticketKeys.detail(ticketId)
      );

      updateTicketInListResult(queryClient, ticketKeys.lists(), ticketId, (row) => ({
        ...row,
        viewer_has_upvoted: !row.viewer_has_upvoted,
        upvotes: row.viewer_has_upvoted ? Math.max((row.upvotes ?? 0) - 1, 0) : (row.upvotes ?? 0) + 1,
      }));

      if (previousDetail) {
        queryClient.setQueryData<TicketDetail>(ticketKeys.detail(ticketId), {
          ...previousDetail,
          viewer_has_upvoted: !previousDetail.viewer_has_upvoted,
          upvotes: previousDetail.viewer_has_upvoted
            ? Math.max((previousDetail.upvotes ?? 0) - 1, 0)
            : (previousDetail.upvotes ?? 0) + 1,
        });
      }

      return { previousLists, previousDetail, ticketId };
    },
    onError: (_error, _ticketId, context) => {
      if (!context) return;
      for (const [key, value] of context.previousLists) {
        queryClient.setQueryData(key, value);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(ticketKeys.detail(context.ticketId), context.previousDetail);
      }
    },
    onSuccess: async (_result, ticketId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
      ]);
    },
  });

  const updateAdminStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      updateTicketStatusAction({ id, status }),
    onMutate: async ({ id, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ticketKeys.adminLists() }),
        queryClient.cancelQueries({ queryKey: ticketKeys.detail(id) }),
      ]);

      const previousAdminLists = queryClient.getQueriesData<AdminTicketListResult>({
        queryKey: ticketKeys.adminLists(),
      });
      const previousDetail = queryClient.getQueryData<TicketDetail>(ticketKeys.detail(id));

      updateAdminTicketStatusInList(queryClient, id, status);
      if (previousDetail) {
        queryClient.setQueryData<TicketDetail>(ticketKeys.detail(id), {
          ...previousDetail,
          status,
        });
      }

      return { previousAdminLists, previousDetail, id };
    },
    onError: (_error, _payload, context) => {
      if (!context) return;
      for (const [key, value] of context.previousAdminLists) {
        queryClient.setQueryData(key, value);
      }
      if (context.previousDetail) {
        queryClient.setQueryData(ticketKeys.detail(context.id), context.previousDetail);
      }
    },
    onSuccess: async (_data, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.adminLists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(payload.id) }),
      ]);
    },
  });

  return {
    createTicket,
    toggleUpvote,
    updateAdminStatus,
  };
}

export function useCreateTicket() {
  return useTicketMutations().createTicket;
}
