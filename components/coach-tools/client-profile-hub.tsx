"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
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
import {
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock3,
  CreditCard,
  Dumbbell,
  Eye,
  ExternalLink,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Settings2,
  Shield,
  Target,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import type { CoachNoteTag, PaymentMethod, PaymentStatus, SessionLocationType, SessionSlot } from "@/app/actions/coach-tools";
import { ClientGoalsMedicalTab } from "@/components/coach-tools/client-goals-medical-tab";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientAssignments,
  useClientCheckins,
  useClientDetail,
  useClientNotes,
  useClientPayments,
  useClientTodaySessions,
  useCoachToolMutations,
} from "@/hooks/use-coach-tools";
import { useDebounce } from "@/hooks/use-debounce";
import { useCoachClientPortalMutations, useCoachClientPortalSettings } from "@/hooks/use-client-portal";
import { CLIENT_MODULE_KEYS, type ClientModuleKey } from "@/lib/client-portal/constants";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { Database } from "@/types/database";
import {
  CLIENT_MODULE_LABELS,
  CLIENT_NOTE_TAGS,
  CLIENT_PAYMENT_STATUSES,
  CLIENT_PROFILE_PAYMENTS_TABLE_STORAGE_KEY,
  PAYMENT_DESCRIPTION_WORD_LIMIT,
  PAYMENT_NOTES_WORD_LIMIT,
  PAYMENT_TABLE_TEXT_WORD_LIMIT,
  TABLE_PAGE_SIZE_OPTIONS_STANDARD,
} from "@/utils/app-constants";
import { cn } from "@/utils";

type ProfileTab = "overview" | "goals_medical" | "training" | "notes" | "payments" | "access";

const PROFILE_TABS: Array<{ key: ProfileTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "goals_medical", label: "Goals & Medical", icon: Target },
  { key: "training", label: "Training", icon: Dumbbell },
  { key: "notes", label: "Notes", icon: Mail },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "access", label: "Access", icon: Shield },
];

type ClientPaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];
type ClientPaymentStatusFilter = "all" | PaymentStatus;
type PaymentTableSortId = "created_at" | "amount" | "status";
const PAYMENT_COLUMN_LABELS: Record<string, string> = {
  created_at: "Created",
  description: "Description",
  notes: "Notes",
  amount: "Amount",
  status: "Status",
  actions: "Actions",
};

function statusPill(status: string) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "blocked") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "completed" || status === "paid") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "pending") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function normalizeEditablePaymentStatus(status: string): PaymentStatus {
  return status === "paid" ? "paid" : "pending";
}

