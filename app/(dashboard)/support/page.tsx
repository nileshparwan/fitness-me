"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { type TicketCategory, type TicketStatus } from "@/app/actions/tickets";
import { TicketListTable } from "@/components/support/ticket-list-table";
import { TicketCardSkeleton, TicketTableSkeleton } from "@/components/support/ticket-skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { prefetchTicketsPage, useTicketMutations, useTickets, type TicketSortBy } from "@/hooks/use-tickets";

const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const CATEGORY_OPTIONS: TicketCategory[] = ["exercise_request", "feature_request", "bug_report", "other"];
const SORT_OPTIONS: Array<{ label: string; value: TicketSortBy }> = [
  { label: "Most Upvoted", value: "upvotes" },
  { label: "Newest", value: "created_at" },
  { label: "Recently Updated", value: "updated_at" },
];

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export default function SupportDashboardPage() {
  useRealtimeSync();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"community" | "mine">("community");

  const [publicPage, setPublicPage] = useState(0);
  const [publicSearch, setPublicSearch] = useState("");
  const [publicStatus, setPublicStatus] = useState<TicketStatus | "all">("all");
  const [publicCategory, setPublicCategory] = useState<TicketCategory | "all">("all");
  const [publicSortBy, setPublicSortBy] = useState<TicketSortBy>("upvotes");

  const [myPage, setMyPage] = useState(0);
  const [mySearch, setMySearch] = useState("");
  const [myStatus, setMyStatus] = useState<TicketStatus | "all">("all");
  const [mySortBy, setMySortBy] = useState<TicketSortBy>("created_at");

  const debouncedPublicSearch = useDebounce(publicSearch, 300);
  const debouncedMySearch = useDebounce(mySearch, 300);

  const publicQuery = useTickets({
    scope: "public",
    page: publicPage,
    pageSize: 12,
    search: debouncedPublicSearch,
    status: publicStatus,
    category: publicCategory,
    sortBy: publicSortBy,
    sortOrder: "desc",
  });

  const myQuery = useTickets({
    scope: "mine",
    page: myPage,
    pageSize: 12,
    search: debouncedMySearch,
    status: myStatus,
    sortBy: mySortBy,
    sortOrder: "desc",
  });

  const { toggleUpvote } = useTicketMutations();

  useEffect(() => {
    if (publicPage !== 0 || !publicQuery.data?.has_more) return;
    void prefetchTicketsPage(queryClient, {
      scope: "public",
      page: publicPage + 1,
      pageSize: 12,
      search: debouncedPublicSearch,
      status: publicStatus,
      category: publicCategory,
      sortBy: publicSortBy,
      sortOrder: "desc",
    });
  }, [
    queryClient,
    publicPage,
    publicQuery.data?.has_more,
    debouncedPublicSearch,
    publicStatus,
    publicCategory,
    publicSortBy,
  ]);

  useEffect(() => {
    if (myPage !== 0 || !myQuery.data?.has_more) return;
    void prefetchTicketsPage(queryClient, {
      scope: "mine",
      page: myPage + 1,
      pageSize: 12,
      search: debouncedMySearch,
      status: myStatus,
      sortBy: mySortBy,
      sortOrder: "desc",
    });
  }, [queryClient, myPage, myQuery.data?.has_more, debouncedMySearch, myStatus, mySortBy]);

  const onUpvote = async (ticketId: string) => {
    try {
      await toggleUpvote.mutateAsync(ticketId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle upvote");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <section className="color-card native-surface surface-pad flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="page-title-gradient flex items-center gap-2 text-xl font-semibold">
            <MessageSquare className="icon-accent h-5 w-5" />
            Support & Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Track community demand, monitor your submissions, and upvote existing requests before creating duplicates.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/support/new">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "community" | "mine")}
        className="space-y-4"
      >
        <div className="w-full overflow-x-auto">
          <TabsList className="grid min-w-max grid-cols-2">
          <TabsTrigger value="community">Community Board</TabsTrigger>
          <TabsTrigger value="mine">My Tickets</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="community" className="space-y-4">
          <section className="color-card native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={publicSearch}
                onChange={(event) => {
                  setPublicSearch(event.target.value);
                  setPublicPage(0);
                }}
                placeholder="Search community tickets..."
                className="h-9 pl-8"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:w-auto">
              <Select
                value={publicCategory}
                onValueChange={(value) => {
                  setPublicCategory(value as TicketCategory | "all");
                  setPublicPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {humanize(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={publicStatus}
                onValueChange={(value) => {
                  setPublicStatus(value as TicketStatus | "all");
                  setPublicPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {humanize(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={publicSortBy}
                onValueChange={(value) => {
                  setPublicSortBy(value as TicketSortBy);
                  setPublicPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="color-card native-surface surface-pad space-y-3">
            {publicQuery.isLoading && !publicQuery.data ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading tickets...
              </div>
            ) : null}
            {publicQuery.isError ? (
              <p className="text-sm text-destructive">
                {publicQuery.error instanceof Error ? publicQuery.error.message : "Failed to load tickets"}
              </p>
            ) : null}
            {publicQuery.isPlaceholderData ? (
              <p className="text-xs text-muted-foreground">Refreshing data...</p>
            ) : null}

            {publicQuery.isLoading && !publicQuery.data ? (
              <>
                <TicketCardSkeleton rows={4} />
                <TicketTableSkeleton rows={6} />
              </>
            ) : (
              <div className={publicQuery.isPlaceholderData ? "opacity-70 transition-opacity" : "transition-opacity"}>
                <TicketListTable
                  rows={publicQuery.data?.rows || []}
                  mode="public"
                  isLoading={publicQuery.isLoading}
                  emptyText="No matching public tickets."
                  hasMore={false}
                  onLoadMore={() => {}}
                  loadingMore={false}
                  onUpvote={(ticketId) => void onUpvote(ticketId)}
                  upvotingId={toggleUpvote.isPending ? toggleUpvote.variables ?? null : null}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={publicPage === 0 || publicQuery.isFetching}
                onClick={() => setPublicPage((prev) => Math.max(prev - 1, 0))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!publicQuery.data?.has_more || publicQuery.isFetching}
                onMouseEnter={() =>
                  void prefetchTicketsPage(queryClient, {
                    scope: "public",
                    page: publicPage + 1,
                    pageSize: 12,
                    search: debouncedPublicSearch,
                    status: publicStatus,
                    category: publicCategory,
                    sortBy: publicSortBy,
                    sortOrder: "desc",
                  })
                }
                onClick={() => setPublicPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="mine" className="space-y-4">
          <section className="color-card native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={mySearch}
                onChange={(event) => {
                  setMySearch(event.target.value);
                  setMyPage(0);
                }}
                placeholder="Search your tickets..."
                className="h-9 pl-8"
              />
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
              <Select
                value={myStatus}
                onValueChange={(value) => {
                  setMyStatus(value as TicketStatus | "all");
                  setMyPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {humanize(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={mySortBy}
                onValueChange={(value) => {
                  setMySortBy(value as TicketSortBy);
                  setMyPage(0);
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest</SelectItem>
                  <SelectItem value="updated_at">Recently Updated</SelectItem>
                  <SelectItem value="upvotes">Most Upvoted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="color-card native-surface surface-pad space-y-3">
            {myQuery.isLoading && !myQuery.data ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your tickets...
              </div>
            ) : null}
            {myQuery.isError ? (
              <p className="text-sm text-destructive">
                {myQuery.error instanceof Error ? myQuery.error.message : "Failed to load tickets"}
              </p>
            ) : null}
            {myQuery.isPlaceholderData ? (
              <p className="text-xs text-muted-foreground">Refreshing data...</p>
            ) : null}

            {myQuery.isLoading && !myQuery.data ? (
              <>
                <TicketCardSkeleton rows={4} />
                <TicketTableSkeleton rows={6} />
              </>
            ) : (
              <div className={myQuery.isPlaceholderData ? "opacity-70 transition-opacity" : "transition-opacity"}>
                <TicketListTable
                  rows={myQuery.data?.rows || []}
                  mode="mine"
                  isLoading={myQuery.isLoading}
                  emptyText="You have not submitted tickets yet."
                  hasMore={false}
                  onLoadMore={() => {}}
                  loadingMore={false}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={myPage === 0 || myQuery.isFetching}
                onClick={() => setMyPage((prev) => Math.max(prev - 1, 0))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!myQuery.data?.has_more || myQuery.isFetching}
                onMouseEnter={() =>
                  void prefetchTicketsPage(queryClient, {
                    scope: "mine",
                    page: myPage + 1,
                    pageSize: 12,
                    search: debouncedMySearch,
                    status: myStatus,
                    sortBy: mySortBy,
                    sortOrder: "desc",
                  })
                }
                onClick={() => setMyPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
