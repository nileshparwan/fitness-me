"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTicketAction, type AdminTicketRow, type TicketCategory, type TicketStatus } from "@/app/actions/admin-tickets";
import { TicketCardSkeleton, TicketTableSkeleton } from "@/components/support/ticket-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useAdminTickets, useTicketMutations, type TicketSortBy } from "@/hooks/use-tickets";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const CATEGORY_OPTIONS: TicketCategory[] = ["exercise_request", "feature_request", "bug_report", "other"];

function getStatusVariant(status: TicketStatus) {
  if (status === "resolved") return "default";
  if (status === "closed") return "secondary";
  if (status === "in_progress") return "outline";
  return "secondary";
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminTicketsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [category, setCategory] = useState<TicketCategory | "all">("all");
  const [sortBy, setSortBy] = useState<TicketSortBy>("upvotes");
  const [deleteTarget, setDeleteTarget] = useState<AdminTicketRow | null>(null);

  const debouncedSearch = useDebounce(search, 350);
  const query = useAdminTickets({
    page,
    pageSize: 20,
    search: debouncedSearch,
    status,
    category,
    sortBy,
    sortOrder: "desc",
  });

  const { updateAdminStatus } = useTicketMutations();

  const onUpdateStatus = async (row: AdminTicketRow, nextStatus: TicketStatus) => {
    if (row.status === nextStatus) return;
    await withToastFeedback(updateAdminStatus.mutateAsync({ id: row.id, status: nextStatus }), {
      loading: "Updating ticket status...",
      success: "Ticket status updated",
      error: "Failed to update ticket",
    });
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    await withToastFeedback(
      (async () => {
        await deleteTicketAction({ id: deleteTarget.id });
        setDeleteTarget(null);
        await query.refetch();
      })(),
      {
        loading: "Deleting ticket...",
        success: "Ticket deleted",
        error: "Failed to delete ticket",
      }
    );
  };

  const rows = query.data?.rows || [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-20 pt-4 md:space-y-6 md:pb-8">
      <section className="native-surface surface-pad space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Ticket Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage ticket lifecycle and moderation across all users.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px_160px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search support_tickets..."
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as TicketCategory | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
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
            value={status}
            onValueChange={(value) => {
              setStatus(value as TicketStatus | "all");
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
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
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value as TicketSortBy);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upvotes">Most Upvoted</SelectItem>
              <SelectItem value="created_at">Newest</SelectItem>
              <SelectItem value="updated_at">Recently Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-3">
        {query.isLoading && !query.data ? (
          <div className="native-surface surface-pad flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading support_tickets...
          </div>
        ) : null}
        {query.isError ? (
          <div className="native-surface surface-pad text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Failed to load support_tickets"}
          </div>
        ) : null}
        {query.isPlaceholderData ? (
          <p className="text-xs text-muted-foreground">Refreshing data...</p>
        ) : null}

        {query.isLoading && !query.data ? (
          <>
            <TicketCardSkeleton rows={5} />
            <TicketTableSkeleton rows={7} />
          </>
        ) : null}

        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.reporter.name}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/support/${row.id}`}>View Ticket</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                    {STATUS_OPTIONS.map((item) => (
                      <DropdownMenuItem
                        key={item}
                        disabled={updateAdminStatus.isPending || row.status === item}
                        onClick={() => void onUpdateStatus(row, item)}
                      >
                        {humanize(item)}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={updateAdminStatus.isPending}
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Ticket
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={getStatusVariant(row.status)}>{humanize(row.status)}</Badge>
                <Badge variant="outline" className="capitalize">
                  {humanize(row.category)}
                </Badge>
                <span className="text-xs text-muted-foreground">{row.comments_count} comments</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{row.description}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{row.reporter.name}</p>
                    <p className="text-xs text-muted-foreground">{row.reporter.email || row.reporter.id}</p>
                  </TableCell>
                  <TableCell className="capitalize">{humanize(row.category)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(row.status)}>{humanize(row.status)}</Badge>
                  </TableCell>
                  <TableCell>{row.comments_count}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/support/${row.id}`}>View Ticket</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                        {STATUS_OPTIONS.map((item) => (
                          <DropdownMenuItem
                            key={item}
                            disabled={updateAdminStatus.isPending || row.status === item}
                            onClick={() => void onUpdateStatus(row, item)}
                          >
                            {humanize(item)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={updateAdminStatus.isPending}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Ticket
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!query.isLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No support_tickets found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || query.isFetching}
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          >
            <ChevronLeft className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!query.data?.has_more || query.isFetching}
            onClick={() => setPage((prev) => prev + 1)}
          >
            <ChevronRight className="mr-0 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Next</span>
          </Button>
        </div>
      </section>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Ticket history and comments will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateAdminStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={updateAdminStatus.isPending} onClick={() => void onDelete()}>
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
