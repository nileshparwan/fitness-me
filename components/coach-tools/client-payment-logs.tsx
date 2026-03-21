"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import type {
  ClientBillingPlanWithRemaining,
  ClientPaymentLogStats,
  ClientPaymentLogsPayload,
  PaymentLogRow,
} from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useClientBillingPlan,
  useClientBillingPlanHistory,
  useClientDetail,
  useClientPaymentLogStats,
  useClientPaymentLogs,
  useCoachToolMutations,
} from "@/hooks/use-coach-tools";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrencyAmount } from "@/lib/clients/dashboard";
import { cn } from "@/utils";

const BillingPlanDialog = dynamic(() =>
  import("@/components/coach-tools/billing-plan-dialog").then((mod) => mod.BillingPlanDialog)
);

type ClientPaymentLogsViewProps = {
  clientId: string;
  initialData?: {
    billingPlan?: ClientBillingPlanWithRemaining | null;
    billingHistory?: ClientBillingPlanWithRemaining[];
    logs?: ClientPaymentLogsPayload;
    stats?: ClientPaymentLogStats;
  };
};

type LogsSortId = "session_date" | "amount" | "status" | "created_at";
type LogsStatusFilter = "all" | "logged" | "confirmed";
type BillingHistoryStatusFilter = "all" | "active" | "inactive";

type PersistedLogsTableState = {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  pageSize: number;
};
type PersistedHistoryTableState = {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  pageSize: number;
  status: BillingHistoryStatusFilter;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_SORTING: SortingState = [{ id: "session_date", desc: true }];
const DEFAULT_VISIBILITY: VisibilityState = {
  description: false,
  created_at: false,
  notes: false,
  sessions_remaining_after: false,
};
const TABLE_STORAGE_KEY = "client-payment-logs-table:v1";
const HISTORY_TABLE_STORAGE_KEY = "client-billing-history-table:v1";
const COLUMN_LABELS: Record<string, string> = {
  session_date: "Session Date",
  description: "Description",
  amount: "Amount",
  session_rate_snapshot: "Rate",
  billing_type_snapshot: "Type",
  status: "Status",
  logged_by: "Logged By",
  created_at: "Created At",
  notes: "Notes",
  sessions_remaining_after: "Remaining",
  actions: "Actions",
};
const HISTORY_COLUMN_LABELS: Record<string, string> = {
  created_at: "Created",
  billing_type: "Billing Type",
  session_rate: "Rate",
  sessions: "Sessions",
  sessions_remaining: "Remaining",
  is_active: "Status",
  program_range: "Program Dates",
  notes: "Notes",
};
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const DATETIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

function parsePersistedState(raw: string | null): PersistedLogsTableState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedLogsTableState>;
    return {
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : DEFAULT_SORTING,
      columnVisibility:
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? (parsed.columnVisibility as VisibilityState)
          : DEFAULT_VISIBILITY,
      pageSize: typeof parsed.pageSize === "number" && parsed.pageSize > 0 ? parsed.pageSize : 20,
    };
  } catch {
    return null;
  }
}

function parsePersistedHistoryState(raw: string | null): PersistedHistoryTableState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedHistoryTableState>;
    return {
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : [{ id: "created_at", desc: true }],
      columnVisibility:
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? (parsed.columnVisibility as VisibilityState)
          : { notes: false },
      pageSize: typeof parsed.pageSize === "number" && parsed.pageSize > 0 ? parsed.pageSize : 10,
      status:
        parsed.status === "all" || parsed.status === "active" || parsed.status === "inactive"
          ? parsed.status
          : "all",
    };
  } catch {
    return null;
  }
}

function sortIndicator(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-[0.08em]"
      onClick={onClick}
    >
      {label}
      {sortIndicator(sorted)}
    </button>
  );
}