function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount)}`;
  }
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
}

function datetimeLabel(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function relativeTimeLabel(value: string | null) {
  if (!value) return "just now";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function paymentSortIndicator(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (sorted === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function PaymentSortHeader({
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
      {paymentSortIndicator(sorted)}
    </button>
  );
}

function paymentDescriptionLabel(value: string | null) {
  if (!value) return "Client payment";
  const [firstLine] = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return firstLine || "Client payment";
}

function paymentNotesLabel(value: string | null) {
  if (!value) return "";
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return "";
  return lines.slice(1).join(" ");
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

function assignmentMeta(name: string) {
  const isNutrition = /nutrition|meal|macro|diet|cut|bulk/i.test(name);
  return {
    label: isNutrition ? "Nutrition" : "Training",
    Icon: isNutrition ? UtensilsCrossed : Dumbbell,
    iconClass: isNutrition ? "text-chart-2" : "text-chart-3",
    chipClass: isNutrition ? "border-chart-2/40 bg-chart-2/10 text-chart-2" : "border-chart-3/40 bg-chart-3/10 text-chart-3",
  };
}

function splitList(input: string | null) {
  if (!input) return [] as string[];
  return input
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function accessLabel(value: "disabled" | "read_only" | "enabled") {
  if (value === "disabled") return "Off";
  if (value === "read_only") return "View";
  return "Full";
}

function normalizeNoteTag(tag: string): CoachNoteTag {
  if (tag === "injury" || tag === "nutrition" || tag === "psychology" || tag === "milestone") return tag;
  return "general";
}

function noteTagClass(tag: CoachNoteTag) {
  if (tag === "injury") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (tag === "nutrition") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (tag === "psychology") return "border-chart-5/40 bg-chart-5/10 text-chart-5";
  if (tag === "milestone") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-border/70 bg-muted/25 text-muted-foreground";
}

function noteTagButtonClass(tag: CoachNoteTag, selected: boolean) {
  const base = noteTagClass(tag);
  if (selected) {
    return cn(base, "ring-1 ring-offset-0");
  }
  if (tag === "general") {
    return "border-border/70 bg-transparent text-muted-foreground hover:bg-muted/20";
  }
  return cn(base, "opacity-80 hover:opacity-100");
}

export function ClientProfileHub({ clientId, initialTab = "overview" }: { clientId: string; initialTab?: ProfileTab }) {
  const router = useRouter();

  const detailQuery = useClientDetail(clientId);
  const assignmentsQuery = useClientAssignments(clientId);
  const todaySessionsQuery = useClientTodaySessions(clientId);
  const checkinsQuery = useClientCheckins(clientId);
  const notesQuery = useClientNotes(clientId);
  const paymentsQuery = useClientPayments(clientId);
  const settingsQuery = useCoachClientPortalSettings(clientId);

  const mutations = useCoachToolMutations();
  const portalMutations = useCoachClientPortalMutations(clientId);

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [logName, setLogName] = useState("");
  const [logSlot, setLogSlot] = useState<SessionSlot>("other");
  const [logLocationType, setLogLocationType] = useState<SessionLocationType>("gym");
  const [logLocationLabel, setLogLocationLabel] = useState("");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTag, setNoteTag] = useState<CoachNoteTag>("general");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "visible_to_client">("private");

  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<ClientPaymentRow | null>(null);
  const [selectedPaymentDescription, setSelectedPaymentDescription] = useState("");
  const [selectedPaymentNotes, setSelectedPaymentNotes] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>("paid");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState<ClientPaymentStatusFilter>("all");
  const [paymentsSorting, setPaymentsSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [paymentsPagination, setPaymentsPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [paymentsVisibility, setPaymentsVisibility] = useState<VisibilityState>({
    created_at: true,
    description: false,
    notes: false,
    amount: true,
    status: true,
  });
  const [paymentsHydrated, setPaymentsHydrated] = useState(false);

  const [portalUsername, setPortalUsername] = useState("");
  const [portalResetPassword, setPortalResetPassword] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (settingsQuery.data?.username) setPortalUsername(settingsQuery.data.username);
  }, [settingsQuery.data?.username]);

  useEffect(() => {
    if (!selectedPayment) return;
    const lines = (selectedPayment.notes || "").split("\n");
    setSelectedPaymentDescription(clampToWordLimit((lines[0] || "").trim(), PAYMENT_DESCRIPTION_WORD_LIMIT));
    setSelectedPaymentNotes(clampToWordLimit(lines.slice(1).join(" ").trim(), PAYMENT_NOTES_WORD_LIMIT));
    setSelectedPaymentStatus(normalizeEditablePaymentStatus(selectedPayment.status));
    setSelectedPaymentMethod(selectedPayment.method);
  }, [selectedPayment]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CLIENT_PROFILE_PAYMENTS_TABLE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          sorting?: SortingState;
          visibility?: VisibilityState;
          pagination?: PaginationState;
          status?: ClientPaymentStatusFilter;
        };
        if (Array.isArray(parsed.sorting)) setPaymentsSorting(parsed.sorting);
        if (parsed.visibility && typeof parsed.visibility === "object") {
          setPaymentsVisibility((current) => ({ ...current, ...parsed.visibility }));
        }
        if (parsed.pagination && typeof parsed.pagination.pageIndex === "number" && typeof parsed.pagination.pageSize === "number") {
          setPaymentsPagination(parsed.pagination);
        }
        if (
          parsed.status === "all" ||
          parsed.status === "paid" ||
          parsed.status === "pending"
        ) {
          setPaymentsStatusFilter(parsed.status);
        }
      }
    } catch {
      // noop
    }
    setPaymentsHydrated(true);
  }, []);

  useEffect(() => {
    if (!paymentsHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      CLIENT_PROFILE_PAYMENTS_TABLE_STORAGE_KEY,
      JSON.stringify({
        sorting: paymentsSorting,
        visibility: paymentsVisibility,
        pagination: paymentsPagination,
        status: paymentsStatusFilter,
      })
    );
  }, [paymentsHydrated, paymentsPagination, paymentsSorting, paymentsStatusFilter, paymentsVisibility]);

  const loading = detailQuery.isLoading && !detailQuery.data;
  const client = detailQuery.data?.client;

  const clientName = useMemo(() => {
    if (!client) return "Client";
    return client.display_name || `${client.first_name} ${client.last_name || ""}`.trim() || "Client";
  }, [client]);

  const medicalFlags = useMemo(() => splitList(client?.medical_flags || null), [client?.medical_flags]);

  const activeAssignments = useMemo(() => {
    return (assignmentsQuery.data || []).filter((row) => row.assignment.status === "active");
  }, [assignmentsQuery.data]);

  const nutritionAssignments = useMemo(
    () =>
      activeAssignments.filter((row) => {
        const meta = assignmentMeta(row.assignment.name || "");
        return meta.label === "Nutrition";
      }),
    [activeAssignments]
  );

  const clientPortalLink = "/client/login";

  const overviewActivity = useMemo(() => {
    const activityRows: Array<{ id: string; label: string; at: string }> = [];

    for (const row of todaySessionsQuery.data || []) {
      activityRows.push({
        id: `session-${row.id}`,
        label: `Completed ${row.name || row.session_label || "training session"}`,
        at: row.completed_at || row.started_at || row.created_at || new Date().toISOString(),
      });
    }

    for (const row of notesQuery.data || []) {
      activityRows.push({
        id: `note-${row.id}`,
        label: `Added ${row.tag} note`,
        at: row.created_at,
      });
    }

    for (const row of checkinsQuery.data || []) {
      activityRows.push({
        id: `checkin-${row.id}`,
        label: `${row.status === "pending" ? "Pending" : "Updated"} check-in`,
        at: row.submitted_at,
      });
    }

    return activityRows
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [checkinsQuery.data, notesQuery.data, todaySessionsQuery.data]);

  const moduleAccessByKey = useMemo(() => {
    const map = new Map<ClientModuleKey, "disabled" | "read_only" | "enabled">();
    for (const row of settingsQuery.data?.module_access || []) {
      map.set(row.module_key, row.access_level);
    }
    return map;
  }, [settingsQuery.data?.module_access]);
  const debouncedPaymentsSearch = useDebounce(paymentsSearch, 220);
  const filteredPaymentsRows = useMemo(() => {
    const normalized = debouncedPaymentsSearch.trim().toLowerCase();
    return (paymentsQuery.data?.rows || []).filter((row) => {
      if (paymentsStatusFilter !== "all" && row.status !== paymentsStatusFilter) return false;
      if (!normalized) return true;
      const haystack = `${paymentDescriptionLabel(row.notes)} ${row.notes || ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [debouncedPaymentsSearch, paymentsQuery.data?.rows, paymentsStatusFilter]);

  const paymentColumns = useMemo<ColumnDef<ClientPaymentRow>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <PaymentSortHeader
            label="Created"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => datetimeLabel(row.original.created_at),
      },
      {
        id: "description",
        accessorFn: (row) => paymentDescriptionLabel(row.notes),
        header: "Description",
        cell: ({ row }) => truncateWords(paymentDescriptionLabel(row.original.notes), PAYMENT_TABLE_TEXT_WORD_LIMIT),
      },
      {
        id: "notes",
        accessorFn: (row) => paymentNotesLabel(row.notes),
        header: "Notes",
        cell: ({ row }) => {
          const notes = paymentNotesLabel(row.original.notes);
          return notes ? truncateWords(notes, PAYMENT_TABLE_TEXT_WORD_LIMIT) : "—";
        },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <PaymentSortHeader
            label="Amount"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => formatCurrency(Number(row.original.amount || 0), row.original.currency),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <PaymentSortHeader
            label="Status"
            sorted={column.getIsSorted()}
            onClick={(event) => column.toggleSorting(column.getIsSorted() === "asc", event.shiftKey)}
          />
        ),
        cell: ({ row }) => (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusPill(row.original.status))}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {row.original.status}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-border/60 px-2 text-xs"
            onClick={() => setSelectedPayment(row.original)}
          >
            Details
          </Button>
        ),
      },
    ],
    []
  );

  const paymentsTable = useReactTable({
    data: filteredPaymentsRows,
    columns: paymentColumns,
    state: {
      sorting: paymentsSorting,
      pagination: paymentsPagination,
      columnVisibility: paymentsVisibility,
    },
    onSortingChange: (updater) => {
      setPaymentsSorting((current) => (typeof updater === "function" ? updater(current) : updater));
      setPaymentsPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: (updater) => {
      setPaymentsPagination((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    onColumnVisibilityChange: (updater) => {
      setPaymentsVisibility((current) => (typeof updater === "function" ? updater(current) : updater));
    },
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredPaymentsRows.length / Math.max(1, paymentsPagination.pageSize)));
    if (paymentsPagination.pageIndex < pages) return;
    setPaymentsPagination((current) => ({ ...current, pageIndex: Math.max(0, pages - 1) }));
  }, [filteredPaymentsRows.length, paymentsPagination.pageIndex, paymentsPagination.pageSize]);

  const onRemoveClient = async () => {
    const result = await withToastFeedback(mutations.removeClient.mutateAsync({ client_id: clientId }), {
      loading: "Removing client...",
      success: "Client removed",
      error: "Unable to remove client",
    }).catch(() => null);
    if (!result) return;
    setRemoveOpen(false);
    router.push("/clients");
  };

  const onLogSession = async () => {
    if (!logName.trim()) {
      toast.error("Session name is required.");
      return;
    }

    try {
      await mutations.logClientWorkout.mutateAsync({
        client_id: clientId,
        name: logName.trim(),
        performed_on: new Date().toISOString().slice(0, 10),
        session_slot: logSlot,
        location_type: logLocationType,
        location_label: logLocationLabel.trim() || null,
        started_at: new Date().toISOString(),
        completed_at: null,
        mark_plan_session_resolved: false,
      });
      setLogOpen(false);
      setLogName("");
      setLogLocationLabel("");
      toast.success("Session logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log session");
    }
  };

  const onSaveNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Note content is required.");
      return;
    }

    try {
      if (editingNoteId) {
        const updated = await withToastFeedback(
          mutations.updateNote.mutateAsync({
            note_id: editingNoteId,
            client_id: clientId,
            tag: noteTag,
            content: noteContent.trim(),
            visibility: noteVisibility,
          }),
          {
            loading: "Updating note...",
            success: "Note updated",
            error: "Unable to save note",
          }
        ).catch(() => null);
        if (!updated) return;
      } else {
        await mutations.createNote.mutateAsync({
          client_id: clientId,
          tag: noteTag,
          content: noteContent.trim(),
          visibility: noteVisibility,
        });
      }

      setNoteOpen(false);
      setEditingNoteId(null);
      setNoteContent("");
      setNoteTag("general");
      setNoteVisibility("private");
      if (!editingNoteId) toast.success("Note saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save note");
    }
  };

  const openNewNoteDialog = () => {
    setEditingNoteId(null);
    setNoteTag("general");
    setNoteVisibility("private");
    setNoteContent("");
    setNoteOpen(true);
  };

  const openEditNoteDialog = (note: NonNullable<typeof notesQuery.data>[number]) => {
    setEditingNoteId(note.id);
    setNoteTag(normalizeNoteTag(note.tag));
    setNoteVisibility(note.visibility === "visible_to_client" ? "visible_to_client" : "private");
    setNoteContent(note.content || "");
    setNoteOpen(true);
  };

  const onRecordPayment = async () => {
    const latestAmount = Number(paymentsQuery.data?.rows?.[0]?.amount || 0);
    const amount = Number.isFinite(latestAmount) && latestAmount > 0 ? latestAmount : 200;
    const normalizedDescription = clampToWordLimit(paymentDescription, PAYMENT_DESCRIPTION_WORD_LIMIT);
    const normalizedNotes = clampToWordLimit(paymentNotes, PAYMENT_NOTES_WORD_LIMIT);

    try {
      await mutations.recordPayment.mutateAsync({
        client_id: clientId,
        amount,
        payment_date: new Date().toISOString().slice(0, 10),
        method: "card",
        status: "paid",
        notes: [normalizedDescription, normalizedNotes].filter(Boolean).join("\n") || null,
      });
      setPaymentOpen(false);
      setPaymentDescription("");
      setPaymentNotes("");
      toast.success("Payment recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record payment");
    }
  };

  const onDeletePaymentFromDetails = async () => {
    if (!selectedPayment) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this payment permanently?");
    if (!confirmed) return;

    const result = await withToastFeedback(mutations.deletePayment.mutateAsync({ id: selectedPayment.id }), {
      loading: "Deleting payment...",
      success: "Payment deleted",
      error: "Unable to delete payment",
    }).catch(() => null);
    if (!result) return;
    setSelectedPayment(null);
  };

  const onSavePaymentDetails = async () => {
    if (!selectedPayment) return;

    const description = clampToWordLimit(selectedPaymentDescription, PAYMENT_DESCRIPTION_WORD_LIMIT);
    const normalizedDescription = description || "Client payment";
    const normalizedNotes = clampToWordLimit(selectedPaymentNotes, PAYMENT_NOTES_WORD_LIMIT);
    const mergedNotes = [normalizedDescription, normalizedNotes].filter(Boolean).join("\n") || null;

    const result = await withToastFeedback(
      mutations.updatePaymentDetails.mutateAsync({
        id: selectedPayment.id,
        status: selectedPaymentStatus,
        method: selectedPaymentMethod,
        notes: mergedNotes,
      }),
      {
        loading: "Updating payment...",
        success: "Payment updated",
        error: "Unable to update payment",
      }
    ).catch(() => null);
    if (!result) return;

    setSelectedPayment((current) =>
      current
        ? {
            ...current,
            status: selectedPaymentStatus,
            method: selectedPaymentMethod,
            notes: mergedNotes,
          }
        : current
    );
  };

  const onUpdateModuleAccess = async (moduleKey: ClientModuleKey, access: "disabled" | "read_only" | "enabled") => {
    await withToastFeedback(
      portalMutations.updateModuleAccess.mutateAsync({
        client_id: clientId,
        module_key: moduleKey,
        access_level: access,
      }),
      {
        loading: "Updating permissions...",
        success: `${CLIENT_MODULE_LABELS[moduleKey]} updated`,
        error: "Unable to update permission",
      }
    ).catch(() => null);
  };

  const onResetPassword = async () => {
    if (!portalResetPassword.trim()) {
      toast.error("New password is required.");
      return;
    }

    const result = await withToastFeedback(
      portalMutations.resetPassword.mutateAsync({
        client_id: clientId,
        new_password: portalResetPassword,
      }),
      {
        loading: "Resetting password...",
        success: "Password reset",
        error: "Unable to reset password",
      }
    ).catch(() => null);
    if (!result) return;
    setPortalResetPassword("");
  };

  const onUpdatePortalUsername = async () => {
    const nextUsername = portalUsername.trim();
    if (!nextUsername) return;
    await withToastFeedback(
      portalMutations.changeUsername.mutateAsync({ client_id: clientId, username: nextUsername }),
      {
        loading: "Updating username...",
        success: "Username updated",
        error: "Unable to update username",
      }
    ).catch(() => null);
  };

  const onBlockPortalAccess = async () => {
    await withToastFeedback(portalMutations.blockAccess.mutateAsync(clientId), {
      loading: "Blocking access...",
      success: "Access blocked",
      error: "Unable to block access",
    }).catch(() => null);
  };

  const onRemovePortalAccess = async () => {
    await withToastFeedback(portalMutations.removeAccess.mutateAsync(clientId), {
      loading: "Removing access...",
      success: "Access removed",
      error: "Unable to remove access",
    }).catch(() => null);
  };

  const onOpenClientPortal = () => {
    if (typeof window === "undefined") return;
    window.open(clientPortalLink, "_blank", "noopener,noreferrer");
  };

  const onCopyClientPortalLink = async () => {
    if (typeof window === "undefined") return;
    const fullUrl = new URL(clientPortalLink, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Client portal link copied");
    } catch {
      toast.error("Unable to copy portal link");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        <Skeleton className="h-28 w-full rounded-[10px]" />
        <Skeleton className="h-14 w-full rounded-[10px]" />
        <Skeleton className="h-96 w-full rounded-[10px]" />
      </div>
    );
  }

  if (detailQuery.isError || !client) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load client profile"}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="space-y-3">
        <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Clients
        </Link>

        <div className="glass-surface rounded-[10px] border border-border/60 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-chart-1/90 text-base font-semibold text-black">
                {clientName
                  .split(" ")
                  .map((part) => part[0] || "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">{clientName}</h1>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusPill(client.status))}>
                    {client.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {client.email || "No email"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl border-chart-3/40 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">
                <Link href={`/clients/${clientId}/training`}>Workout Hub</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-chart-2/40 bg-chart-2/10 text-chart-2 hover:bg-chart-2/20">
                <Link href={`/clients/${clientId}/nutrition`}>Nutrition Hub</Link>
              </Button>

              <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Remove Client</DialogTitle>
                    <DialogDescription>
                      This will permanently remove this client and all associated data including plans, notes, and payment records.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setRemoveOpen(false)}>
                      Keep Client
                    </Button>
                    <Button className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void onRemoveClient()} disabled={mutations.removeClient.isPending}>
                      {mutations.removeClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Remove Client
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-surface rounded-[10px] border border-border/60 p-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors",
                  selected ? "bg-chart-1 text-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "overview" ? (
        <div className="space-y-3">
          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-2 text-base font-semibold">Client Details</h2>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background/30">
              <Table>
                <TableBody>
                  <TableRow className="border-border/40">
                    <TableCell className="w-[180px] text-xs uppercase tracking-[0.12em] text-muted-foreground">Name</TableCell>
                    <TableCell className="text-sm font-medium">{`${client.first_name} ${client.last_name || ""}`.trim() || client.first_name}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/40">
                    <TableCell className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Email</TableCell>
                    <TableCell className="text-sm">{client.email || "No email"}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/40">
                    <TableCell className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Phone</TableCell>
                    <TableCell className="text-sm">{client.phone || "No phone"}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/40">
                    <TableCell className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Date of Birth</TableCell>
                    <TableCell className="text-sm">{client.date_of_birth ? dateLabel(client.date_of_birth) : "No date of birth"}</TableCell>
                  </TableRow>
                  <TableRow className="border-border/40">
                    <TableCell className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Status</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusPill(client.status))}>
                        {client.status}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-border/40">
                    <TableCell className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Assigned Nutrition Plan</TableCell>
                    <TableCell className="text-sm">
                      {nutritionAssignments.length === 0
                        ? "No active nutrition plan assigned."
                        : nutritionAssignments.map((row) => row.assignment.name).join(", ")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-2 text-base font-semibold">Assigned Nutrition Plan</h2>
            <div className="space-y-2">
              {nutritionAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active nutrition plan assigned.</p>
              ) : (
                nutritionAssignments.map((row) => (
                  <article key={row.assignment.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.assignment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dateLabel(row.assignment.started_on)}
                          {row.assignment.ended_on ? ` — ${dateLabel(row.assignment.ended_on)}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-chart-2/40 bg-chart-2/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-chart-2">
                        ACTIVE
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-2 text-base font-semibold">Active Assignments</h2>
            <div className="space-y-2">
              {activeAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active assignments.</p>
              ) : (
                activeAssignments.map((row) => {
                  const meta = assignmentMeta(row.assignment.name || "");
                  const AssignmentIcon = meta.Icon;
                  return (
                    <article key={row.assignment.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={cn("grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-background/40", meta.chipClass)}>
                            <AssignmentIcon className={cn("h-4 w-4", meta.iconClass)} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.assignment.name}</p>
                            <p className="text-xs text-muted-foreground">{meta.label}</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-chart-2/40 bg-chart-2/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-chart-2">ACTIVE</span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-2 text-base font-semibold">Recent Activity</h2>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background/30">
              {overviewActivity.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                overviewActivity.map((row) => (
                  <article key={row.id} className="flex items-start gap-3 p-3">
                    <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-background/40">
                      <Clock3 className="h-4 w-4 text-chart-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{relativeTimeLabel(row.at)}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "goals_medical" ? (
        <ClientGoalsMedicalTab clientId={clientId} medicalFlags={medicalFlags} />
      ) : null}

      {activeTab === "training" ? (
        <div className="space-y-3">
          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Today&apos;s Sessions</h2>
              <Dialog open={logOpen} onOpenChange={setLogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-none px-0 py-0 text-sm font-medium text-chart-1 hover:bg-transparent hover:text-chart-1/90"
                  >
                    Log Session
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Log Session</DialogTitle>
                    <DialogDescription>Add a workout session for today.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Session Name</Label>
                      <Input value={logName} onChange={(event) => setLogName(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Slot</Label>
                        <Select value={logSlot} onValueChange={(value) => setLogSlot(value as SessionSlot)}>
                          <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="afternoon">Afternoon</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Select value={logLocationType} onValueChange={(value) => setLogLocationType(value as SessionLocationType)}>
                          <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gym">Gym</SelectItem>
                            <SelectItem value="home">Home</SelectItem>
                            <SelectItem value="outdoor">Outdoor</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Location Label</Label>
                      <Input value={logLocationLabel} onChange={(event) => setLogLocationLabel(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setLogOpen(false)}>Cancel</Button>
                    <Button className="accent-strong rounded-xl text-black" onClick={() => void onLogSession()} disabled={mutations.logClientWorkout.isPending}>
                      {mutations.logClientWorkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Session
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {(todaySessionsQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions logged today.</p>
              ) : (
                (todaySessionsQuery.data || []).map((row) => {
                  const status = row.completed_at || row.status === "completed" ? "completed" : "pending";
                  const statusClass =
                    status === "completed"
                      ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                      : "border-chart-4/40 bg-chart-4/10 text-chart-4";
                  const sessionTitle = row.name || row.session_label || "Session";
                  const sessionTime = row.started_at
                    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(row.started_at))
                    : "Any time";
                  return (
                    <article key={row.id} className="rounded-xl border border-border/60 bg-background/35 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-xl border border-border/60 bg-background/40">
                            <Dumbbell className="h-4 w-4 text-chart-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{sessionTitle}</p>
                            <p className="text-xs text-muted-foreground">{sessionTime}</p>
                          </div>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusClass)}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {status}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-3 text-base font-semibold">Plan History</h2>
            <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-background/30">
              {(assignmentsQuery.data || []).length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No plans assigned yet.</p>
              ) : (
                (assignmentsQuery.data || []).map((row) => {
                  const assignmentStatus = (row.assignment.status || "active").toLowerCase();
                  const assignmentStatusClass =
                    assignmentStatus === "active"
                      ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                      : assignmentStatus === "completed"
                        ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                        : "border-border/60 bg-muted/40 text-muted-foreground";
                  return (
                    <article key={row.assignment.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium">{row.assignment.name}</p>
                        <p className="text-sm text-muted-foreground">{dateLabel(row.assignment.started_on)}{row.assignment.ended_on ? ` — ${dateLabel(row.assignment.ended_on)}` : ""}</p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", assignmentStatusClass)}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {assignmentStatus}
                      </span>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "notes" ? (
        <div className="space-y-3">
          <section className="flex items-center justify-end">
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogTrigger asChild>
                <Button className="accent-strong rounded-xl text-black" onClick={openNewNoteDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingNoteId ? "Edit Coach Note" : "New Coach Note"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Tag</Label>
                    <div className="flex flex-wrap gap-2">
                      {CLIENT_NOTE_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNoteTag(tag)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                            noteTagButtonClass(tag, noteTag === tag)
                          )}
                        >
                          {tag.replaceAll("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Textarea value={noteContent} onChange={(event) => setNoteContent(event.target.value)} rows={5} className="rounded-xl border-border/60 bg-muted/20" placeholder="Write a note about this client..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteVisibility("private")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          noteVisibility === "private"
                            ? "border-chart-1/50 bg-chart-1/15 text-chart-1"
                            : "border-border/60 bg-background/40 text-muted-foreground"
                        )}
                      >
                        Private
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteVisibility("visible_to_client")}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          noteVisibility === "visible_to_client"
                            ? "border-chart-2/50 bg-chart-2/15 text-chart-2"
                            : "border-border/60 bg-background/40 text-muted-foreground"
                        )}
                      >
                        Visible to Client
                      </button>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setNoteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="accent-strong rounded-xl text-black"
                    onClick={() => void onSaveNote()}
                    disabled={mutations.createNote.isPending || mutations.updateNote.isPending}
                  >
                    {(mutations.createNote.isPending || mutations.updateNote.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingNoteId ? "Update Note" : "Save Note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <section className="space-y-2">
            {(notesQuery.data || []).length === 0 ? (
              <p className="glass-surface rounded-[10px] border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              (notesQuery.data || []).map((note) => (
                <article key={note.id} className="glass-surface rounded-[10px] border border-border/60 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{dateLabel(note.created_at.slice(0, 10))}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-medium lowercase",
                          noteTagClass(normalizeNoteTag(note.tag))
                        )}
                      >
                        {normalizeNoteTag(note.tag)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{note.visibility === "visible_to_client" ? "Visible" : "Private"}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openEditNoteDialog(note)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </article>
              ))
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <div className="space-y-4">
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm text-muted-foreground">Payment history</h2>
            </div>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-[10px] bg-chart-1 px-5 text-base font-medium text-white hover:bg-chart-1/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Record
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Record Payment</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <Input
                      value={paymentDescription}
                      onChange={(event) =>
                        setPaymentDescription(clampToWordLimit(event.target.value, PAYMENT_DESCRIPTION_WORD_LIMIT))
                      }
                      className="h-12 rounded-[10px] border-border/60 bg-muted/20"
                      placeholder="e.g. Monthly coaching - April"
                    />
                    <p className="text-xs text-muted-foreground">
                      {countWords(paymentDescription)}/{PAYMENT_DESCRIPTION_WORD_LIMIT} words
                    </p>
                  </div>

                  <div className="rounded-[10px] border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Amount, status, and date are auto-filled from the latest client payment pattern and current date.
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Notes (optional)</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(clampToWordLimit(event.target.value, PAYMENT_NOTES_WORD_LIMIT))}
                      rows={3}
                      className="rounded-[10px] border-border/60 bg-muted/20"
                      placeholder="Any additional details..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {countWords(paymentNotes)}/{PAYMENT_NOTES_WORD_LIMIT} words
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <div className="grid w-full grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-[10px] border-border/60 bg-muted/30" onClick={() => setPaymentOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="h-12 rounded-[10px] bg-chart-1 text-base font-medium text-white hover:bg-chart-1/90" onClick={() => void onRecordPayment()} disabled={mutations.recordPayment.isPending}>
                      {mutations.recordPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Payment
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          {(paymentsQuery.data?.alerts || []).length > 0 ? (
            <section className="glass-surface rounded-[10px] border border-destructive/35 bg-destructive/[0.07] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full border border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-medium text-foreground">Payment overdue</p>
                  <p className="text-sm text-muted-foreground">{paymentsQuery.data?.alerts[0]?.message}</p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="glass-surface rounded-[10px] border border-border/60 p-3 md:p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={paymentsSearch}
                  onChange={(event) => {
                    setPaymentsSearch(event.target.value);
                    setPaymentsPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                  className="rounded-xl border-border/60 bg-muted/20 pl-9"
                  placeholder="Search payments..."
                />
              </div>
              <Select
                value={paymentsStatusFilter}
                onValueChange={(value) => {
                  setPaymentsStatusFilter(value as ClientPaymentStatusFilter);
                  setPaymentsPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20 md:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {CLIENT_PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
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
                <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/70 bg-card/95">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {paymentsTable
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
                          aria-label={`Toggle ${PAYMENT_COLUMN_LABELS[column.id] || column.id}`}
                        />
                        <span>{PAYMENT_COLUMN_LABELS[column.id] || column.id}</span>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
              <Table>
                <TableHeader>
                  {paymentsTable.getHeaderGroups().map((headerGroup) => (
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
                  {paymentsTable.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={paymentsTable.getVisibleLeafColumns().length} className="py-10 text-center text-sm text-muted-foreground">
                        No payments match this filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentsTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="cursor-pointer border-border/40" onClick={() => setSelectedPayment(row.original)}>
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
              {paymentsTable.getRowModel().rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedPayment(row.original)}
                  className="w-full rounded-xl border border-border/60 bg-background/30 p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{paymentDescriptionLabel(row.original.notes)}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusPill(row.original.status))}>
                      {row.original.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{datetimeLabel(row.original.created_at)}</p>
                  <p className="mt-2 text-sm font-semibold">{formatCurrency(Number(row.original.amount || 0), row.original.currency)}</p>
                </button>
              ))}
            </div>

            <section className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing{" "}
                {filteredPaymentsRows.length === 0 ? 0 : paymentsPagination.pageIndex * paymentsPagination.pageSize + 1}
                {" "}to{" "}
                {Math.min(filteredPaymentsRows.length, (paymentsPagination.pageIndex + 1) * paymentsPagination.pageSize)}
                {" "}of {filteredPaymentsRows.length}
              </span>
              <div className="flex items-center gap-2">
                <Select
                  value={String(paymentsPagination.pageSize)}
                  onValueChange={(value) => {
                    const parsed = Number(value);
                    if (!Number.isFinite(parsed) || parsed <= 0) return;
                    setPaymentsPagination({ pageIndex: 0, pageSize: parsed });
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
                  onClick={() => paymentsTable.setPageIndex(Math.max(0, paymentsPagination.pageIndex - 1))}
                  disabled={paymentsPagination.pageIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-xl border-border/60"
                  onClick={() => paymentsTable.setPageIndex(paymentsPagination.pageIndex + 1)}
                  disabled={!paymentsTable.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </section>
          </section>

          <Dialog
            open={Boolean(selectedPayment)}
            onOpenChange={(open) => {
              if (!open) setSelectedPayment(null);
            }}
          >
            <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Payment Details</DialogTitle>
                <DialogDescription>{clientName}</DialogDescription>
              </DialogHeader>

              {selectedPayment ? (
                <div className="space-y-2 text-sm">
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <span className="text-muted-foreground">Updated: </span>
                    {datetimeLabel(selectedPayment.updated_at)}
                  </div>
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input
                        value={selectedPaymentDescription}
                        onChange={(event) =>
                          setSelectedPaymentDescription(
                            clampToWordLimit(event.target.value, PAYMENT_DESCRIPTION_WORD_LIMIT)
                          )
                        }
                        className="h-11 rounded-xl border-border/60 bg-background/40"
                        placeholder="e.g. Monthly coaching - April"
                      />
                      <p className="text-xs text-muted-foreground">
                        {countWords(selectedPaymentDescription)}/{PAYMENT_DESCRIPTION_WORD_LIMIT} words
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={selectedPaymentStatus} onValueChange={(value) => setSelectedPaymentStatus(value as PaymentStatus)}>
                        <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-background/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        {CLIENT_PAYMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Method</Label>
                      <Select value={selectedPaymentMethod} onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)}>
                        <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-background/40">
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
                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={selectedPaymentNotes}
                        onChange={(event) =>
                          setSelectedPaymentNotes(clampToWordLimit(event.target.value, PAYMENT_NOTES_WORD_LIMIT))
                        }
                        rows={3}
                        className="rounded-xl border-border/60 bg-background/40"
                        placeholder="Any additional details..."
                      />
                      <p className="text-xs text-muted-foreground">
                        {countWords(selectedPaymentNotes)}/{PAYMENT_NOTES_WORD_LIMIT} words
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-xl border-border/60"
                  onClick={() => setSelectedPayment(null)}
                  disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={() => void onSavePaymentDetails()}
                  disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending}
                >
                  {mutations.updatePaymentDetails.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  onClick={() => void onDeletePaymentFromDetails()}
                  disabled={mutations.updatePaymentDetails.isPending || mutations.deletePayment.isPending || !selectedPayment}
                >
                  {mutations.deletePayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {activeTab === "access" ? (
        <div className="space-y-3">
          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-3 text-base font-semibold">Portal Access</h2>

            <div className="rounded-xl border border-border/60 bg-background/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Portal Status</p>
                  <p className="text-xs text-muted-foreground">Client can log in to their portal</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60"
                    onClick={onOpenClientPortal}
                    title="Open client portal"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60"
                    onClick={() => void onCopyClientPortalLink()}
                    title="Copy client portal link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]", statusPill(settingsQuery.data?.status || "archived"))}>
                    {settingsQuery.data?.status || "not configured"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <Label>Username</Label>
              <Input value={portalUsername} onChange={(event) => setPortalUsername(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" placeholder="client_username" />
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void onUpdatePortalUsername()} disabled={portalMutations.changeUsername.isPending || !portalUsername.trim()}>
                  {portalMutations.changeUsername.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Username
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <Label>Reset Password</Label>
              <div className="flex gap-2">
                <Input type="password" value={portalResetPassword} onChange={(event) => setPortalResetPassword(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" placeholder="New password" />
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void onResetPassword()} disabled={portalMutations.resetPassword.isPending}>
                  {portalMutations.resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reset
                </Button>
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-3 text-base font-semibold">Security Controls</h2>

            <div className="space-y-2">
              <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Block Portal Access</p>
                    <p className="text-xs text-muted-foreground">Temporarily prevent client from logging in</p>
                  </div>
                  <Switch
                    checked={settingsQuery.data?.status === "blocked"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        void onBlockPortalAccess();
                        return;
                      }
                      toast.info("Use reset password or set credentials to re-enable access.");
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Remove Portal Access</p>
                    <p className="text-xs text-muted-foreground">Permanently revoke all portal credentials</p>
                  </div>
                  <Switch
                    checked={settingsQuery.data?.status === "removed"}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        toast.info("Set credentials again to restore access.");
                        return;
                      }
                      void onRemovePortalAccess();
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-[10px] border border-border/60 p-4">
            <h2 className="mb-3 text-base font-semibold">Module Permissions</h2>
            <div className="space-y-2">
              {CLIENT_MODULE_KEYS.map((moduleKey) => {
                const currentAccess = moduleAccessByKey.get(moduleKey) || "disabled";
                return (
                  <article key={moduleKey} className="rounded-xl border border-border/60 bg-background/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium">{CLIENT_MODULE_LABELS[moduleKey]}</p>
                      <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-1">
                        {(["disabled", "read_only", "enabled"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs transition-colors",
                              currentAccess === option
                                ? option === "disabled"
                                  ? "bg-muted text-foreground"
                                  : option === "read_only"
                                    ? "bg-chart-3/20 text-chart-3"
                                    : "bg-chart-2/20 text-chart-2"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => void onUpdateModuleAccess(moduleKey, option)}
                          >
                            {accessLabel(option)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {(todaySessionsQuery.isFetching || notesQuery.isFetching || paymentsQuery.isFetching) ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          Syncing latest updates...
        </div>
      ) : null}
    </div>
  );
}
