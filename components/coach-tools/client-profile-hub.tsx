"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
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
  Shield,
  Target,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import type { CoachNoteTag, PaymentMethod, PaymentStatus, SessionLocationType, SessionSlot } from "@/app/actions/coach-tools";
import { ClientGoalsMedicalTab } from "@/components/coach-tools/client-goals-medical-tab";
import { Button } from "@/components/ui/button";
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
import { useCoachClientPortalMutations, useCoachClientPortalSettings } from "@/hooks/use-client-portal";
import { CLIENT_MODULE_KEYS, type ClientModuleKey } from "@/lib/client-portal/constants";
import { Database } from "@/types/database";
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

const NOTE_TAGS: CoachNoteTag[] = ["general", "injury", "nutrition", "psychology", "milestone"];
const PAYMENT_STATUSES: PaymentStatus[] = ["paid", "pending", "failed", "refunded"];
type ClientPaymentRow = Database["public"]["Tables"]["client_payments"]["Row"];
type RecordInvoiceType = "one_time" | "subscription" | "package";

const MODULE_LABELS: Record<ClientModuleKey, string> = {
  workouts: "Workouts",
  training_plan: "Training Plan",
  meal_plan: "Meal Plan",
  meal_logging: "Meal Logging",
  steps_tracking: "Steps Tracking",
  goals: "Goals",
  check_ins: "Check-ins",
  coach_notes: "Coach Notes",
  tasks: "Tasks",
};

function statusPill(status: string) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "blocked" || status === "failed") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "completed" || status === "paid") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "pending") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "refunded") return "border-chart-5/40 bg-chart-5/10 text-chart-5";
  return "border-border/60 bg-muted/40 text-muted-foreground";
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

function paymentDescriptionLabel(value: string | null) {
  if (!value) return "Client payment";
  const [firstLine] = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return firstLine || "Client payment";
}

function derivePaymentType(row: ClientPaymentRow): RecordInvoiceType {
  if (row.period_start || row.period_end) return "subscription";
  if ((row.notes || "").toLowerCase().includes("package")) return "package";
  return "one_time";
}

