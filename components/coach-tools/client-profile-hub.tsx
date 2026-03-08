"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import type { ClientCheckinStatus, CoachNoteTag, PaymentMethod, PaymentStatus, SessionLocationType, SessionSlot } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useClientAssignments,
  useClientCheckins,
  useClientDetail,
  useClientNextSession,
  useClientNotes,
  useClientPayments,
  useClientTodaySessions,
  useCoachPlanTemplates,
  useCoachToolMutations,
} from "@/hooks/use-coach-tools";
import {
  useCoachClientPortalMutations,
  useCoachClientPortalSettings,
  useCoachClientTasks,
} from "@/hooks/use-client-portal";
import { CLIENT_MODULE_KEYS, type ClientModuleKey } from "@/lib/client-portal/constants";

const NOTE_TAGS: CoachNoteTag[] = ["programming", "injury", "nutrition", "psychology", "form", "milestone"];
const PAYMENT_METHODS: PaymentMethod[] = ["bank_transfer", "cash", "card", "other"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];
const MODULE_LABELS: Record<ClientModuleKey, string> = {
  workouts: "Workouts",
  training_plan: "Training Plan",
  meal_plan: "Meal Plan",
  meal_logging: "Meal Logging",
  steps_tracking: "Steps Tracking",
  goals: "Goals",
  check_ins: "Check-ins",
  coach_notes: "Coach Notes",
  tasks: "Tasks / Todos",
};

