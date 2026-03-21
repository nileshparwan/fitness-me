"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  Plus,
  Search,
  Settings2,
  TriangleAlert,
  UserRound,
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
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import {
  type CoachPaymentTransactionRow,
  type CoachPaymentsDashboard as CoachPaymentsDashboardData,
  type PaymentMethod,
  type PaymentStatus,
} from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/responsive-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodaysBoard } from "@/components/coach-tools/todays-board";
import { useDebounce } from "@/hooks/use-debounce";
import { useClientBillingPlan, useCoachClients, useCoachPaymentsDashboard, useCoachToolMutations } from "@/hooks/use-coach-tools";
import { formatCurrencyAmount } from "@/lib/clients/dashboard";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

const BillingPlanDialog = dynamic(() =>
  import("@/components/coach-tools/billing-plan-dialog").then((mod) => mod.BillingPlanDialog)
);

type ViewMode = "today" | "transactions" | "billing";
type PaymentSortKey = "created_at" | "amount";
type TableSortId = "created_at" | "amount";
type BillingStatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_SORTING: SortingState = [{ id: "created_at", desc: true }];
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };
const PAYMENT_DESCRIPTION_WORD_LIMIT = 20;
const PAYMENT_NOTES_WORD_LIMIT = 60;
const TABLE_TEXT_WORD_LIMIT = 24;
const DEFAULT_VISIBILITY: VisibilityState = {
  client_name: true,
  description: true,
  notes: false,
  created_at: true,
  status: true,
  amount: true,
};
const TABLE_STORAGE_KEY = "coach-payments-table:v1";
const BILLING_TABLE_STORAGE_KEY = "coach-client-billing-table:v1";
const SORT_COLUMN_MAP: Record<TableSortId, PaymentSortKey> = {
  created_at: "created_at",
  amount: "amount",
};
const COLUMN_LABELS: Record<string, string> = {
  client_name: "Client",
  description: "Description",
  notes: "Notes",
  created_at: "Date",
  status: "Status",
  amount: "Amount Charged",
  actions: "Actions",
};
const BILLING_COLUMN_LABELS: Record<string, string> = {
  client_name: "Client",
  billing_type: "Billing Type",
  session_rate: "Rate",
  sessions_remaining: "Sessions",
  total_paid: "Total Paid",
  outstanding: "Outstanding",
  next_billing_date: "Next Billing",
  is_active_plan: "Status",
  actions: "Actions",
};

type PersistedPaymentsTableState = {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  pagination: PaginationState;
};

function normalizeTransactionSortId(id: string): TableSortId | null {
  if (id === "created_at" || id === "payment_date") return "created_at";
  if (id === "total_paid" || id === "amount") return "amount";
  return null;
}

function sanitizeTransactionSorting(sorting: SortingState | undefined): SortingState {
  if (!Array.isArray(sorting)) return DEFAULT_SORTING;
  const normalized = sorting
    .map((item) => {
      const id = normalizeTransactionSortId(String(item.id));
      if (!id) return null;
      return { id, desc: Boolean(item.desc) };
    })
    .filter((item): item is { id: TableSortId; desc: boolean } => item !== null);
  return normalized.length > 0 ? normalized : DEFAULT_SORTING;
}

function sanitizeTransactionVisibility(visibility: VisibilityState | undefined): VisibilityState {
  if (!visibility || typeof visibility !== "object") return DEFAULT_VISIBILITY;
  const next: VisibilityState = { ...DEFAULT_VISIBILITY };
  for (const [key, value] of Object.entries(visibility)) {
    const normalizedKey = key === "total_paid" ? "amount" : key;
    if (!(normalizedKey in DEFAULT_VISIBILITY) && normalizedKey !== "actions") continue;
    next[normalizedKey] = Boolean(value);
  }
  return next;
}

