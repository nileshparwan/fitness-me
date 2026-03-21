"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Activity,
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Loader2,
  Minus,
  Plus,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  Users2,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import type { ClientStatus } from "@/app/actions/coach-tools";
import { ClientsDashboardSkeleton } from "@/components/clients/clients-dashboard-skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientsDashboard, useClientsDashboardRealtime } from "@/hooks/use-clients-dashboard";
import { useCoachToolMutations } from "@/hooks/use-coach-tools";
import {
  formatCurrencyAmount,
  type ClientsDashboardActivityItem,
  type ClientsDashboardActivityType,
  type ClientsDashboardSessionStatus,
} from "@/lib/clients/dashboard";
import { cn } from "@/utils";

const STATUS_OPTIONS: ClientStatus[] = ["active", "paused", "blocked", "archived"];
const GOAL_BAR_COLORS = ["bg-chart-1", "bg-chart-3", "bg-chart-2", "bg-chart-5"];

function formatHeaderDate(todayIso: string) {
  const [year, month, day] = todayIso.split("-").map((part) => Number(part));
  if (!year || !month || !day) return todayIso;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}

function relativeTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

function activityIcon(type: ClientsDashboardActivityType) {
  if (type === "workout") return Activity;
  if (type === "meal") return UtensilsCrossed;
  if (type === "checkin") return ClipboardList;
  if (type === "note") return FileText;
  if (type === "payment") return CreditCard;
  if (type === "goal") return Target;
  if (type === "group") return UtensilsCrossed;
  if (type === "client") return Users2;
  if (type === "assignment") return TrendingUp;
  return BellRing;
}

function sessionDotClass(status: ClientsDashboardSessionStatus) {
  if (status === "completed") return "bg-chart-2";
  if (status === "pending" || status === "scheduled") return "bg-chart-4";
  return "bg-destructive";
}

function paymentBadgeClass(status: string) {
  const safeStatus = status.toLowerCase();
  if (safeStatus === "pending") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  return "border-chart-2/40 bg-chart-2/10 text-chart-2";
}

function goalStatusBadgeClass(status: string) {
  const safeStatus = status.toLowerCase();
  if (safeStatus === "at_risk") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (safeStatus === "completed" || safeStatus === "on_track") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (safeStatus === "paused") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (safeStatus === "archived") return "border-border/60 bg-muted/40 text-muted-foreground";
  return "border-chart-3/40 bg-chart-3/10 text-chart-3";
}

function goalTrendClass(trend: string) {
  if (trend === "uptrend") return "text-green-400";
  if (trend === "downtrend") return "text-red-400";
  return "text-yellow-400";
}

function goalAttentionReasonLabel(reason: string) {
  if (reason === "at_risk") return "At risk";
  if (reason === "near_deadline") return "Near deadline";
  return "Downtrend";
}

