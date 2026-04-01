"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Archive,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import type { ClientStatus } from "@/app/actions/coach-tools";
import { ClientUpsertSheet } from "@/components/clients/client-upsert-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/app-sheet";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useCoachClients, useCoachToolMutations } from "@/hooks/use-coach-tools";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import {
  CLIENT_STATUS_FILTER_OPTIONS,
  TABLE_DEFAULT_PAGINATION_PAGE_0_SIZE_10,
  TABLE_DEFAULT_SORTING_UPDATED_AT_DESC,
  TABLE_PAGE_SIZE_OPTIONS_STANDARD,
} from "@/utils/app-constants";
import { buildCsv, downloadCsv } from "@/utils/csv-export";
import { cn } from "@/utils";
const DEFAULT_VISIBILITY: VisibilityState = {
  updated_at: true,
  active_plans_count: true,
  status: true,
};

type ClientRowItem = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  status: ClientStatus;
  active_plans_count: number;
  updated_at: string | null;
};

const COLUMN_LABELS: Record<string, string> = {
  client: "Client",
  status: "Status",
  active_plans_count: "Plans",
  updated_at: "Last Activity",
  actions: "Actions",
};

const SORTABLE_COLUMN_MAP: Record<string, "updated_at" | "created_at" | "first_name" | "status" | "email"> = {
  client: "first_name",
  status: "status",
  updated_at: "updated_at",
};

