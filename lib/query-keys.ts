import type { TicketCategory, TicketStatus } from "@/app/actions/tickets";

export type TicketSortBy = "upvotes" | "created_at" | "updated_at";
export type SortOrder = "asc" | "desc";
export type TicketScope = "public" | "mine";

export type TicketListKeyParams = {
  scope: TicketScope;
  page: number;
  pageSize?: number;
  search?: string;
  status?: TicketStatus | "all";
  category?: TicketCategory | "all";
  sortBy?: TicketSortBy;
  sortOrder?: SortOrder;
};

export type AdminTicketListKeyParams = {
  page: number;
  pageSize?: number;
  search?: string;
  status?: TicketStatus | "all";
  category?: TicketCategory | "all";
  sortBy?: TicketSortBy;
  sortOrder?: SortOrder;
};

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (params: TicketListKeyParams) => [...ticketKeys.lists(), params] as const,
  adminLists: () => [...ticketKeys.all, "admin-list"] as const,
  adminList: (params: AdminTicketListKeyParams) => [...ticketKeys.adminLists(), params] as const,
  details: () => [...ticketKeys.all, "detail"] as const,
  detail: (ticketId: string) => [...ticketKeys.details(), ticketId] as const,
};

export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (ticketId: string) => [...commentKeys.lists(), ticketId] as const,
};