function goalAttentionReasonClass(reason: string) {
  if (reason === "at_risk") return "border-destructive/35 bg-destructive/10 text-destructive";
  if (reason === "near_deadline") return "border-chart-4/35 bg-chart-4/10 text-chart-4";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

function initials(input: string) {
  return input
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ActivityRow({ row }: { row: ClientsDashboardActivityItem }) {
  const Icon = activityIcon(row.type);

  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-border/50 bg-background/30 px-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="h-4 w-4 text-chart-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{row.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{relativeTimeLabel(row.created_at)}</p>
      </div>
    </div>
  );
}

type KpiCardProps = {
  title: string;
  value: string;
  badge: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
};

function KpiCard({ title, value, badge, Icon, iconClassName }: KpiCardProps) {
  return (
    <Card className="glass-surface rounded-[10px] border-border/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/40">
            <Icon className={cn("h-4 w-4 text-chart-3", iconClassName)} />
          </div>
          <Badge className="rounded-full border border-chart-2/35 bg-chart-2/12 px-2 py-0.5 text-[11px] font-medium text-chart-2">
            {badge}
          </Badge>
        </div>
        <div>
          <p className="text-3xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientsDashboard() {
  const query = useClientsDashboard();
  const mutations = useCoachToolMutations();
  useClientsDashboardRealtime(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");

  const headerDate = query.data?.today_iso
    ? formatHeaderDate(query.data.today_iso)
    : formatHeaderDate(new Date().toISOString().slice(0, 10));

  const onCreateClient = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }

    try {
      await mutations.upsertClient.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        status,
      });

      setFirstName("");
      setLastName("");
      setEmail("");
      setStatus("active");
      setIsCreateOpen(false);
      toast.success("Client created");
      await query.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    }
  };

  if (query.isLoading && !query.data) {
    return <ClientsDashboardSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="glass-surface surface-pad rounded-[10px] border-border/60">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the clients dashboard right now.
          </p>
          <Button className="accent-strong rounded-xl" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coaching command center · {headerDate}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="accent-strong rounded-xl px-4 text-black">
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[10px] border-border/70 bg-card/95 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Client</DialogTitle>
              <DialogDescription>Create a client profile.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="rounded-xl border-border/60 bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="rounded-xl border-border/60 bg-muted/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(next) => setStatus(next as ClientStatus)}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl border-border/60" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                className="accent-strong rounded-xl text-black"
                onClick={() => void onCreateClient()}
                disabled={mutations.upsertClient.isPending}
              >
                {mutations.upsertClient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Active Clients"
          value={String(data.kpis.active_clients)}
          badge={`+${data.kpis.active_clients_delta_week} this week`}
          Icon={Users2}
          iconClassName="text-chart-1"
        />
        <KpiCard
          title="Sessions Today"
          value={String(data.kpis.sessions_today)}
          badge={`${data.kpis.sessions_remaining} remaining`}
          Icon={Activity}
          iconClassName="text-chart-3"
        />
        <KpiCard
          title="Check-ins Due"
          value={String(data.kpis.checkins_due)}
          badge={data.kpis.urgent_checkins > 0 ? `${data.kpis.urgent_checkins} urgent` : "on track"}
          Icon={ClipboardList}
          iconClassName="text-chart-4"
        />
        <KpiCard
          title="Revenue (MTD)"
          value={formatCurrencyAmount(data.kpis.revenue_mtd)}
          badge={
            data.kpis.revenue_delta_pct === null
              ? "vs last month"
              : `${data.kpis.revenue_delta_pct >= 0 ? "+" : ""}${data.kpis.revenue_delta_pct}% vs last`
          }
          Icon={Wallet}
          iconClassName="text-chart-2"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-chart-4" />
                  <h2 className="text-base font-semibold md:text-lg">Needs Your Attention</h2>
                </div>
                <Badge variant="outline" className="rounded-full border-border/60 text-xs text-muted-foreground">
                  {data.needs_attention.length} items
                </Badge>
              </div>
              <div className="space-y-2">
                {data.needs_attention.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No urgent items right now.
                  </p>
                ) : (
                  data.needs_attention.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[10px] border border-border/50 bg-background/30 px-3 py-2.5"
                    >
                      <Avatar className="h-9 w-9 rounded-xl">
                        <AvatarFallback className="rounded-xl bg-chart-1/20 text-xs font-semibold text-chart-1">
                          {initials(item.client_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.context}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-chart-1" />
                  <h2 className="text-base font-semibold md:text-lg">Today&apos;s Sessions</h2>
                </div>
                <Badge variant="outline" className="rounded-full border-border/60 text-xs text-muted-foreground">
                  {data.today_sessions.length} scheduled
                </Badge>
              </div>
              <div className="space-y-2">
                {data.today_sessions.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No sessions scheduled for today.
                  </p>
                ) : (
                  data.today_sessions.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-[10px] border border-border/50 bg-background/30 px-3 py-2.5"
                    >
                      <div className={cn("h-2.5 w-2.5 rounded-full", sessionDotClass(row.status))} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.session_label} · {row.time_label}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-chart-3" />
                  <h2 className="text-base font-semibold md:text-lg">Live Activity Feed</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-chart-2">
                  <span className="h-2 w-2 rounded-full bg-chart-2" />
                  Live
                </div>
              </div>
              <div className="space-y-2">
                {data.live_activity.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No recent activity yet.
                  </p>
                ) : (
                  data.live_activity.map((row) => <ActivityRow key={row.id} row={row} />)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-chart-2" />
                  <h2 className="text-base font-semibold md:text-lg">Client Goals</h2>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                  <Badge className="rounded-full border border-destructive/35 bg-destructive/10 px-2 py-0.5 text-destructive">
                    {data.goal_intelligence.at_risk} at risk
                  </Badge>
                  <Badge className="rounded-full border border-chart-4/35 bg-chart-4/10 px-2 py-0.5 text-chart-4">
                    {data.goal_intelligence.near_deadline} near deadline
                  </Badge>
                  <Badge className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-muted-foreground">
                    {data.goal_intelligence.downtrend} downtrend
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                {data.client_goals.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No goals require attention right now.
                  </p>
                ) : (
                  data.client_goals.map((row, index) => (
                    <div key={row.id} className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium leading-tight">{row.client_name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{row.subtitle}</p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold">{row.progress_percent}%</p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide",
                            goalStatusBadgeClass(row.status)
                          )}
                        >
                          {row.status.replaceAll("_", " ")}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide",
                            goalAttentionReasonClass(row.attention_reason)
                          )}
                        >
                          {goalAttentionReasonLabel(row.attention_reason)}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium", goalTrendClass(row.trend))}>
                          {row.trend === "uptrend" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : row.trend === "downtrend" ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {row.trend === "uptrend" ? "Up" : row.trend === "downtrend" ? "Down" : "Stable"}
                        </span>
                        <span className="text-muted-foreground">{row.target_date ? `Due ${dateLabel(row.target_date)}` : "No deadline"}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/70">
                        <div
                          className={cn("h-full rounded-full transition-all", GOAL_BAR_COLORS[index % GOAL_BAR_COLORS.length])}
                          style={{ width: `${Math.max(0, Math.min(100, row.progress_percent))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-chart-5" />
                  <h2 className="text-base font-semibold md:text-lg">Recent Notes</h2>
                </div>
                <Link href="/clients" className="text-xs text-chart-1 hover:underline">
                  All Notes
                </Link>
              </div>
              <div className="space-y-2">
                {data.recent_notes.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No notes recorded yet.
                  </p>
                ) : (
                  data.recent_notes.map((row) => (
                    <div
                      key={row.id}
                      className="space-y-1 rounded-[10px] border border-border/50 bg-background/30 px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{row.client_name}</p>
                        <p className="text-xs text-muted-foreground">{relativeTimeLabel(row.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-full border border-chart-2/35 bg-chart-2/12 px-2 py-0.5 text-[10px] uppercase tracking-wide text-chart-2">
                          {row.tag}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{row.snippet}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-chart-4" />
                <h2 className="text-base font-semibold md:text-lg">Payment Alerts</h2>
              </div>
              <div className="space-y-2">
                {data.payment_alerts.length === 0 ? (
                  <p className="rounded-[10px] border border-border/50 bg-background/25 px-3 py-4 text-sm text-muted-foreground">
                    No payment alerts.
                  </p>
                ) : (
                  data.payment_alerts.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-border/50 bg-background/30 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatCurrencyAmount(row.amount, row.currency)} · {dateLabel(row.payment_date)}
                        </p>
                      </div>
                      <Badge className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", paymentBadgeClass(row.status))}>
                        {row.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-surface rounded-[10px] border-border/60">
            <CardContent className="space-y-3 p-4 md:p-5">
              <h2 className="text-base font-semibold md:text-lg">Quick Access</h2>
              <div className="grid grid-cols-2 gap-2.5">
                <Button asChild variant="outline" className="h-20 rounded-[10px] border-border/60 bg-background/30 hover:bg-accent/35">
                  <Link href="/clients" className="flex flex-col items-center justify-center gap-2 text-sm">
                    <Users2 className="h-4 w-4 text-chart-1" />
                    Clients
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 rounded-[10px] border-border/60 bg-background/30 hover:bg-accent/35">
                  <Link href="/nutrition/meal-planner" className="flex flex-col items-center justify-center gap-2 text-sm">
                    <UtensilsCrossed className="h-4 w-4 text-chart-2" />
                    Meal Plans
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 rounded-[10px] border-border/60 bg-background/30 hover:bg-accent/35">
                  <Link href="/nutrition/diary" className="flex flex-col items-center justify-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-chart-3" />
                    Meal Diary
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-20 rounded-[10px] border-border/60 bg-background/30 hover:bg-accent/35">
                  <Link href="/goals" className="flex flex-col items-center justify-center gap-2 text-sm">
                    <Settings className="h-4 w-4 text-chart-5" />
                    Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {query.isFetching ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing latest changes...
        </div>
      ) : null}
    </div>
  );
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
}