export function ClientProfileHub({ clientId }: { clientId: string }) {
  const detailQuery = useClientDetail(clientId);
  const assignmentsQuery = useClientAssignments(clientId);
  const nextSessionQuery = useClientNextSession(clientId);
  const todaySessionsQuery = useClientTodaySessions(clientId);
  const checkinsQuery = useClientCheckins(clientId);
  const notesQuery = useClientNotes(clientId);
  const paymentsQuery = useClientPayments(clientId);
  const templatesQuery = useCoachPlanTemplates();
  const mutations = useCoachToolMutations();
  const portalSettingsQuery = useCoachClientPortalSettings(clientId);
  const portalTasksQuery = useCoachClientTasks(clientId);
  const portalMutations = useCoachClientPortalMutations(clientId);

  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [logName, setLogName] = useState("");
  const [logSlot, setLogSlot] = useState<SessionSlot>("other");
  const [logLocationType, setLogLocationType] = useState<SessionLocationType>("gym");
  const [logLocationLabel, setLogLocationLabel] = useState("");

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinUrgent, setCheckinUrgent] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTag, setNoteTag] = useState<CoachNoteTag>("programming");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "visible_to_client">("private");

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [portalUsername, setPortalUsername] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalResetPassword, setPortalResetPassword] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const loading = detailQuery.isLoading && !detailQuery.data;
  const client = detailQuery.data?.client;
  const assistants = detailQuery.data?.assistants || [];
  const fullName = useMemo(() => {
    if (!client) return "Client";
    return client.display_name || `${client.first_name} ${client.last_name || ""}`.trim();
  }, [client]);

  useEffect(() => {
    if (portalSettingsQuery.data?.username) {
      setPortalUsername(portalSettingsQuery.data.username);
    }
  }, [portalSettingsQuery.data?.username]);

  const assignTemplate = async () => {
    if (!assignTemplateId) {
      toast.error("Select a template first.");
      return;
    }
    try {
      await mutations.assignTemplate.mutateAsync({
        client_id: clientId,
        template_id: assignTemplateId,
      });
      setAssignTemplateId("");
      toast.success("Template assigned to client");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign template");
    }
  };

  const logSession = async () => {
    if (!logName.trim()) {
      toast.error("Session name is required.");
      return;
    }
    try {
      const nextSession = nextSessionQuery.data?.next_session;
      await mutations.logClientWorkout.mutateAsync({
        client_id: clientId,
        name: logName.trim(),
        performed_on: new Date().toISOString().slice(0, 10),
        session_slot: logSlot,
        location_type: logLocationType,
        location_label: logLocationLabel.trim() || null,
        started_at: new Date().toISOString(),
        completed_at: null,
        plan_assignment_id: nextSessionQuery.data?.assignment.id || null,
        plan_session_id: nextSession?.id || null,
        mark_plan_session_resolved: Boolean(nextSession),
      });
      setLogOpen(false);
      setLogName("");
      setLogLocationLabel("");
      toast.success("Session logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log session");
    }
  };

  const createCheckin = async () => {
    try {
      await mutations.createCheckin.mutateAsync({
        subject_client_id: clientId,
        urgent: checkinUrgent,
        notes: checkinNotes.trim() || null,
        checkin_data: {},
      });
      setCheckinOpen(false);
      setCheckinNotes("");
      setCheckinUrgent(false);
      toast.success("Check-in recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save check-in");
    }
  };

  const updateCheckinStatus = async (id: string, status: ClientCheckinStatus) => {
    try {
      await mutations.updateCheckin.mutateAsync({ id, status });
      toast.success("Check-in updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update check-in");
    }
  };

  const createNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Note content is required.");
      return;
    }
    try {
      await portalMutations.createNote.mutateAsync({
        client_id: clientId,
        tag: noteTag,
        title: noteTitle.trim() || null,
        content: noteContent.trim(),
        visibility: noteVisibility,
      });
      setNoteOpen(false);
      setNoteTag("programming");
      setNoteTitle("");
      setNoteContent("");
      setNoteVisibility("private");
      toast.success("Note saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save note");
    }
  };

  const recordPayment = async () => {
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    try {
      await mutations.recordPayment.mutateAsync({
        client_id: clientId,
        amount,
        payment_date: paymentDate,
        method: paymentMethod,
        status: paymentStatus,
        notes: paymentNotes.trim() || null,
      });
      setPaymentOpen(false);
      setPaymentAmount("0");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod("bank_transfer");
      setPaymentStatus("pending");
      setPaymentNotes("");
      toast.success("Payment recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    }
  };

  const ensurePortalCredentials = async () => {
    if (!portalUsername.trim() || !portalPassword.trim()) {
      toast.error("Username and password are required.");
      return;
    }
    try {
      await portalMutations.setCredentials.mutateAsync({
        client_id: clientId,
        username: portalUsername.trim(),
        password: portalPassword,
      });
      setPortalPassword("");
      toast.success("Client portal credentials saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save credentials");
    }
  };

  const changePortalUsername = async () => {
    if (!portalUsername.trim()) {
      toast.error("Username is required.");
      return;
    }
    try {
      await portalMutations.changeUsername.mutateAsync({
        client_id: clientId,
        username: portalUsername.trim(),
      });
      toast.success("Username updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update username");
    }
  };

  const resetPortalPassword = async () => {
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
      toast.success("Portal password reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    }
  };

  const updateModuleAccess = async (
    moduleKey: ClientModuleKey,
    accessLevel: "disabled" | "read_only" | "enabled"
  ) => {
    try {
      await portalMutations.updateModuleAccess.mutateAsync({
        client_id: clientId,
        module_key: moduleKey,
        access_level: accessLevel,
      });
      toast.success("Module access updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update module access");
    }
  };

  const createPortalTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Task title is required.");
      return;
    }
    try {
      await portalMutations.createTask.mutateAsync({
        client_id: clientId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        due_date: newTaskDueDate || null,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      toast.success("Task created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create task");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detailQuery.isError || !client) {
    return (
      <div className="native-surface surface-pad text-sm text-destructive">
        {detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load client"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="native-surface surface-pad sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {client.status} • {client.timezone} • {client.email || "No linked email"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/clients/${clientId}/nutrition`}>Nutrition Diary</Link>
            </Button>
            <Select value={assignTemplateId} onValueChange={setAssignTemplateId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Assign template..." />
              </SelectTrigger>
              <SelectContent>
                {(templatesQuery.data || []).map((row) => (
                  <SelectItem key={row.template.id} value={row.template.id}>
                    {row.template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => void assignTemplate()}
              disabled={!assignTemplateId || mutations.assignTemplate.isPending}
            >
              {mutations.assignTemplate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Plan
            </Button>
            <Dialog open={logOpen} onOpenChange={setLogOpen}>
              <DialogTrigger asChild>
                <Button>Log Session</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Training Session</DialogTitle>
                  <DialogDescription>Track start time, slot, and location for this client.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="session-name">Session Name</Label>
                    <Input id="session-name" value={logName} onChange={(event) => setLogName(event.target.value)} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Session Slot</Label>
                      <Select value={logSlot} onValueChange={(value) => setLogSlot(value as SessionSlot)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">morning</SelectItem>
                          <SelectItem value="afternoon">afternoon</SelectItem>
                          <SelectItem value="evening">evening</SelectItem>
                          <SelectItem value="other">other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Location Type</Label>
                      <Select
                        value={logLocationType}
                        onValueChange={(value) => setLogLocationType(value as SessionLocationType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gym">gym</SelectItem>
                          <SelectItem value="home">home</SelectItem>
                          <SelectItem value="outdoor">outdoor</SelectItem>
                          <SelectItem value="travel">travel</SelectItem>
                          <SelectItem value="other">other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location-label">Location Label</Label>
                    <Input
                      id="location-label"
                      value={logLocationLabel}
                      onChange={(event) => setLogLocationLabel(event.target.value)}
                      placeholder="Downtown Gym"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void logSession()} disabled={mutations.logClientWorkout.isPending}>
                    {mutations.logClientWorkout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="native-surface surface-pad grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Goals</p>
              <p className="text-sm">{client.goals || "No goals provided"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Medical Flags</p>
              <p className="text-sm">{client.medical_flags || "None logged"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Assignment</p>
              <p className="text-sm">{nextSessionQuery.data?.assignment.name || "No active assignment"}</p>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <section className="native-surface surface-pad space-y-2">
            <h3 className="text-base font-medium">Next Session</h3>
            {nextSessionQuery.data?.next_session ? (
              <div className="text-sm">
                #{nextSessionQuery.data.next_session.sequence_no} {nextSessionQuery.data.next_session.title} (
                {nextSessionQuery.data.next_session.session_type})
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pending plan session.</p>
            )}
          </section>

          <section className="native-surface surface-pad">
            <h3 className="mb-2 text-base font-medium">Today&apos;s Sessions</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(todaySessionsQuery.data || []).map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>{session.session_slot}</TableCell>
                    <TableCell>{session.started_at ? new Date(session.started_at).toLocaleTimeString() : "-"}</TableCell>
                    <TableCell>{session.location_label || session.location_type || "-"}</TableCell>
                  </TableRow>
                ))}
                {(todaySessionsQuery.data || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      No sessions logged today.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </section>

          <section className="native-surface surface-pad">
            <h3 className="mb-2 text-base font-medium">Plan History</h3>
            <div className="space-y-2">
              {(assignmentsQuery.data || []).map((row) => (
                <div key={row.assignment.id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">
                    {row.assignment.name} ({row.assignment.status})
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.sessions.length} sessions</div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="checkins" className="space-y-4">
          <section className="native-surface surface-pad flex items-center justify-between">
            <h3 className="text-base font-medium">Check-ins</h3>
            <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Check-in
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Check-in</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Label htmlFor="checkin-notes">Notes</Label>
                  <Textarea
                    id="checkin-notes"
                    value={checkinNotes}
                    onChange={(event) => setCheckinNotes(event.target.value)}
                    rows={4}
                  />
                  <Label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkinUrgent}
                      onChange={(event) => setCheckinUrgent(event.target.checked)}
                    />
                    Mark as urgent
                  </Label>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCheckinOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createCheckin()} disabled={mutations.createCheckin.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
          <section className="native-surface surface-pad">
            <div className="space-y-2">
              {(checkinsQuery.data || []).map((checkin) => (
                <div key={checkin.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium capitalize">{checkin.status}</div>
                    <Select
                      value={checkin.status}
                      onValueChange={(value) => void updateCheckinStatus(checkin.id, value as ClientCheckinStatus)}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="reviewed">reviewed</SelectItem>
                        <SelectItem value="actioned">actioned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{checkin.notes || "No notes"}</p>
                </div>
              ))}
              {(checkinsQuery.data || []).length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No check-ins yet.</div>
              ) : null}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <section className="native-surface surface-pad flex items-center justify-between">
            <h3 className="text-base font-medium">Coach Notes</h3>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Note</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label>Tag</Label>
                    <Select value={noteTag} onValueChange={(value) => setNoteTag(value as CoachNoteTag)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_TAGS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="note-title">Title</Label>
                    <Input id="note-title" value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="note-content">Content</Label>
                    <Textarea
                      id="note-content"
                      rows={5}
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Visibility</Label>
                    <Select
                      value={noteVisibility}
                      onValueChange={(value) =>
                        setNoteVisibility(value as "private" | "visible_to_client")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">private</SelectItem>
                        <SelectItem value="visible_to_client">visible_to_client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNoteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void createNote()}
                    disabled={portalMutations.createNote.isPending}
                  >
                    Save Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
          <section className="native-surface surface-pad space-y-2">
            {(notesQuery.data || []).map((note) => (
              <article key={note.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{note.tag}</div>
                  <Select
                    value={note.visibility || (note.is_shared_with_linked_user ? "visible_to_client" : "private")}
                    onValueChange={(value) =>
                      void portalMutations.updateNoteVisibility
                        .mutateAsync({
                          note_id: note.id,
                          client_id: clientId,
                          visibility: value as "private" | "visible_to_client",
                        })
                        .then(() => toast.success("Visibility updated"))
                        .catch((error) =>
                          toast.error(error instanceof Error ? error.message : "Unable to update visibility")
                        )
                    }
                  >
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">private</SelectItem>
                      <SelectItem value="visible_to_client">visible_to_client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <h4 className="text-sm font-medium">{note.title || "Untitled"}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{note.content}</p>
              </article>
            ))}
            {(notesQuery.data || []).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No notes yet.</div>
            ) : null}
          </section>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <section className="native-surface surface-pad flex items-center justify-between">
            <h3 className="text-base font-medium">Payments</h3>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="payment-amount">Amount</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Method</Label>
                      <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="payment-notes">Notes</Label>
                    <Textarea
                      id="payment-notes"
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void recordPayment()} disabled={mutations.recordPayment.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
          <section className="native-surface surface-pad space-y-3">
            {(paymentsQuery.data?.alerts || []).map((alert, index) => (
              <div key={`${alert.type}-${index}`} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                {alert.message}
              </div>
            ))}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Archive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paymentsQuery.data?.rows || []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>
                      {payment.currency} {Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="capitalize">{payment.status}</TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void mutations.archivePayment.mutateAsync({ id: payment.id, is_archived: !payment.is_archived })}
                      >
                        {payment.is_archived ? "Unarchive" : "Archive"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(paymentsQuery.data?.rows || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No payments logged.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </section>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <section className="native-surface surface-pad">
            <h3 className="mb-2 text-base font-medium">Assigned Coaches</h3>
            <div className="space-y-2 text-sm">
              <div className="rounded-md border p-3">
                <div className="font-medium">Primary Coach</div>
                <div className="text-muted-foreground">{client.primary_coach_id}</div>
              </div>
              {assistants.map((assistant) => (
                <div key={assistant.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium capitalize">{assistant.role}</div>
                    <div className="text-xs text-muted-foreground">{assistant.coach_id}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void mutations.disableAssistantCoach.mutateAsync({ assignment_id: assistant.id })}
                  >
                    Disable
                  </Button>
                </div>
              ))}
              {assistants.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">No assistant coaches assigned.</div>
              ) : null}
            </div>
          </section>

          <section className="native-surface surface-pad space-y-3">
            <h3 className="text-base font-medium">Client Portal Access</h3>
            <div className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium text-foreground">
                {portalSettingsQuery.data?.status || "not configured"}
              </span>
              {" • "}Enabled:{" "}
              <span className="font-medium text-foreground">
                {portalSettingsQuery.data?.is_portal_enabled ? "yes" : "no"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Portal Username</Label>
                <Input
                  value={portalUsername}
                  onChange={(event) => setPortalUsername(event.target.value)}
                  placeholder="client_username"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void changePortalUsername()}
                    disabled={portalMutations.changeUsername.isPending}
                  >
                    Change Username
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Set / Reset Password</Label>
                <Input
                  type="password"
                  value={portalPassword}
                  onChange={(event) => setPortalPassword(event.target.value)}
                  placeholder="Temporary password"
                />
                <Button
                  size="sm"
                  onClick={() => void ensurePortalCredentials()}
                  disabled={portalMutations.setCredentials.isPending}
                >
                  Set Credentials
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div className="grid gap-2">
                <Label>Reset Password</Label>
                <Input
                  type="password"
                  value={portalResetPassword}
                  onChange={(event) => setPortalResetPassword(event.target.value)}
                  placeholder="New password"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void resetPortalPassword()}
                disabled={portalMutations.resetPassword.isPending}
              >
                Reset Password
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void portalMutations.blockAccess
                      .mutateAsync(clientId)
                      .then(() => toast.success("Client access blocked"))
                      .catch((error) =>
                        toast.error(error instanceof Error ? error.message : "Unable to block access")
                      )
                  }
                  disabled={portalMutations.blockAccess.isPending}
                >
                  Block
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    void portalMutations.removeAccess
                      .mutateAsync(clientId)
                      .then(() => toast.success("Client access removed"))
                      .catch((error) =>
                        toast.error(error instanceof Error ? error.message : "Unable to remove access")
                      )
                  }
                  disabled={portalMutations.removeAccess.isPending}
                >
                  Remove
                </Button>
              </div>
            </div>
          </section>

          <section className="native-surface surface-pad space-y-2">
            <h3 className="text-base font-medium">Feature Access</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead className="w-[220px]">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CLIENT_MODULE_KEYS.map((moduleKey) => {
                  const currentAccess =
                    portalSettingsQuery.data?.module_access.find((item) => item.module_key === moduleKey)
                      ?.access_level || "disabled";
                  return (
                    <TableRow key={moduleKey}>
                      <TableCell>{MODULE_LABELS[moduleKey]}</TableCell>
                      <TableCell>
                        <Select
                          value={currentAccess}
                          onValueChange={(value) =>
                            void updateModuleAccess(
                              moduleKey,
                              value as "disabled" | "read_only" | "enabled"
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="disabled">disabled</SelectItem>
                            <SelectItem value="read_only">read_only</SelectItem>
                            <SelectItem value="enabled">enabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          <section className="native-surface surface-pad space-y-3">
            <h3 className="text-base font-medium">Client Tasks</h3>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label>Task Title</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="Submit weekly check-in"
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(event) => setNewTaskDueDate(event.target.value)}
                />
              </div>
              <Button onClick={() => void createPortalTask()} disabled={portalMutations.createTask.isPending}>
                Add Task
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={newTaskDescription}
                onChange={(event) => setNewTaskDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              {(portalTasksQuery.data || []).map((task) => (
                <div key={task.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.due_date ? `Due ${task.due_date}` : "No due date"}
                      </div>
                    </div>
                    <Select
                      value={task.status}
                      onValueChange={(value) =>
                        void portalMutations.updateTask
                          .mutateAsync({
                            id: task.id,
                            client_id: clientId,
                            status: value as "pending" | "completed" | "overdue",
                          })
                          .then(() => toast.success("Task updated"))
                          .catch((error) =>
                            toast.error(error instanceof Error ? error.message : "Unable to update task")
                          )
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="overdue">overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{task.description || "No description"}</p>
                </div>
              ))}
              {(portalTasksQuery.data || []).length === 0 ? (
                <div className="py-4 text-sm text-muted-foreground">No tasks created yet.</div>
              ) : null}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