function computeSubscriptionEndDate(startDateIso: string) {
  const start = new Date(`${startDateIso}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
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
  const [paymentAmount, setPaymentAmount] = useState("200");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [selectedPayment, setSelectedPayment] = useState<ClientPaymentRow | null>(null);
  const [selectedPaymentDescription, setSelectedPaymentDescription] = useState("");
  const [selectedPaymentNotes, setSelectedPaymentNotes] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState<RecordInvoiceType>("one_time");
  const [selectedPaymentAmount, setSelectedPaymentAmount] = useState("0");
  const [selectedPaymentDate, setSelectedPaymentDate] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>("paid");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("card");

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
    setSelectedPaymentDescription((lines[0] || "").trim());
    setSelectedPaymentNotes(lines.slice(1).join("\n").trim());
    setSelectedPaymentType(derivePaymentType(selectedPayment));
    setSelectedPaymentAmount(String(selectedPayment.amount || 0));
    setSelectedPaymentDate(selectedPayment.payment_date);
    setSelectedPaymentStatus(selectedPayment.status);
    setSelectedPaymentMethod(selectedPayment.method);
  }, [selectedPayment]);

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

  const onRemoveClient = async () => {
    try {
      await mutations.removeClient.mutateAsync({ client_id: clientId });
      setRemoveOpen(false);
      toast.success("Client removed");
      router.push("/clients");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove client");
    }
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
        await mutations.updateNote.mutateAsync({
          note_id: editingNoteId,
          client_id: clientId,
          tag: noteTag,
          content: noteContent.trim(),
          visibility: noteVisibility,
        });
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
      toast.success(editingNoteId ? "Note updated" : "Note saved");
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
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    try {
      await mutations.recordPayment.mutateAsync({
        client_id: clientId,
        amount,
        payment_date: paymentDate,
        method: "card",
        status: paymentStatus,
        notes: [paymentDescription.trim(), paymentNotes.trim()].filter(Boolean).join("\n") || null,
      });
      setPaymentOpen(false);
      setPaymentDescription("");
      setPaymentNotes("");
      setPaymentAmount("200");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentStatus("paid");
      toast.success("Payment recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record payment");
    }
  };

  const onDeletePaymentFromDetails = async () => {
    if (!selectedPayment) return;
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this payment permanently?");
    if (!confirmed) return;

    try {
      await mutations.deletePayment.mutateAsync({ id: selectedPayment.id });
      toast.success("Payment deleted");
      setSelectedPayment(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete payment");
    }
  };

  const onSavePaymentDetails = async () => {
    if (!selectedPayment) return;

    const amount = Number(selectedPaymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!selectedPaymentDate) {
      toast.error("Date is required.");
      return;
    }

    const description = selectedPaymentDescription.trim();
    const normalizedDescription =
      selectedPaymentType === "package"
        ? description
          ? /package/i.test(description)
            ? description
            : `Package - ${description}`
          : "Package"
        : selectedPaymentType === "subscription"
          ? description || "Subscription"
          : description || "Client payment";
    const mergedNotes = [normalizedDescription, selectedPaymentNotes.trim()].filter(Boolean).join("\n") || null;
    const periodStart = selectedPaymentType === "subscription" ? selectedPaymentDate : null;
    const periodEnd = selectedPaymentType === "subscription" ? computeSubscriptionEndDate(selectedPaymentDate) : null;

    try {
      await mutations.updatePaymentDetails.mutateAsync({
        id: selectedPayment.id,
        amount,
        payment_date: selectedPaymentDate,
        status: selectedPaymentStatus,
        method: selectedPaymentMethod,
        period_start: periodStart,
        period_end: periodEnd,
        notes: mergedNotes,
      });
      setSelectedPayment((current) =>
        current
          ? {
              ...current,
              amount,
              payment_date: selectedPaymentDate,
              status: selectedPaymentStatus,
              method: selectedPaymentMethod,
              period_start: periodStart,
              period_end: periodEnd,
              notes: mergedNotes,
            }
          : current
      );
      toast.success("Payment updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update payment");
    }
  };

  const onUpdateModuleAccess = async (moduleKey: ClientModuleKey, access: "disabled" | "read_only" | "enabled") => {
    try {
      await portalMutations.updateModuleAccess.mutateAsync({
        client_id: clientId,
        module_key: moduleKey,
        access_level: access,
      });
      toast.success(`${MODULE_LABELS[moduleKey]} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update permission");
    }
  };

  const onResetPassword = async () => {
    if (!portalResetPassword.trim()) {
      toast.error("New password is required.");
      return;
    }

    try {
      await portalMutations.resetPassword.mutateAsync({
        client_id: clientId,
        new_password: portalResetPassword,
      });
      setPortalResetPassword("");
      toast.success("Password reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    }
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
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
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

        <div className="glass-surface rounded-2xl border border-border/60 p-4 md:p-5">
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
                <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-md">
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

      <section className="glass-surface rounded-2xl border border-border/60 p-2">
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
          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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
          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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
                <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
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
                  const status = row.completed_at || row.status === "completed" ? "completed" : row.status === "failed" ? "failed" : "pending";
                  const statusClass =
                    status === "completed"
                      ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
                      : status === "pending"
                        ? "border-chart-4/40 bg-chart-4/10 text-chart-4"
                        : "border-destructive/40 bg-destructive/10 text-destructive";
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

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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
              <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingNoteId ? "Edit Coach Note" : "New Coach Note"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Tag</Label>
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TAGS.map((tag) => (
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
              <p className="glass-surface rounded-2xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              (notesQuery.data || []).map((note) => (
                <article key={note.id} className="glass-surface rounded-2xl border border-border/60 p-4">
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
                <Button className="h-12 rounded-2xl bg-chart-1 px-5 text-base font-medium text-white hover:bg-chart-1/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Record
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Record Payment</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Description</Label>
                    <Input
                      value={paymentDescription}
                      onChange={(event) => setPaymentDescription(event.target.value)}
                      className="h-12 rounded-2xl border-border/60 bg-muted/20"
                      placeholder="e.g. Monthly coaching - April"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Amount ($)</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        className="h-12 rounded-2xl border-border/60 bg-muted/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Status</Label>
                      <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
                        <SelectTrigger className="h-12 rounded-2xl border-border/60 bg-muted/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      className="h-12 rounded-2xl border-border/60 bg-muted/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Notes (optional)</Label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      rows={3}
                      className="rounded-2xl border-border/60 bg-muted/20"
                      placeholder="Any additional details..."
                    />
                  </div>
                </div>

                <DialogFooter>
                  <div className="grid w-full grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-2xl border-border/60 bg-muted/30" onClick={() => setPaymentOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="h-12 rounded-2xl bg-chart-1 text-base font-medium text-white hover:bg-chart-1/90" onClick={() => void onRecordPayment()} disabled={mutations.recordPayment.isPending}>
                      {mutations.recordPayment.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save Payment
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          {(paymentsQuery.data?.alerts || []).length > 0 ? (
            <section className="glass-surface rounded-2xl border border-destructive/35 bg-destructive/[0.07] p-4">
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

          <section className="glass-surface overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">Description</TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsQuery.data?.rows || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No payments yet.</TableCell>
                  </TableRow>
                ) : (
                  (paymentsQuery.data?.rows || []).map((row) => (
                    <TableRow key={row.id} className="cursor-pointer border-border/40" onClick={() => setSelectedPayment(row)}>
                      <TableCell className="py-4 text-base text-muted-foreground">{dateLabel(row.payment_date)}</TableCell>
                      <TableCell className="py-4 text-base font-medium leading-tight text-foreground">
                        {paymentDescriptionLabel(row.notes)}
                      </TableCell>
                      <TableCell className="py-4 text-base font-semibold text-foreground">{formatCurrency(Number(row.amount || 0), row.currency)}</TableCell>
                      <TableCell className="py-4">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusPill(row.status))}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-border/60 px-2 text-xs"
                            onClick={() => setSelectedPayment(row)}
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <Dialog
            open={Boolean(selectedPayment)}
            onOpenChange={(open) => {
              if (!open) setSelectedPayment(null);
            }}
          >
            <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-lg">
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
                        onChange={(event) => setSelectedPaymentDescription(event.target.value)}
                        className="h-11 rounded-xl border-border/60 bg-background/40"
                        placeholder="e.g. Monthly coaching - April"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Amount ($)</Label>
                        <Input
                          type="number"
                          value={selectedPaymentAmount}
                          onChange={(event) => setSelectedPaymentAmount(event.target.value)}
                          className="h-11 rounded-xl border-border/60 bg-background/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <Select value={selectedPaymentStatus} onValueChange={(value) => setSelectedPaymentStatus(value as PaymentStatus)}>
                          <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-background/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={selectedPaymentDate}
                          onChange={(event) => setSelectedPaymentDate(event.target.value)}
                          className="h-11 rounded-xl border-border/60 bg-background/40"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select value={selectedPaymentType} onValueChange={(value) => setSelectedPaymentType(value as RecordInvoiceType)}>
                          <SelectTrigger className="h-11 w-full rounded-xl border-border/60 bg-background/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-Time</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="package">Package</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                        onChange={(event) => setSelectedPaymentNotes(event.target.value)}
                        rows={3}
                        className="rounded-xl border-border/60 bg-background/40"
                        placeholder="Any additional details..."
                      />
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
          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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
                <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void portalMutations.changeUsername.mutateAsync({ client_id: clientId, username: portalUsername.trim() }).then(() => toast.success("Username updated")).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to update username"))} disabled={portalMutations.changeUsername.isPending || !portalUsername.trim()}>
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

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
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
                        void portalMutations.blockAccess
                          .mutateAsync(clientId)
                          .then(() => toast.success("Access blocked"))
                          .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to block access"));
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
                      void portalMutations.removeAccess
                        .mutateAsync(clientId)
                        .then(() => toast.success("Access removed"))
                        .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to remove access"));
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-surface rounded-2xl border border-border/60 p-4">
            <h2 className="mb-3 text-base font-semibold">Module Permissions</h2>
            <div className="space-y-2">
              {CLIENT_MODULE_KEYS.map((moduleKey) => {
                const currentAccess = moduleAccessByKey.get(moduleKey) || "disabled";
                return (
                  <article key={moduleKey} className="rounded-xl border border-border/60 bg-background/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium">{MODULE_LABELS[moduleKey]}</p>
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