function statusClasses(status: ClientStatus) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function relativeUpdatedAt(value: string | null) {
  if (!value) return "No recent activity";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No recent activity";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function getInitials(input: string) {
  return input
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayClientName(row: ClientRowItem) {
  return `${row.first_name} ${row.last_name || ""}`.trim() || row.first_name;
}

function sortIndicator(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

export function ClientRoster() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");
  const [sorting, setSorting] = useState<SortingState>(TABLE_DEFAULT_SORTING_UPDATED_AT_DESC);
  const [pagination, setPagination] = useState<PaginationState>(TABLE_DEFAULT_PAGINATION_PAGE_0_SIZE_10);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRowItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<ClientRowItem | null>(null);

  const debouncedSearch = useDebounce(search, 250);
  const primarySort = sorting[0];
  const sortBy = primarySort ? SORTABLE_COLUMN_MAP[primarySort.id] ?? "updated_at" : "updated_at";
  const sortDir = primarySort ? (primarySort.desc ? "desc" : "asc") : "desc";

  const clientsQuery = useCoachClients({
    pageSize: pagination.pageSize,
    search: debouncedSearch,
    status,
    sortBy,
    sortDir,
  });
  const mutations = useCoachToolMutations();

  const clientPages = clientsQuery.data?.pages || [];
  const currentPage = clientPages[pagination.pageIndex];
  const rows = useMemo(() => (currentPage?.data || []) as ClientRowItem[], [currentPage?.data]);
  const counts = clientPages[0]?.counts || {
    all: clientPages[0]?.totalCount || 0,
    active: 0,
    paused: 0,
    blocked: 0,
    archived: 0,
  };
  const totalRows = clientPages[0]?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(1, pagination.pageSize)));

  const resetPage = useCallback(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setRowSelection({});
  }, []);

  const openCreateSheet = useCallback(() => {
    setEditingClient(null);
    setIsUpsertOpen(true);
  }, []);

  const openEditSheet = useCallback((row: ClientRowItem) => {
    setEditingClient(row);
    setIsUpsertOpen(true);
  }, []);

  const openDeleteDialog = useCallback((row: ClientRowItem) => {
    setDeletingClient(row);
    setIsDeleteDialogOpen(true);
  }, []);

  const onDeleteClient = useCallback(async () => {
    if (!deletingClient) return;
    const result = await withToastFeedback(
      mutations.removeClient.mutateAsync({ client_id: deletingClient.id }),
      {
        loading: "Archiving client...",
        success: "Client archived",
        error: "Unable to remove client",
      }
    ).catch(() => null);
    if (!result) return;
    setDeletingClient(null);
    setIsDeleteDialogOpen(false);
  }, [deletingClient, mutations.removeClient]);

  const columns = useMemo<ColumnDef<ClientRowItem>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${displayClientName(row.original)}`}
          />
        ),
      },
      {
        id: "client",
        accessorFn: (row) => displayClientName(row),
        enableHiding: false,
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Client
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => {
          const client = row.original;
          const name = displayClientName(client);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-chart-3/40 bg-chart-3/10 text-xs font-semibold text-chart-3">
                {getInitials(name)}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/clients/${client.id}`}
                  className="truncate text-sm font-medium transition-colors hover:text-chart-1 focus-visible:text-chart-1 group-hover:text-chart-1"
                >
                  {name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{client.email || "No email"}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        enableHiding: true,
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => (
          <Badge className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusClasses(row.original.status))}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "active_plans_count",
        enableSorting: false,
        enableHiding: true,
        header: "Plans",
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.active_plans_count}</span>,
      },
      {
        accessorKey: "updated_at",
        enableHiding: true,
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Activity
            {sortIndicator(column.getIsSorted())}
          </button>
        ),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{relativeUpdatedAt(row.original.updated_at)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const client = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/70 bg-card/95">
                <DropdownMenuLabel>Client</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}`}>Open Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}/training`}>Workout Hub</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}/nutrition`}>Nutrition Hub</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/clients/${client.id}/access`}>Access</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openEditSheet(client)}>
                  <Pencil className="h-4 w-4" />
                  Edit Client
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => openDeleteDialog(client)}>
                  <Trash2 className="h-4 w-4" />
                  Delete Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [openDeleteDialog, openEditSheet]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onSortingChange: (updater) => {
      setSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      resetPage();
    },
    onPaginationChange: (updater) => {
      setPagination((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const canPrevious = pagination.pageIndex > 0 && !clientsQuery.isFetching;
  const canNext =
    !clientsQuery.isFetching &&
    (pagination.pageIndex < clientPages.length - 1 || Boolean(clientsQuery.hasNextPage));

  const goToNextPage = useCallback(async () => {
    const targetPage = pagination.pageIndex + 1;
    if (targetPage < clientPages.length) {
      table.setPageIndex(targetPage);
      return;
    }
    if (!clientsQuery.hasNextPage || clientsQuery.isFetchingNextPage) return;
    await clientsQuery.fetchNextPage();
    table.setPageIndex(targetPage);
  }, [clientPages.length, clientsQuery, pagination.pageIndex, table]);

  const selectedClientRows = table.getSelectedRowModel().rows.map((row) => row.original);
  const exportClientsCsv = useCallback(() => {
    const csv = buildCsv(rows, [
      { header: "Client", value: (row) => displayClientName(row) },
      { header: "Email", value: (row) => row.email || "" },
      { header: "Phone", value: (row) => row.phone || "" },
      { header: "Status", value: (row) => row.status },
      { header: "Active Plans", value: (row) => row.active_plans_count },
      { header: "Last Activity", value: (row) => relativeUpdatedAt(row.updated_at) },
    ]);
    downloadCsv(`client-roster-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }, [rows]);
  const archiveSelectedClients = useCallback(async () => {
    if (selectedClientRows.length === 0) return;
    const confirmed = window.confirm(`Archive ${selectedClientRows.length} selected clients?`);
    if (!confirmed) return;

    const result = await withToastFeedback(
      (async () => {
        for (const client of selectedClientRows) {
          await mutations.removeClient.mutateAsync({ client_id: client.id });
        }
      })(),
      {
        loading: "Archiving selected clients...",
        success: `${selectedClientRows.length} clients archived`,
        error: "Unable to archive selected clients",
      }
    ).catch(() => null);
    if (!result) return;
    setRowSelection({});
  }, [mutations.removeClient, selectedClientRows]);

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.all} total · {counts.active} active
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl border-border/60" onClick={exportClientsCsv}>
              <FileDown className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-border/60">
                  <Settings2 className="mr-0 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/70 bg-card/95">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onSelect={(event) => {
                        event.preventDefault();
                        column.toggleVisibility(!column.getIsVisible());
                      }}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={column.getIsVisible()} aria-label={`Toggle ${COLUMN_LABELS[column.id] || column.id}`} />
                      <span>{COLUMN_LABELS[column.id] || column.id}</span>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="accent-strong rounded-xl text-black" onClick={openCreateSheet}>
              <Plus className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Client</span>
            </Button>
          </div>
        </div>

        {selectedClientRows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-chart-1/30 bg-chart-1/10 px-3 py-2 text-sm">
            <p className="text-chart-1">{selectedClientRows.length} selected</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl border-border/60" onClick={() => setRowSelection({})}>
                <X className="mr-0 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => void archiveSelectedClients()}
                disabled={mutations.removeClient.isPending}
              >
                {mutations.removeClient.isPending ? <Loader2 className="mr-0 h-4 w-4 animate-spin sm:mr-2" /> : <Archive className="mr-0 h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">Archive Selected</span>
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              className="rounded-xl border-border/60 bg-muted/20 pl-9"
              placeholder="Search by name..."
            />
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CLIENT_STATUS_FILTER_OPTIONS.map((entry) => {
              const active = status === entry;
              const countValue = counts[entry];
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setStatus(entry);
                    resetPage();
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
                    active
                      ? "border-chart-1/50 bg-chart-1/15 text-chart-1"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{entry}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-chart-1/20" : "bg-muted/60")}>
                    {countValue}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {clientsQuery.isLoading && !clientsQuery.data ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-surface surface-pad text-center text-sm text-muted-foreground">No clients found for this filter.</div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[10px] border border-border/60 bg-card/60 md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className={header.id === "actions" ? "text-right" : undefined}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {table.getRowModel().rows.map((row) => {
              const client = row.original;
              const name = displayClientName(client);
              return (
                <article key={client.id} className="group glass-surface rounded-[10px] border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                        aria-label={`Select ${name}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-full border border-chart-3/40 bg-chart-3/10 text-xs font-semibold text-chart-3">
                            {getInitials(name)}
                          </div>
                          <Link
                            href={`/clients/${client.id}`}
                          className="truncate text-sm font-semibold transition-colors hover:text-chart-1 focus-visible:text-chart-1 group-hover:text-chart-1"
                        >
                          {name}
                        </Link>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{client.email || "No email"}</p>
                      </div>
                    </div>
                    <Badge className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusClasses(client.status))}>
                      {client.status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide">Plans</p>
                      <p className="text-foreground">{client.active_plans_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide">Last activity</p>
                      <p className="text-foreground">{relativeUpdatedAt(client.updated_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline" className="rounded-xl border-border/60">
                      <Link href={`/clients/${client.id}`}>
                        <User className="mr-0 h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Profile</span>
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl border-border/60" onClick={() => openEditSheet(client)}>
                      <Pencil className="mr-0 h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl border-border/60" onClick={() => openDeleteDialog(client)}>
                      <Trash2 className="mr-0 h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <section className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {pagination.pageIndex + 1} / {totalPages} · {totalRows} total
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => {
              const parsed = Number(value);
              if (!Number.isFinite(parsed) || parsed <= 0) return;
              setPagination({ pageIndex: 0, pageSize: parsed });
            }}
          >
            <SelectTrigger className="h-9 w-[120px] rounded-xl border-border/60 bg-muted/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZE_OPTIONS_STANDARD.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-xl border-border/60"
            onClick={() => table.setPageIndex(Math.max(0, pagination.pageIndex - 1))}
            disabled={!canPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-xl border-border/60"
            onClick={() => void goToNextPage()}
            disabled={!canNext}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </section>

      <ClientUpsertSheet
        open={isUpsertOpen}
        prefill={
          editingClient
            ? {
                id: editingClient.id,
                first_name: editingClient.first_name,
                last_name: editingClient.last_name,
                email: editingClient.email,
                phone: editingClient.phone,
                date_of_birth: editingClient.date_of_birth,
                status: editingClient.status,
              }
            : null
        }
        onClose={() => {
          setIsUpsertOpen(false);
          setEditingClient(null);
        }}
        onSaved={() => {
          setIsUpsertOpen(false);
          setEditingClient(null);
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              This archives the client and hides it from active lists. You can still view archived records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl border-border/60"
              onClick={() => {
                setDeletingClient(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => void onDeleteClient()} disabled={mutations.removeClient.isPending}>
              {mutations.removeClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