function parsePersistedTableState(value: string | null): PersistedPaymentsTableState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersistedPaymentsTableState>;
    const pagination =
      parsed.pagination &&
      typeof parsed.pagination.pageIndex === "number" &&
      typeof parsed.pagination.pageSize === "number"
        ? parsed.pagination
        : DEFAULT_PAGINATION;
    return {
      sorting: sanitizeTransactionSorting(parsed.sorting),
      columnVisibility: sanitizeTransactionVisibility(
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? (parsed.columnVisibility as VisibilityState)
          : undefined
      ),
      pagination,
    };
  } catch {
    return null;
  }
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const parsed = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function compactRelative(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function countWords(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function clampToWordLimit(value: string, maxWords: number) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return words.slice(0, maxWords).join(" ");
}

function truncateWords(value: string, maxWords: number) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function paymentNotesBody(value: string | null) {
  if (!value) return "";
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return "";
  return lines.slice(1).join(" ");
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

function KpiCard({
  title,
  value,
  Icon,
  tone,
  loading,
}: {
  title: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  loading: boolean;
}) {
  return (
    <div className="glass-surface rounded-[10px] border border-border/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("grid h-7 w-7 place-items-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? <Skeleton className="h-9 w-24 rounded-lg" /> : <p className="text-3xl font-semibold tracking-tight">{value}</p>}
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
    </div>
  );
}

export function CoachPaymentsDashboard({ initialData }: { initialData?: CoachPaymentsDashboardData | null }) {
  const [mode, setMode] = useState<ViewMode>("today");
  const [search, setSearch] = useState("");
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CoachPaymentTransactionRow | null>(null);
  const [planDialogClient, setPlanDialogClient] = useState<{
    clientId: string;
    clientName: string;
  } | null>(null);

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [paymentCursorByPage, setPaymentCursorByPage] = useState<Record<number, string | null>>({ 0: null });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [tableStateHydrated, setTableStateHydrated] = useState(false);
  const [billingSearch, setBillingSearch] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState<BillingStatusFilter>("all");
  const [billingSorting, setBillingSorting] = useState<SortingState>([{ id: "client_name", desc: false }]);
  const [billingPagination, setBillingPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [billingVisibility, setBillingVisibility] = useState<VisibilityState>({
    client_name: true,
    billing_type: true,
    session_rate: true,
    sessions_remaining: true,
    total_paid: true,
    outstanding: true,
    next_billing_date: true,
    is_active_plan: true,
  });
  const [billingTableHydrated, setBillingTableHydrated] = useState(false);

  const [recordClientId, setRecordClientId] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordNotes, setRecordNotes] = useState("");

  const [detailDescription, setDetailDescription] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [detailStatus, setDetailStatus] = useState<PaymentStatus>("paid");
  const [detailMethod, setDetailMethod] = useState<PaymentMethod>("card");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parsePersistedTableState(window.localStorage.getItem(TABLE_STORAGE_KEY));
    if (parsed) {
      setSorting(parsed.sorting);
      setColumnVisibility({
        ...DEFAULT_VISIBILITY,
        ...parsed.columnVisibility,
      });
      setPagination({ ...parsed.pagination, pageIndex: 0 });
    }
    setTableStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!tableStateHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      TABLE_STORAGE_KEY,
      JSON.stringify({
        sorting,
        columnVisibility,
        pagination,
      } satisfies PersistedPaymentsTableState)
    );
  }, [columnVisibility, pagination, sorting, tableStateHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BILLING_TABLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          sorting?: SortingState;
          pagination?: PaginationState;
          visibility?: VisibilityState;
          status?: BillingStatusFilter;
        };
        if (Array.isArray(parsed.sorting)) setBillingSorting(parsed.sorting);
        if (parsed.pagination && typeof parsed.pagination.pageIndex === "number" && typeof parsed.pagination.pageSize === "number") {
          setBillingPagination(parsed.pagination);
        }
        if (parsed.visibility && typeof parsed.visibility === "object") {
          setBillingVisibility((current) => ({ ...current, ...parsed.visibility }));
        }
        if (parsed.status === "all" || parsed.status === "active" || parsed.status === "inactive") {
          setBillingStatusFilter(parsed.status);
        }
      }
    } catch {
      // noop
    }
    setBillingTableHydrated(true);
  }, []);

  useEffect(() => {
    if (!billingTableHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      BILLING_TABLE_STORAGE_KEY,
      JSON.stringify({
        sorting: billingSorting,
        pagination: billingPagination,
        visibility: billingVisibility,
        status: billingStatusFilter,
      })
    );
  }, [billingPagination, billingSorting, billingStatusFilter, billingTableHydrated, billingVisibility]);

  const debouncedSearch = useDebounce(search, 220);
  const tableSort = sorting[0];
  const sortBy = tableSort ? SORT_COLUMN_MAP[tableSort.id as TableSortId] ?? "created_at" : "created_at";
  const sortDir = tableSort ? (tableSort.desc ? "desc" : "asc") : "desc";

  const shouldHydrateFromServer =
    !debouncedSearch &&
    pagination.pageIndex === 0 &&
    pagination.pageSize === DEFAULT_PAGINATION.pageSize &&
    sortBy === "created_at" &&
    sortDir === "desc";

  const paymentsQuery = useCoachPaymentsDashboard(
    {
      status: "all",
      search: debouncedSearch,
      limit: mode === "transactions" ? 1500 : 300,
      cursor: paymentCursorByPage[pagination.pageIndex] ?? null,
      page: 0,
      pageSize: pagination.pageSize,
      sortBy,
      sortDir,
    },
    {
      initialData: shouldHydrateFromServer ? (initialData ?? undefined) : undefined,
    }
  );
  const clientsQuery = useCoachClients({
    pageSize: 100,
    search: "",
    status: "all",
    sortBy: "first_name",
    sortDir: "asc",
    enabled: isRecordOpen,
  });
  const mutations = useCoachToolMutations();
  const billingPlanQuery = useClientBillingPlan(planDialogClient?.clientId || "");

  useEffect(() => {
    if (!selectedTransaction) {
      return;
    }

    const notesValue = selectedTransaction.notes || "";
    const lines = notesValue.split("\n");
    setDetailDescription(clampToWordLimit((lines[0] || selectedTransaction.description || "").trim(), PAYMENT_DESCRIPTION_WORD_LIMIT));
    setDetailNotes(clampToWordLimit(lines.slice(1).join(" ").trim(), PAYMENT_NOTES_WORD_LIMIT));
    setDetailStatus(selectedTransaction.status === "overdue" ? "pending" : selectedTransaction.status);
    setDetailMethod(selectedTransaction.method);
  }, [selectedTransaction]);

  const clientOptions = useMemo(() => {
    const rows = clientsQuery.data?.pages.flatMap((page) => page.data) || [];
    return rows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name || ""}`.trim(),
    }));
  }, [clientsQuery.data?.pages]);
  const billingByClientId = useMemo(() => {
    const map = new Map<string, CoachPaymentsDashboardData["client_billing"][number]>();
    for (const row of paymentsQuery.data?.client_billing || []) {
      map.set(row.client_id, row);
    }
    return map;
  }, [paymentsQuery.data?.client_billing]);

  useEffect(() => {
    if (!isRecordOpen) return;
    if (recordClientId) return;
    if (clientOptions.length === 0) return;
    setRecordClientId(clientOptions[0].id);
  }, [clientOptions, isRecordOpen, recordClientId]);

  const resetPage = useCallback(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setPaymentCursorByPage({ 0: null });
  }, []);

  const onRecordPayment = async () => {
    if (!recordClientId) {
      toast.error("Select a client.");
      return;
    }

    const billing = billingByClientId.get(recordClientId);
    const computedAmount =
      billing?.billing_type === "monthly"
        ? Number(billing.monthly_amount || billing.session_rate || 0)
        : Number(billing?.session_rate || 0);
    if (!Number.isFinite(computedAmount) || computedAmount <= 0) {
      toast.error("No valid billing amount found for this client. Set up billing first.");
      return;
    }

    const description = clampToWordLimit(recordDescription, PAYMENT_DESCRIPTION_WORD_LIMIT);
    const normalizedDescription = description || "Client payment";
    const normalizedNotes = clampToWordLimit(recordNotes, PAYMENT_NOTES_WORD_LIMIT);

    try {
      await mutations.recordPayment.mutateAsync({
        client_id: recordClientId,
        amount: computedAmount,
        payment_date: new Date().toISOString().slice(0, 10),
        status: "paid",
        method: billing?.payment_method || "card",
        currency: billing?.currency || "USD",
        notes: [normalizedDescription, normalizedNotes].filter(Boolean).join("\n") || null,
      });
      setIsRecordOpen(false);
      setRecordDescription("");
      setRecordNotes("");
      toast.success("Payment saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payment");
    }
  };

  const onSavePaymentDetails = async () => {
    if (!selectedTransaction) return;

    const description = clampToWordLimit(detailDescription, PAYMENT_DESCRIPTION_WORD_LIMIT);
    const normalizedDescription = description || "Client payment";
    const normalizedNotes = clampToWordLimit(detailNotes, PAYMENT_NOTES_WORD_LIMIT);
    const mergedNotes = [normalizedDescription, normalizedNotes].filter(Boolean).join("\n") || null;

    const result = await withToastFeedback(
      mutations.updatePaymentDetails.mutateAsync({
        id: selectedTransaction.id,
        method: detailMethod,
        status: detailStatus,
        notes: mergedNotes,
      }),
      {
        loading: "Updating payment details...",
        success: "Payment details updated",
        error: "Unable to update payment",
      }
    ).catch(() => null);
    if (!result) return;

    setSelectedTransaction((current) =>
      current && current.id === selectedTransaction.id
        ? {
            ...current,
            method: detailMethod,
            status: detailStatus,
            notes: mergedNotes,
            description: normalizedDescription,
          }
        : current
    );
  };

  const onDeletePayment = async () => {
    if (!selectedTransaction) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this payment permanently?");
    if (!confirmed) {
      return;
    }

    const result = await withToastFeedback(mutations.deletePayment.mutateAsync({ id: selectedTransaction.id }), {
      loading: "Deleting payment...",
      success: "Payment deleted",
      error: "Unable to delete payment",
    }).catch(() => null);
    if (!result) return;
    setSelectedTransaction(null);
  };

  const transactionRows = useMemo(
    () => paymentsQuery.data?.transactions || [],
    [paymentsQuery.data?.transactions]
  );
  const totalRows = paymentsQuery.data?.transactions_total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(1, pagination.pageSize)));
  const billingPlansAvailable = paymentsQuery.data?.features.billing_plans_available ?? true;
  const paymentLogsAvailable = paymentsQuery.data?.features.payment_logs_available ?? true;
  const billingAndLogsAvailable = billingPlansAvailable && paymentLogsAvailable;

  useEffect(() => {
    if (!paymentsQuery.data) return;
    if (pagination.pageIndex < totalPages) return;
    setPagination((current) => ({
      ...current,
      pageIndex: Math.max(0, totalPages - 1),
    }));
  }, [pagination.pageIndex, paymentsQuery.data, totalPages]);

  const columns = useMemo<ColumnDef<CoachPaymentTransactionRow>[]>(
    () => [
      {
        accessorKey: "client_name",
        enableHiding: true,
        enableSorting: false,
        header: "Client",
        cell: ({ row }) => (
          <span className="font-medium transition-colors group-hover:text-chart-1">{row.original.client_name}</span>
        ),
      },
      {
        accessorKey: "description",
        enableHiding: true,
        enableSorting: false,
        header: "Description",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{truncateWords(row.original.description, TABLE_TEXT_WORD_LIMIT)}</span>
        ),
      },
      {
        accessorKey: "notes",
        id: "notes",
        enableHiding: true,
        enableSorting: false,
        header: "Notes",
        cell: ({ row }) => {
          const notes = paymentNotesBody(row.original.notes);
          return <span className="text-muted-foreground">{notes ? truncateWords(notes, TABLE_TEXT_WORD_LIMIT) : "—"}</span>;
        },
      },
      {
        accessorKey: "created_at",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Date"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => dateLabel(row.original.created_at),
      },
      {
        accessorKey: "status",
        id: "status",
        enableHiding: true,
        enableSorting: false,
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const statusClass =
            status === "paid"
              ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
              : status === "pending"
                ? "border-chart-4/40 bg-chart-4/10 text-chart-4"
                : "border-destructive/40 bg-destructive/10 text-destructive";
          return (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusClass)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status}
            </span>
          );
        },
      },
      {
        id: "amount",
        accessorKey: "amount",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Amount Charged"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatCurrencyAmount(Number(row.original.amount || 0), row.original.currency),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-border/60"
            onClick={() => setSelectedTransaction(row.original)}
          >
            Details
          </Button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: transactionRows,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
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

  const canPrevious = pagination.pageIndex > 0 && !paymentsQuery.isFetching;
  const canNext = Boolean(paymentsQuery.data?.has_more) && !paymentsQuery.isFetching;

  const goToNextPage = useCallback(() => {
    const targetPage = pagination.pageIndex + 1;
    const nextCursor = paymentsQuery.data?.nextCursor;
    if (!nextCursor) return;
    setPaymentCursorByPage((current) => ({
      ...current,
      [targetPage]: nextCursor,
    }));
    table.setPageIndex(targetPage);
  }, [pagination.pageIndex, paymentsQuery.data?.nextCursor, table]);

  const filteredBillingRows = useMemo(() => {
    const normalizedSearch = billingSearch.trim().toLowerCase();
    return (paymentsQuery.data?.client_billing || []).filter((row) => {
      if (billingStatusFilter === "active" && !row.is_active_plan) return false;
      if (billingStatusFilter === "inactive" && row.is_active_plan) return false;
      if (!normalizedSearch) return true;
      const haystack = `${row.client_name} ${row.billing_type || ""} ${row.plan_notes || ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [billingSearch, billingStatusFilter, paymentsQuery.data?.client_billing]);

  const billingColumns = useMemo<ColumnDef<CoachPaymentsDashboardData["client_billing"][number]>[]>(
    () => [
      {
        accessorKey: "client_name",
        header: ({ column }) => (
          <SortHeader
            label="Client"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
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
        cell: ({ row }) => row.original.billing_type?.replaceAll("_", " ") || "No plan configured",
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
        cell: ({ row }) =>
          row.original.session_rate === null ? "—" : formatCurrencyAmount(row.original.session_rate, row.original.currency || "USD"),
      },
      {
        accessorKey: "sessions_remaining",
        header: ({ column }) => (
          <SortHeader
            label="Sessions"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) =>
          row.original.billing_type === "session_package" || row.original.billing_type === "program"
            ? `${row.original.sessions_used}/${row.original.sessions_purchased} · ${row.original.sessions_remaining} left`
            : "—",
      },
      {
        accessorKey: "total_paid",
        header: ({ column }) => (
          <SortHeader
            label="Total Paid"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatCurrencyAmount(row.original.total_paid, "USD"),
      },
      {
        accessorKey: "outstanding",
        header: ({ column }) => (
          <SortHeader
            label="Outstanding"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className={cn(row.original.outstanding > 0 ? "text-chart-4" : "text-foreground")}>
            {formatCurrencyAmount(row.original.outstanding, "USD")}
          </span>
        ),
      },
      {
        accessorKey: "next_billing_date",
        header: ({ column }) => (
          <SortHeader
            label="Next Billing"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => dateLabel(row.original.next_billing_date),
      },
      {
        accessorKey: "is_active_plan",
        header: ({ column }) => (
          <SortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
              row.original.is_active_plan
                ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                : "border-border/60 bg-muted/30 text-muted-foreground"
            )}
          >
            {row.original.is_active_plan ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-border/60"
            onClick={() => setPlanDialogClient({ clientId: row.original.client_id, clientName: row.original.client_name })}
          >
            {row.original.billing_type ? "Edit Plan" : "Set Up Plan"}
          </Button>
        ),
      },
    ],
    []
  );

  const billingTable = useReactTable({
    data: filteredBillingRows,
    columns: billingColumns,
    state: {
      sorting: billingSorting,
      pagination: billingPagination,
      columnVisibility: billingVisibility,
    },
    onSortingChange: (updater) => {
      setBillingSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      setBillingPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: (updater) => {
      setBillingPagination((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onColumnVisibilityChange: (updater) => {
      setBillingVisibility((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">All client billing in one place</p>
        </div>

        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogTrigger asChild>
            <Button className="accent-strong rounded-xl text-black">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Capture a payment for a client billing entry.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={recordClientId} onValueChange={setRecordClientId}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                    <SelectValue placeholder={clientsQuery.isLoading ? "Loading clients..." : "Select client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={recordDescription}
                  onChange={(event) =>
                    setRecordDescription(clampToWordLimit(event.target.value, PAYMENT_DESCRIPTION_WORD_LIMIT))
                  }
                  className="rounded-xl border-border/60 bg-muted/20"
                  placeholder="e.g. Monthly coaching - April"
                />
                <p className="text-xs text-muted-foreground">
                  {countWords(recordDescription)}/{PAYMENT_DESCRIPTION_WORD_LIMIT} words
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Amount, status, and date are now auto-filled from the client billing setup and current date.
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={recordNotes}
                  onChange={(event) => setRecordNotes(clampToWordLimit(event.target.value, PAYMENT_NOTES_WORD_LIMIT))}
                  className="rounded-xl border-border/60 bg-muted/20"
                  placeholder="Any additional details..."
                />
                <p className="text-xs text-muted-foreground">
                  {countWords(recordNotes)}/{PAYMENT_NOTES_WORD_LIMIT} words
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setIsRecordOpen(false)}>
                Cancel
              </Button>
              <Button
                className="accent-strong rounded-xl text-black"
                onClick={() => void onRecordPayment()}
                disabled={mutations.recordPayment.isPending}
              >
                {mutations.recordPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-7">
        <KpiCard
          title="Total Collected"
          value={formatCurrencyAmount(paymentsQuery.data?.kpis.total_collected || 0, "USD")}
          Icon={CircleDollarSign}
          tone="bg-chart-2/20 text-chart-2"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Pending"
          value={formatCurrencyAmount(paymentsQuery.data?.kpis.pending_amount || 0, "USD")}
          Icon={Clock3}
          tone="bg-chart-4/20 text-chart-4"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Overdue"
          value={formatCurrencyAmount(paymentsQuery.data?.kpis.overdue_amount || 0, "USD")}
          Icon={TriangleAlert}
          tone="bg-destructive/20 text-destructive"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Active Billing"
          value={String(paymentsQuery.data?.kpis.active_billing || 0)}
          Icon={UserRound}
          tone="bg-chart-3/20 text-chart-3"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Logged Today"
          value={String(paymentsQuery.data?.kpis.sessions_logged_today || 0)}
          Icon={Clock3}
          tone="bg-chart-3/20 text-chart-3"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Logged This Week"
          value={String(paymentsQuery.data?.kpis.sessions_logged_this_week || 0)}
          Icon={Clock3}
          tone="bg-chart-1/20 text-chart-1"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Expiring Packages"
          value={String(paymentsQuery.data?.kpis.packages_expiring_soon || 0)}
          Icon={TriangleAlert}
          tone="bg-chart-4/20 text-chart-4"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
        <KpiCard
          title="Clients Due Today"
          value={String(paymentsQuery.data?.kpis.clients_due_today || 0)}
          Icon={UserRound}
          tone="bg-chart-5/20 text-chart-5"
          loading={paymentsQuery.isLoading && !paymentsQuery.data}
        />
      </section>

      {paymentsQuery.isError ? (
        <div className="glass-surface surface-pad text-sm text-destructive">
          {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : "Unable to load payments"}
        </div>
      ) : null}

      <section className="glass-surface rounded-[10px] border border-border/60 p-3 md:p-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as ViewMode)}>
          <TabsList className="rounded-xl bg-muted/30">
            <TabsTrigger value="today" className="rounded-lg">Daily Log Board</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-lg">Payment Records</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg">Billing Plans</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "today" ? (
          <div className="mt-3">
            <TodaysBoard
              rows={paymentsQuery.data?.todays_board || []}
              loading={paymentsQuery.isLoading && !paymentsQuery.data}
              featureAvailable={billingAndLogsAvailable}
              unavailableMessage="Daily session logging is unavailable. Apply migration 20260313100000_billing_plans_and_payment_logs.sql and reload the Supabase schema cache."
            />
          </div>
        ) : mode === "transactions" ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    resetPage();
                  }}
                  className="rounded-xl border-border/60 bg-muted/20 pl-9"
                  placeholder="Search payments..."
                />
              </div>

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
            </div>

            <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className={cn("relative", header.id === "actions" ? "text-right" : undefined)}
                        >
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
                  {paymentsQuery.isLoading && !paymentsQuery.data ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell colSpan={table.getVisibleLeafColumns().length}>
                          <Skeleton className="h-6 w-full rounded-lg" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={table.getVisibleLeafColumns().length} className="py-8 text-center text-sm text-muted-foreground">
                        No payments match this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="group cursor-pointer" onClick={() => setSelectedTransaction(row.original)}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : undefined}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 md:hidden">
              {paymentsQuery.isLoading && !paymentsQuery.data ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={`mobile-skeleton-${index}`} className="h-20 w-full rounded-xl" />)
              ) : table.getRowModel().rows.length === 0 ? (
                <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-sm text-muted-foreground">No payments match this filter.</p>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedTransaction(row.original)}
                    className="group w-full rounded-xl border border-border/60 bg-background/35 p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium transition-colors group-hover:text-chart-1">{row.original.client_name}</p>
                      <span className="text-xs text-muted-foreground">{dateLabel(row.original.created_at)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{row.original.description}</p>
                    <p className="mt-2 text-sm font-semibold">{formatCurrencyAmount(Number(row.original.amount || 0), row.original.currency)}</p>
                  </button>
                ))
              )}
            </div>

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
                    setPaymentCursorByPage({ 0: null });
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
                  onClick={goToNextPage}
                  disabled={!canNext}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {paymentsQuery.isLoading && !paymentsQuery.data ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={`billing-skeleton-${index}`} className="h-24 w-full rounded-[10px]" />)
            ) : !billingPlansAvailable ? (
              <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-sm text-muted-foreground">
                Billing plans are unavailable. Apply migration
                {" "}
                <code>20260313100000_billing_plans_and_payment_logs.sql</code>
                {" "}
                and reload the Supabase schema cache.
              </p>
            ) : (paymentsQuery.data?.client_billing.length || 0) === 0 ? (
              <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-sm text-muted-foreground">No client billing profiles yet.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={billingSearch}
                      onChange={(event) => {
                        setBillingSearch(event.target.value);
                        setBillingPagination((current) => ({ ...current, pageIndex: 0 }));
                      }}
                      className="rounded-xl border-border/60 bg-muted/20 pl-9"
                      placeholder="Search billing..."
                    />
                  </div>
                  <Select
                    value={billingStatusFilter}
                    onValueChange={(value) => {
                      setBillingStatusFilter(value as BillingStatusFilter);
                      setBillingPagination((current) => ({ ...current, pageIndex: 0 }));
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
                      {billingTable
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
                              aria-label={`Toggle ${BILLING_COLUMN_LABELS[column.id] || column.id}`}
                            />
                            <span>{BILLING_COLUMN_LABELS[column.id] || column.id}</span>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
                  <Table>
                    <TableHeader>
                      {billingTable.getHeaderGroups().map((headerGroup) => (
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
                      {billingTable.getRowModel().rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={billingTable.getVisibleLeafColumns().length} className="py-8 text-center text-sm text-muted-foreground">
                            No billing rows match this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        billingTable.getRowModel().rows.map((row) => (
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
                  {billingTable.getRowModel().rows.map((row) => {
                    const item = row.original;
                    const hasPlan = Boolean(item.billing_type);
                    const isPackageType = item.billing_type === "session_package" || item.billing_type === "program";
                    const rateLabel =
                      item.session_rate === null ? "—" : formatCurrencyAmount(item.session_rate, item.currency || "USD");
                    return (
                      <article key={item.client_id} className="rounded-xl border border-border/60 bg-background/35 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{item.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {hasPlan ? item.billing_type?.replaceAll("_", " ") : "No plan configured"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                              item.is_active_plan
                                ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                                : "border-border/60 bg-muted/30 text-muted-foreground"
                            )}
                          >
                            {item.is_active_plan ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Rate: {rateLabel}</p>
                        {isPackageType ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sessions: {item.sessions_used}/{item.sessions_purchased} · {item.sessions_remaining} left
                          </p>
                        ) : null}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <p>Total Paid: {formatCurrencyAmount(item.total_paid, "USD")}</p>
                          <p>Outstanding: {formatCurrencyAmount(item.outstanding, "USD")}</p>
                          <p>Next: {dateLabel(item.next_billing_date)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-8 rounded-lg border-border/60"
                          onClick={() => setPlanDialogClient({ clientId: item.client_id, clientName: item.client_name })}
                        >
                          {hasPlan ? "Edit Plan" : "Set Up Plan"}
                        </Button>
                      </article>
                    );
                  })}
                </div>

                <section className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing{" "}
                    {filteredBillingRows.length === 0
                      ? 0
                      : billingPagination.pageIndex * billingPagination.pageSize + 1}
                    {" "}
                    to{" "}
                    {Math.min(
                      filteredBillingRows.length,
                      (billingPagination.pageIndex + 1) * billingPagination.pageSize
                    )}{" "}
                    of {filteredBillingRows.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(billingPagination.pageSize)}
                      onValueChange={(value) => {
                        const parsed = Number(value);
                        if (!Number.isFinite(parsed) || parsed <= 0) return;
                        setBillingPagination({ pageIndex: 0, pageSize: parsed });
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
                      onClick={() => billingTable.setPageIndex(Math.max(0, billingPagination.pageIndex - 1))}
                      disabled={billingPagination.pageIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous page</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-xl border-border/60"
                      onClick={() => billingTable.setPageIndex(billingPagination.pageIndex + 1)}
                      disabled={!billingTable.getCanNextPage()}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next page</span>
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </section>

      {planDialogClient ? (
        <BillingPlanDialog
          open={Boolean(planDialogClient)}
          onOpenChange={(next) => {
            if (!next) setPlanDialogClient(null);
          }}
          clientId={planDialogClient.clientId}
          clientName={planDialogClient.clientName}
          existingPlan={billingPlanQuery.data || null}
          mode={billingPlanQuery.data ? "edit" : "create"}
        />
      ) : null}

      {selectedTransaction ? (
        <section className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="flex-1 bg-black/70"
            aria-label="Close"
            onClick={() => setSelectedTransaction(null)}
          />
          <div className="w-full max-w-md overflow-y-auto border-l border-border/70 bg-card/98 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedTransaction(null)}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Client: </span>
                {selectedTransaction.client_name}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Updated: </span>
                {compactRelative(selectedTransaction.updated_at)}
              </div>
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input
                    value={detailDescription}
                    onChange={(event) =>
                      setDetailDescription(clampToWordLimit(event.target.value, PAYMENT_DESCRIPTION_WORD_LIMIT))
                    }
                    className="rounded-lg border-border/60 bg-background/40"
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(detailDescription)}/{PAYMENT_DESCRIPTION_WORD_LIMIT} words
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Additional Notes</Label>
                  <Input
                    value={detailNotes}
                    onChange={(event) =>
                      setDetailNotes(clampToWordLimit(event.target.value, PAYMENT_NOTES_WORD_LIMIT))
                    }
                    className="rounded-lg border-border/60 bg-background/40"
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(detailNotes)}/{PAYMENT_NOTES_WORD_LIMIT} words
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={detailStatus} onValueChange={(value) => setDetailStatus(value as PaymentStatus)}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-background/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select value={detailMethod} onValueChange={(value) => setDetailMethod(value as PaymentMethod)}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-background/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full rounded-xl border-border/60"
                onClick={() => setSelectedTransaction(null)}
                disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending}
              >
                Cancel
              </Button>
              <Button
                className="w-full rounded-xl"
                onClick={() => void onSavePaymentDetails()}
                disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending}
              >
                {mutations.updatePaymentDetails.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
              <Button
                variant="destructive"
                className="w-full rounded-xl"
                onClick={() => void onDeletePayment()}
                disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending}
              >
                {mutations.deletePayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Payment
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {paymentsQuery.isFetching && paymentsQuery.data ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Syncing latest payments...
        </div>
      ) : null}
    </div>
  );
}
