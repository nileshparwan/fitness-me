"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTicketSubscriptionStateAction,
  subscribeToTicketAction,
  unsubscribeFromTicketAction,
} from "@/app/actions/ticket-subscriptions";
import { ticketSubscriptionKeys } from "@/lib/query-keys";

type TicketSubscriptionState = {
  is_subscribed: boolean;
  can_subscribe: boolean;
};

export function useTicketSubscriptionState(
  ticketId: string,
  initialState?: TicketSubscriptionState
) {
  return useQuery({
    queryKey: ticketSubscriptionKeys.detail(ticketId),
    queryFn: () => getTicketSubscriptionStateAction(ticketId),
    enabled: Boolean(ticketId),
    initialData: initialState,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTicketSubscriptionMutations(ticketId: string) {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ticketSubscriptionKeys.detail(ticketId),
    });
  };

  const subscribe = useMutation({
    mutationFn: () => subscribeToTicketAction(ticketId),
    onSuccess: () => refresh(),
  });

  const unsubscribe = useMutation({
    mutationFn: () => unsubscribeFromTicketAction(ticketId),
    onSuccess: () => refresh(),
  });

  return {
    subscribe,
    unsubscribe,
  };
}