function statusClass(status: string) {
  if (status === "logged") return "border-chart-3/40 bg-chart-3/10 text-chart-3";
  if (status === "confirmed") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

function billingTypeLabel(type: PaymentLogRow["billing_type_snapshot"]) {
  return type.replaceAll("_", " ");
}

function paymentLogDescription(value: string | null) {
  if (!value) return "Session log";
  const [firstLine] = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return firstLine || "Session log";
}

function paymentLogNotes(value: string | null) {
  if (!value) return "";
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return "";
  return lines.slice(1).join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMATTER.format(parsed);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATETIME_FORMATTER.format(parsed);
}

function canDeleteLog(_row: PaymentLogRow) {
  return true;
}

export function ClientPaymentLogsView({ clientId, initialData }: ClientPaymentLogsViewProps) {
  const [tableHydrated, setTableHydrated] = useState(false);
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LogsStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<BillingHistoryStatusFilter>("all");
  const [historySorting, setHistorySorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [historyVisibility, setHistoryVisibility] = useState<VisibilityState>({ notes: false });
  const [historyPagination, setHistoryPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [historyHydrated, setHistoryHydrated] = useState(false);

  const debouncedSearch = useDebounce(search, 220);
  const debouncedHistorySearch = useDebounce(historySearch, 220);
  const sort = sorting[0];
  const sortBy: LogsSortId =
    sort && ["session_date", "amount", "status", "created_at"].includes(sort.id)
      ? (sort.id as LogsSortId)
      : "session_date";
  const sortDir = sort ? (sort.desc ? "desc" : "asc") : "desc";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = parsePersistedState(window.localStorage.getItem(TABLE_STORAGE_KEY));
    if (persisted) {
      setSorting(persisted.sorting);
      setColumnVisibility({ ...DEFAULT_VISIBILITY, ...persisted.columnVisibility });
      setPagination((current) => ({ ...current, pageSize: persisted.pageSize }));
    }
    setTableHydrated(true);
  }, []);

  useEffect(() => {
    if (!tableHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      TABLE_STORAGE_KEY,
      JSON.stringify({
        sorting,
        columnVisibility,
        pageSize: pagination.pageSize,
      } satisfies PersistedLogsTableState)
    );
  }, [columnVisibility, pagination.pageSize, sorting, tableHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = parsePersistedHistoryState(window.localStorage.getItem(HISTORY_TABLE_STORAGE_KEY));
    if (persisted) {
      setHistorySorting(persisted.sorting);
      setHistoryVisibility((current) => ({ ...current, ...persisted.columnVisibility }));
      setHistoryPagination((current) => ({ ...current, pageSize: persisted.pageSize }));
      setHistoryStatusFilter(persisted.status);
    }
    setHistoryHydrated(true);
  }, []);

  useEffect(() => {
    if (!historyHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      HISTORY_TABLE_STORAGE_KEY,
      JSON.stringify({
        sorting: historySorting,
        columnVisibility: historyVisibility,
        pageSize: historyPagination.pageSize,
        status: historyStatusFilter,
      } satisfies PersistedHistoryTableState)
    );
  }, [historyHydrated, historyPagination.pageSize, historySorting, historyStatusFilter, historyVisibility]);

  const detailQuery = useClientDetail(clientId);
  const billingPlanQuery = useClientBillingPlan(clientId, { initialData: initialData?.billingPlan });
  const billingHistoryQuery = useClientBillingPlanHistory(clientId, { initialData: initialData?.billingHistory || [] });
  const logsQuery = useClientPaymentLogs(
    clientId,
    {
      page: pagination.pageIndex,
      limit: pagination.pageSize,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortDir,
      status: statusFilter,
      search: debouncedSearch || undefined,
    },
    { initialData: initialData?.logs }
  );
  const statsQuery = useClientPaymentLogStats(clientId, { initialData: initialData?.stats });
  const mutations = useCoachToolMutations();

  const rows = useMemo(() => logsQuery.data?.rows || [], [logsQuery.data?.rows]);
  const totalRows = logsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(1, pagination.pageSize)));

  useEffect(() => {
    if (!logsQuery.data) return;
    if (pagination.pageIndex < totalPages) return;
    setPagination((current) => ({ ...current, pageIndex: Math.max(0, totalPages - 1) }));
  }, [logsQuery.data, pagination.pageIndex, totalPages]);

  useEffect(() => {
    setRowSelection({});
  }, [rows]);

  const activePlan = billingPlanQuery.data;
  const revenueThisMonth =
    activePlan?.billing_type === "monthly" && activePlan.monthly_amount
      ? Number(activePlan.monthly_amount)
      : Number(statsQuery.data?.revenue_this_month || 0);

  const onDeleteLog = useCallback(async (log: PaymentLogRow) => {
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this session log?");
    if (!confirmed) return;
    await withToastFeedback(
      mutations.deleteSessionLog.mutateAsync({
        log_id: log.id,
        client_id: log.client_id,
        session_date: log.session_date,
      }),
      {
        loading: "Deleting session log...",
        success: "Session log deleted",
        error: "Unable to delete log",
      }
    ).catch(() => null);
  }, [mutations.deleteSessionLog]);

  const onDeleteSelected = async () => {
    if (selectedDeletableRows.length === 0) {
      toast.error("No eligible logs selected.");
      return;
    }
    const confirmed =
      typeof window === "undefined" ? true : window.confirm(`Delete ${selectedDeletableRows.length} selected log(s)?`);
    if (!confirmed) return;

    const result = await withToastFeedback(
      Promise.all(
        selectedDeletableRows.map((row) =>
          mutations.deleteSessionLog.mutateAsync({
            log_id: row.id,
            client_id: row.client_id,
            session_date: row.session_date,
          })
        )
      ),
      {
        loading: "Deleting selected logs...",
        success: "Selected logs deleted",
        error: "Unable to delete selected logs",
      }
    ).catch(() => null);
    if (!result) return;
    setRowSelection({});
  };

  const columns = useMemo<ColumnDef<PaymentLogRow>[]>(
    () => [
      {
        id: "select",
        size: 42,
        minSize: 42,
        maxSize: 42,
        enableSorting: false,
        enableHiding: false,
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
            aria-label="Select row"
          />
        ),
      },
      {
        accessorKey: "session_date",
        id: "session_date",
        size: 140,
        minSize: 120,
        header: ({ column }) => (
          <SortHeader
            label="Session Date"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatDate(row.original.session_date),
      },
      {
        id: "description",
        accessorFn: (row) => paymentLogDescription(row.notes),
        size: 220,
        minSize: 180,
        enableSorting: false,
        header: "Description",
        cell: ({ row }) => paymentLogDescription(row.original.notes),
      },
      {
        accessorKey: "amount",
        id: "amount",
        size: 120,
        minSize: 110,
        header: ({ column }) => (
          <SortHeader
            label="Amount"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) =>
          row.original.amount === null ? "—" : formatCurrencyAmount(Number(row.original.amount || 0), "USD"),
      },
      {
        accessorKey: "session_rate_snapshot",
        id: "session_rate_snapshot",
        size: 110,
        minSize: 100,
        enableSorting: false,
        header: "Rate",
        cell: ({ row }) => formatCurrencyAmount(Number(row.original.session_rate_snapshot || 0), "USD"),
      },
      {
        accessorKey: "billing_type_snapshot",
        id: "billing_type_snapshot",
        size: 130,
        minSize: 120,
        enableSorting: false,
        header: "Type",
        cell: ({ row }) => (
          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {billingTypeLabel(row.original.billing_type_snapshot)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        size: 120,
        minSize: 110,
        header: ({ column }) => (
          <SortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusClass(row.original.status))}>
            {row.original.status}
          </span>
        ),
      },
      {
        id: "logged_by",
        accessorFn: (row) => row.coach_id,
        size: 120,
        minSize: 100,
        enableSorting: false,
        header: "Logged By",
        cell: () => "Coach",
      },
      {
        accessorKey: "created_at",
        id: "created_at",
        size: 150,
        minSize: 140,
        header: ({ column }) => (
          <SortHeader
            label="Created"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: "sessions_remaining_after",
        id: "sessions_remaining_after",
        size: 110,
        minSize: 100,
        enableSorting: false,
        header: "Remaining",
        cell: ({ row }) =>
          row.original.sessions_remaining_after === null || row.original.sessions_remaining_after === undefined
            ? "—"
            : String(row.original.sessions_remaining_after),
      },
      {
        accessorKey: "notes",
        id: "notes",
        size: 260,
        minSize: 220,
        enableSorting: false,
        header: "Notes",
        cell: ({ row }) => paymentLogNotes(row.original.notes) || "—",
      },
      {
        id: "actions",
        size: 140,
        minSize: 130,
        maxSize: 180,
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const eligible = canDeleteLog(row.original);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/60">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/70 bg-card/95">
                <DropdownMenuItem
                  disabled={!eligible || mutations.deleteSessionLog.isPending}
                  onSelect={(event) => {
                    event.preventDefault();
                    void onDeleteLog(row.original);
                  }}
                >
                  Delete Log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mutations.deleteSessionLog.isPending, onDeleteLog]
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
    onSortingChange: (updater) => {
      setSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: (updater) => {
      setPagination((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onRowSelectionChange: setRowSelection,
    manualSorting: false,
    manualPagination: true,
    pageCount: totalPages,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedDeletableRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original)
    .filter((row) => canDeleteLog(row));

  const clientName =
    detailQuery.data?.client.display_name ||
    `${detailQuery.data?.client.first_name || ""} ${detailQuery.data?.client.last_name || ""}`.trim() ||
    "Client";

  const canPrevious = pagination.pageIndex > 0 && !logsQuery.isFetching;
  const canNext = Boolean(logsQuery.data?.has_more) && !logsQuery.isFetching;

  const showingFrom = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const showingTo = Math.min(totalRows, (pagination.pageIndex + 1) * pagination.pageSize);

  const isInitialLoading = !detailQuery.data && detailQuery.isLoading;
  const filteredHistoryRows = useMemo(() => {
    const normalizedSearch = debouncedHistorySearch.trim().toLowerCase();
    return (billingHistoryQuery.data || []).filter((row) => {
      if (historyStatusFilter === "active" && !row.is_active) return false;
      if (historyStatusFilter === "inactive" && row.is_active) return false;
      if (!normalizedSearch) return true;
      const haystack = `${row.billing_type} ${row.notes || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [billingHistoryQuery.data, debouncedHistorySearch, historyStatusFilter]);

  const historyColumns = useMemo<ColumnDef<ClientBillingPlanWithRemaining>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <SortHeader
            label="Created"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: "billing_type",
        header: ({ column }) => (
          <SortHeader
            label="Billing Type"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => row.original.billing_type.replaceAll("_", " "),
      },
      {
        accessorKey: "session_rate",
        header: ({ column }) => (
          <SortHeader
            label="Rate"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatCurrencyAmount(Number(row.original.session_rate || 0), row.original.currency || "USD"),
      },
      {
        id: "sessions",
        accessorFn: (row) => `${row.sessions_used}/${row.sessions_purchased}`,
        header: "Sessions",
        cell: ({ row }) => `${row.original.sessions_used}/${row.original.sessions_purchased}`,
      },
      {
        accessorKey: "sessions_remaining",
        header: ({ column }) => (
          <SortHeader
            label="Remaining"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
      },
      {
        id: "program_range",
        accessorFn: (row) => `${row.program_start_date || ""} ${row.program_end_date || ""}`.trim(),
        header: "Program Dates",
        cell: ({ row }) =>
          row.original.program_start_date || row.original.program_end_date
            ? `${formatDate(row.original.program_start_date)} to ${formatDate(row.original.program_end_date)}`
            : "—",
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <SortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", row.original.is_active ? "border-chart-2/40 bg-chart-2/10 text-chart-2" : "border-border/60 bg-muted/30 text-muted-foreground")}>
            {row.original.is_active ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => row.original.notes || "—",
      },
    ],
    []
  );

  const historyTable = useReactTable({
    data: filteredHistoryRows,
    columns: historyColumns,
    state: {
      sorting: historySorting,
      pagination: historyPagination,
      columnVisibility: historyVisibility,
    },
    onSortingChange: (updater) => {
      setHistorySorting((current) => (typeof updater === "function" ? updater(current) : updater));
      setHistoryPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: (updater) => {
      setHistoryPagination((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onColumnVisibilityChange: (updater) => {
      setHistoryVisibility((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredHistoryRows.length / Math.max(1, historyPagination.pageSize)));
    if (historyPagination.pageIndex < pages) return;
    setHistoryPagination((current) => ({ ...current, pageIndex: Math.max(0, pages - 1) }));
  }, [filteredHistoryRows.length, historyPagination.pageIndex, historyPagination.pageSize]);

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 h-8 px-2 text-muted-foreground hover:text-foreground">
            <Link href="/clients/payments">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Payments
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{clientName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Client payment logs and billing plan history.</p>
        </div>

        <Button className="rounded-xl" onClick={() => setPlanDialogOpen(true)}>
          Edit Plan
        </Button>
      </section>

      <section className="rounded-[10px] border border-border/60 bg-background/35 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {activePlan ? (
            <>
              <span className="rounded-full border border-chart-3/40 bg-chart-3/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-chart-3">
                {activePlan.billing_type.replaceAll("_", " ")}
              </span>
              <span className="text-sm text-muted-foreground">
                Rate: {formatCurrencyAmount(Number(activePlan.session_rate || 0), activePlan.currency || "USD")}
              </span>
              {(activePlan.billing_type === "session_package" || activePlan.billing_type === "program") ? (
                <span className="text-sm text-muted-foreground">
                  Remaining: {activePlan.sessions_remaining}/{activePlan.sessions_purchased}
                </span>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active billing plan</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isInitialLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={`stats-skeleton-${index}`} className="h-24 rounded-[10px]" />)
        ) : (
          <>
            <article className="rounded-[10px] border border-border/60 bg-background/35 p-4">
              <p className="text-2xl font-semibold tracking-tight">{statsQuery.data?.sessions_this_month ?? 0}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Sessions This Month</p>
            </article>
            <article className="rounded-[10px] border border-border/60 bg-background/35 p-4">
              <p className="text-2xl font-semibold tracking-tight">{formatCurrencyAmount(revenueThisMonth, "USD")}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Revenue This Month</p>
            </article>
            <article className="rounded-[10px] border border-border/60 bg-background/35 p-4">
              <p className="text-2xl font-semibold tracking-tight">{statsQuery.data?.total_sessions ?? 0}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Total Sessions</p>
            </article>
            <article className="rounded-[10px] border border-border/60 bg-background/35 p-4">
              <p className="text-2xl font-semibold tracking-tight">
                {activePlan && (activePlan.billing_type === "session_package" || activePlan.billing_type === "program")
                  ? activePlan.sessions_remaining
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Sessions Remaining</p>
            </article>
          </>
        )}
      </section>

      <section className="rounded-[10px] border border-border/60 p-3 md:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              className="rounded-xl border-border/60 bg-muted/20 pl-9"
              placeholder="Search notes..."
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as LogsStatusFilter);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 md:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="logged">Logged</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            className="h-10 rounded-xl border-border/60 bg-muted/20 md:w-[170px]"
            aria-label="Date from"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            className="h-10 rounded-xl border-border/60 bg-muted/20 md:w-[170px]"
            aria-label="Date to"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl border-border/60">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/70 bg-card/95">
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

          <Button
            variant="outline"
            className="rounded-xl border-border/60"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Delete removes an incorrect session log. If a deleted log was from today, Mark Paid becomes available again for that client.
        </p>

        {Object.keys(rowSelection).length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-sm">
            <span>{selectedDeletableRows.length} selected eligible for delete</span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg border-border/60"
              onClick={() => void onDeleteSelected()}
              disabled={selectedDeletableRows.length === 0 || mutations.deleteSessionLog.isPending}
            >
              {mutations.deleteSessionLog.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Selected
            </Button>
          </div>
        ) : null}

        <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }} className="relative">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanResize() ? (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent",
                            header.column.getIsResizing() ? "bg-chart-3/60" : "hover:bg-chart-3/40"
                          )}
                        />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {logsQuery.isLoading && !logsQuery.data ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`log-skeleton-${index}`}>
                    <TableCell colSpan={table.getVisibleLeafColumns().length}>
                      <Skeleton className="h-6 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="py-10 text-center text-sm text-muted-foreground">
                    {totalRows === 0 ? "No session logs yet." : "No results matching the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2 md:hidden">
          {logsQuery.isLoading && !logsQuery.data ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={`mobile-log-skeleton-${index}`} className="h-28 w-full rounded-xl" />)
          ) : table.getRowModel().rows.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
              {totalRows === 0 ? "No session logs yet." : "No results matching the current filters."}
            </p>
          ) : (
            table.getRowModel().rows.map((row) => (
              <article key={row.id} className="rounded-xl border border-border/60 bg-background/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatDate(row.original.session_date)}</p>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusClass(row.original.status))}>
                    {row.original.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{paymentLogDescription(row.original.notes)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{billingTypeLabel(row.original.billing_type_snapshot)}</p>
                <p className="mt-2 text-sm font-semibold">
                  {row.original.amount === null ? "—" : formatCurrencyAmount(Number(row.original.amount || 0), "USD")}
                </p>
                {paymentLogNotes(row.original.notes) ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{paymentLogNotes(row.original.notes)}</p>
                ) : null}
                <div className="mt-3 flex justify-end">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-border/60"
                      disabled={!canDeleteLog(row.original) || mutations.deleteSessionLog.isPending}
                      onClick={() => void onDeleteLog(row.original)}
                    >
                      Delete Log
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <section className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {showingFrom} to {showingTo} of {totalRows} results
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
                {PAGE_SIZE_OPTIONS.map((size) => (
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
              onClick={() => table.setPageIndex(pagination.pageIndex + 1)}
              disabled={!canNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </section>
      </section>

      <section className="rounded-[10px] border border-border/60 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Billing Plan History</h2>
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={historySearch}
              onChange={(event) => {
                setHistorySearch(event.target.value);
                setHistoryPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              className="rounded-xl border-border/60 bg-muted/20 pl-9"
              placeholder="Search history..."
            />
          </div>
          <Select
            value={historyStatusFilter}
            onValueChange={(value) => {
              setHistoryStatusFilter(value as BillingHistoryStatusFilter);
              setHistoryPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 md:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl border-border/60">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/70 bg-card/95">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {historyTable
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
                    <Checkbox
                      checked={column.getIsVisible()}
                      aria-label={`Toggle ${HISTORY_COLUMN_LABELS[column.id] || column.id}`}
                    />
                    <span>{HISTORY_COLUMN_LABELS[column.id] || column.id}</span>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
          <Table>
            <TableHeader>
              {historyTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }} className="relative">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanResize() ? (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent",
                            header.column.getIsResizing() ? "bg-chart-3/60" : "hover:bg-chart-3/40"
                          )}
                        />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {historyTable.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={historyTable.getVisibleLeafColumns().length} className="py-8 text-center text-sm text-muted-foreground">
                    No billing plan history found.
                  </TableCell>
                </TableRow>
              ) : (
                historyTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-2 md:hidden">
          {historyTable.getRowModel().rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-border/60 bg-background/35 p-3">
              <p className="text-sm font-semibold">{row.original.billing_type.replaceAll("_", " ")}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(row.original.created_at)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrencyAmount(Number(row.original.session_rate || 0), row.original.currency || "USD")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sessions: {row.original.sessions_used}/{row.original.sessions_purchased} · {row.original.sessions_remaining} left
              </p>
            </article>
          ))}
        </div>

        <section className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing{" "}
            {filteredHistoryRows.length === 0 ? 0 : historyPagination.pageIndex * historyPagination.pageSize + 1}
            {" "}to{" "}
            {Math.min(filteredHistoryRows.length, (historyPagination.pageIndex + 1) * historyPagination.pageSize)}
            {" "}of {filteredHistoryRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(historyPagination.pageSize)}
              onValueChange={(value) => {
                const parsed = Number(value);
                if (!Number.isFinite(parsed) || parsed <= 0) return;
                setHistoryPagination({ pageIndex: 0, pageSize: parsed });
              }}
            >
              <SelectTrigger className="h-9 w-[120px] rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
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
              onClick={() => historyTable.setPageIndex(Math.max(0, historyPagination.pageIndex - 1))}
              disabled={historyPagination.pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-xl border-border/60"
              onClick={() => historyTable.setPageIndex(historyPagination.pageIndex + 1)}
              disabled={!historyTable.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </section>
      </section>

      <BillingPlanDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        clientId={clientId}
        clientName={clientName}
        existingPlan={activePlan || null}
        mode={activePlan ? "edit" : "create"}
      />

      {logsQuery.isFetching && logsQuery.data ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing latest logs...
        </div>
      ) : null}
    </div>
  );
}
