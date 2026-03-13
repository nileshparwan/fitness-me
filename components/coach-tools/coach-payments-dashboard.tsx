"use client";

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
import { useDebounce } from "@/hooks/use-debounce";
import { useCoachClients, useCoachPaymentsDashboard, useCoachToolMutations } from "@/hooks/use-coach-tools";
import { formatCurrencyAmount } from "@/lib/clients/dashboard";
import { cn } from "@/utils";

const STATUS_OPTIONS = ["all", "paid", "pending", "overdue", "failed", "refunded"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

type ViewMode = "transactions" | "billing";
type RecordInvoiceType = "one_time" | "subscription" | "package";
type PaymentSortKey = "payment_date" | "amount" | "status" | "updated_at";
type TableSortId = "payment_date" | "amount" | "status" | "updated_at";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_SORTING: SortingState = [{ id: "payment_date", desc: true }];
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 10 };
const DEFAULT_VISIBILITY: VisibilityState = {
  client_name: true,
  description: true,
  type: true,
  payment_date: true,
  amount: true,
  status: true,
  updated_at: false,
  method: false,
};
const TABLE_STORAGE_KEY = "coach-payments-table:v1";
const SORT_COLUMN_MAP: Record<TableSortId, PaymentSortKey> = {
  payment_date: "payment_date",
  amount: "amount",
  status: "status",
  updated_at: "updated_at",
};
const COLUMN_LABELS: Record<string, string> = {
  client_name: "Client",
  description: "Description",
  type: "Type",
  payment_date: "Date",
  amount: "Amount",
  status: "Status",
  updated_at: "Updated",
  method: "Method",
  actions: "Actions",
};

type PersistedPaymentsTableState = {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  pagination: PaginationState;
};

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
      sorting: Array.isArray(parsed.sorting) ? parsed.sorting : DEFAULT_SORTING,
      columnVisibility:
        parsed.columnVisibility && typeof parsed.columnVisibility === "object"
          ? (parsed.columnVisibility as VisibilityState)
          : DEFAULT_VISIBILITY,
      pagination,
    };
  } catch {
    return null;
  }
}

function statusBadgeClass(status: string) {
  if (status === "paid") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "pending") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "overdue" || status === "failed") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "refunded") return "border-chart-5/40 bg-chart-5/10 text-chart-5";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function paymentTypeLabel(type: string) {
  if (type === "subscription") return "Subscription";
  if (type === "package") return "Package";
  return "One-Time";
}

function clientStatusClass(status: string) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function compactRelative(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function computeSubscriptionEndDate(startDateIso: string) {
  const start = new Date(`${startDateIso}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
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
  onClick: () => void;
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
    <div className="glass-surface rounded-2xl border border-border/60 p-4">
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
  const [mode, setMode] = useState<ViewMode>("transactions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CoachPaymentTransactionRow | null>(null);

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [tableStateHydrated, setTableStateHydrated] = useState(false);

  const [recordClientId, setRecordClientId] = useState("");
  const [recordDescription, setRecordDescription] = useState("");
  const [recordType, setRecordType] = useState<RecordInvoiceType>("one_time");
  const [recordAmount, setRecordAmount] = useState("200");
  const [recordStatus, setRecordStatus] = useState<PaymentStatus>("paid");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [recordNotes, setRecordNotes] = useState("");

  const [detailDescription, setDetailDescription] = useState("");
  const [detailNotes, setDetailNotes] = useState("");
  const [detailType, setDetailType] = useState<RecordInvoiceType>("one_time");
  const [detailAmount, setDetailAmount] = useState("0");
  const [detailDate, setDetailDate] = useState("");
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
      setPagination(parsed.pagination);
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

  const debouncedSearch = useDebounce(search, 220);
  const tableSort = sorting[0];
  const sortBy = tableSort ? SORT_COLUMN_MAP[tableSort.id as TableSortId] ?? "payment_date" : "payment_date";
  const sortDir = tableSort ? (tableSort.desc ? "desc" : "asc") : "desc";

  const shouldHydrateFromServer =
    statusFilter === "all" &&
    !debouncedSearch &&
    pagination.pageIndex === 0 &&
    pagination.pageSize === DEFAULT_PAGINATION.pageSize &&
    sortBy === "payment_date" &&
    sortDir === "desc";

  const paymentsQuery = useCoachPaymentsDashboard(
    {
      status: statusFilter,
      search: debouncedSearch,
      limit: 1500,
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortBy,
      sortDir,
    },
    {
      initialData: shouldHydrateFromServer ? (initialData ?? undefined) : undefined,
    }
  );
  const clientsQuery = useCoachClients({
    page: 0,
    pageSize: 100,
    search: "",
    status: "all",
    sortBy: "first_name",
    sortDir: "asc",
    enabled: isRecordOpen,
  });
  const mutations = useCoachToolMutations();

  useEffect(() => {
    if (!selectedTransaction) {
      return;
    }

    const notesValue = selectedTransaction.notes || "";
    const lines = notesValue.split("\n");
    setDetailDescription((lines[0] || selectedTransaction.description || "").trim());
    setDetailNotes(lines.slice(1).join("\n").trim());
    setDetailType(selectedTransaction.type);
    setDetailAmount(String(selectedTransaction.amount || 0));
    setDetailDate(selectedTransaction.payment_date);
    setDetailStatus(selectedTransaction.status === "overdue" ? "pending" : selectedTransaction.status);
    setDetailMethod(selectedTransaction.method);
  }, [selectedTransaction]);

  const clientOptions = useMemo(() => {
    return (clientsQuery.data?.rows || []).map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name || ""}`.trim(),
    }));
  }, [clientsQuery.data?.rows]);

  useEffect(() => {
    if (!isRecordOpen) return;
    if (recordClientId) return;
    if (clientOptions.length === 0) return;
    setRecordClientId(clientOptions[0].id);
  }, [clientOptions, isRecordOpen, recordClientId]);

  const resetPage = useCallback(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const onRecordPayment = async () => {
    const amount = Number(recordAmount);
    if (!recordClientId) {
      toast.error("Select a client.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const description = recordDescription.trim();
    const normalizedDescription =
      recordType === "package"
        ? description
          ? /package/i.test(description)
            ? description
            : `Package - ${description}`
          : "Package"
        : recordType === "subscription"
          ? description || "Subscription"
          : description || "Client payment";

    const periodStart = recordType === "subscription" ? recordDate : null;
    const periodEnd = recordType === "subscription" ? computeSubscriptionEndDate(recordDate) : null;

    try {
      await mutations.recordPayment.mutateAsync({
        client_id: recordClientId,
        amount,
        payment_date: recordDate,
        status: recordStatus,
        method: "card",
        period_start: periodStart,
        period_end: periodEnd,
        notes: [normalizedDescription, recordNotes.trim()].filter(Boolean).join("\n") || null,
      });
      setIsRecordOpen(false);
      setRecordDescription("");
      setRecordType("one_time");
      setRecordNotes("");
      setRecordAmount("200");
      setRecordDate(new Date().toISOString().slice(0, 10));
      setRecordStatus("paid");
      toast.success("Payment saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payment");
    }
  };

  const onSavePaymentDetails = async () => {
    if (!selectedTransaction) return;
    const amount = Number(detailAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!detailDate) {
      toast.error("Select a valid payment date.");
      return;
    }

    const description = detailDescription.trim();
    const normalizedDescription =
      detailType === "package"
        ? description
          ? /package/i.test(description)
            ? description
            : `Package - ${description}`
          : "Package"
        : detailType === "subscription"
          ? description || "Subscription"
          : description || "Client payment";
    const mergedNotes = [normalizedDescription, detailNotes.trim()].filter(Boolean).join("\n") || null;
    const periodStart = detailType === "subscription" ? detailDate : null;
    const periodEnd = detailType === "subscription" ? computeSubscriptionEndDate(detailDate) : null;

    try {
      await mutations.updatePaymentDetails.mutateAsync({
        id: selectedTransaction.id,
        amount,
        payment_date: detailDate,
        method: detailMethod,
        status: detailStatus,
        period_start: periodStart,
        period_end: periodEnd,
        notes: mergedNotes,
      });
      setSelectedTransaction((current) =>
        current && current.id === selectedTransaction.id
          ? {
              ...current,
              amount,
              payment_date: detailDate,
              method: detailMethod,
              status: detailStatus,
              type: detailType,
              notes: mergedNotes,
              description: normalizedDescription,
            }
          : current
      );
      toast.success("Payment details updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payment");
    }
  };

  const onDeletePayment = async () => {
    if (!selectedTransaction) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this payment permanently?");
    if (!confirmed) {
      return;
    }

    try {
      await mutations.deletePayment.mutateAsync({ id: selectedTransaction.id });
      setSelectedTransaction(null);
      toast.success("Payment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete payment");
    }
  };

  const transactionRows = useMemo(
    () => paymentsQuery.data?.transactions || [],
    [paymentsQuery.data?.transactions]
  );
  const totalRows = paymentsQuery.data?.transactions_total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(1, pagination.pageSize)));

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
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.description}</span>,
      },
      {
        accessorKey: "type",
        enableHiding: true,
        enableSorting: false,
        header: "Type",
        cell: ({ row }) => (
          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {paymentTypeLabel(row.original.type)}
          </span>
        ),
      },
      {
        accessorKey: "payment_date",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Date"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => dateLabel(row.original.payment_date),
      },
      {
        accessorKey: "amount",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Amount"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => formatCurrencyAmount(row.original.amount, row.original.currency),
      },
      {
        accessorKey: "status",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusBadgeClass(row.original.status))}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "updated_at",
        enableHiding: true,
        header: ({ column }) => (
          <SortHeader
            label="Updated"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          />
        ),
        cell: ({ row }) => compactRelative(row.original.updated_at),
      },
      {
        accessorKey: "method",
        enableHiding: true,
        enableSorting: false,
        header: "Method",
        cell: ({ row }) => row.original.method.replaceAll("_", " "),
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
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
  });

  const canPrevious = pagination.pageIndex > 0 && !paymentsQuery.isFetching;
  const canNext = Boolean(paymentsQuery.data?.has_more) && !paymentsQuery.isFetching;

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
          <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
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
                  onChange={(event) => setRecordDescription(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                  placeholder="e.g. Monthly coaching - April"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    value={recordAmount}
                    onChange={(event) => setRecordAmount(event.target.value)}
                    className="rounded-xl border-border/60 bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={recordStatus} onValueChange={(value) => setRecordStatus(value as PaymentStatus)}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={recordType} onValueChange={(value) => setRecordType(value as RecordInvoiceType)}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={recordDate}
                  onChange={(event) => setRecordDate(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={recordNotes}
                  onChange={(event) => setRecordNotes(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                  placeholder="Any additional details..."
                />
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

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      </section>

      {paymentsQuery.isError ? (
        <div className="glass-surface surface-pad text-sm text-destructive">
          {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : "Unable to load payments"}
        </div>
      ) : null}

      <section className="glass-surface rounded-2xl border border-border/60 p-3 md:p-4">
        <Tabs value={mode} onValueChange={(value) => setMode(value as ViewMode)}>
          <TabsList className="rounded-xl bg-muted/30">
            <TabsTrigger value="transactions" className="rounded-lg">Transactions</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg">Client Billing</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "transactions" ? (
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
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  resetPage();
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all" ? "All Status" : option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
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

            <div className="hidden overflow-hidden rounded-2xl border border-border/60 md:block">
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
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", statusBadgeClass(row.original.status))}>
                        {row.original.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{row.original.description}</p>
                    <p className="mt-2 text-sm font-semibold">{formatCurrencyAmount(row.original.amount, row.original.currency)}</p>
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
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {paymentsQuery.isLoading && !paymentsQuery.data ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={`billing-skeleton-${index}`} className="h-24 w-full rounded-2xl" />)
            ) : (paymentsQuery.data?.client_billing.length || 0) === 0 ? (
              <p className="rounded-xl border border-border/60 bg-background/40 px-3 py-4 text-sm text-muted-foreground">No client billing profiles yet.</p>
            ) : (
              (paymentsQuery.data?.client_billing || []).map((row) => (
                <article key={row.client_id} className="rounded-2xl border border-border/60 bg-background/35 p-3 md:p-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(120px,1fr))_auto] md:items-center">
                    <div>
                      <p className="text-sm font-semibold">{row.client_name}</p>
                      <p className="text-xs text-muted-foreground">Monthly coaching</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Monthly</p>
                      <p className="text-sm font-semibold">{formatCurrencyAmount(row.monthly_amount, "USD")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Paid</p>
                      <p className="text-sm font-semibold">{formatCurrencyAmount(row.total_paid, "USD")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                      <p className={cn("text-sm font-semibold", row.outstanding > 0 ? "text-chart-4" : "text-foreground")}>
                        {formatCurrencyAmount(row.outstanding, "USD")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next Billing</p>
                      <p className="text-sm font-semibold">{dateLabel(row.next_billing_date)}</p>
                    </div>
                    <div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", clientStatusClass(row.client_status))}>
                        {row.client_status}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>

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
                    onChange={(event) => setDetailDescription(event.target.value)}
                    className="rounded-lg border-border/60 bg-background/40"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Additional Notes</Label>
                  <Input
                    value={detailNotes}
                    onChange={(event) => setDetailNotes(event.target.value)}
                    className="rounded-lg border-border/60 bg-background/40"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={detailAmount}
                    onChange={(event) => setDetailAmount(event.target.value)}
                    className="rounded-lg border-border/60 bg-background/40"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={detailDate}
                    onChange={(event) => setDetailDate(event.target.value)}
                    className="rounded-lg border-border/60 bg-background/40"
                  />
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
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={detailType} onValueChange={(value) => setDetailType(value as RecordInvoiceType)}>
                    <SelectTrigger className="h-10 w-full rounded-lg border-border/60 bg-background/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-Time</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                      <SelectItem value="package">Package</SelectItem>
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
