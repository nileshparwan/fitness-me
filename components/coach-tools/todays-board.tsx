"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { CoachPaymentsTodayBoardRow, ClientBillingPlanWithRemaining } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCoachToolMutations, useTodayLogs } from "@/hooks/use-coach-tools";
import { formatCurrencyAmount } from "@/lib/clients/dashboard";
import { cn } from "@/utils";

const PackageRenewalDialog = dynamic(() =>
  import("@/components/coach-tools/package-renewal-dialog").then((mod) => mod.PackageRenewalDialog)
);

type TodaysBoardProps = {
  rows: CoachPaymentsTodayBoardRow[];
  loading?: boolean;
  featureAvailable?: boolean;
  unavailableMessage?: string;
};

function billingTypeLabel(type: ClientBillingPlanWithRemaining["billing_type"]) {
  if (type === "session_package") return "Package";
  if (type === "per_session") return "Per Session";
  if (type === "monthly") return "Monthly";
  if (type === "program") return "Program";
  return "Hourly";
}

function billingTypeClass(type: ClientBillingPlanWithRemaining["billing_type"]) {
  if (type === "per_session") return "border-blue-400/40 bg-blue-400/10 text-blue-300";
  if (type === "session_package") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
  if (type === "monthly") return "border-violet-400/40 bg-violet-400/10 text-violet-300";
  if (type === "program") return "border-orange-400/40 bg-orange-400/10 text-orange-300";
  return "border-cyan-400/40 bg-cyan-400/10 text-cyan-300";
}

function planRateLabel(row: CoachPaymentsTodayBoardRow) {
  const plan = row.billing_plan;
  if (plan.billing_type === "monthly" && plan.monthly_amount) {
    return `${formatCurrencyAmount(Number(plan.monthly_amount), plan.currency || "USD")}/month`;
  }
  if (plan.billing_type === "hourly") {
    return `${formatCurrencyAmount(Number(plan.session_rate || 0), plan.currency || "USD")}/hour`;
  }
  return `${formatCurrencyAmount(Number(plan.session_rate || 0), plan.currency || "USD")}/session`;
}

function cycleLabel(billingCycleDay: number | null) {
  if (!billingCycleDay) return "Monthly attendance tracking";
  const now = new Date();
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), billingCycleDay));
  const reference = now.getUTCDate() >= billingCycleDay ? cycleStart : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, billingCycleDay));
  const dayOfCycle = Math.max(1, Math.floor((Date.now() - reference.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return `Day ${dayOfCycle} of cycle`;
}

export function TodaysBoard({
  rows,
  loading = false,
  featureAvailable = true,
  unavailableMessage,
}: TodaysBoardProps) {
  const mutations = useCoachToolMutations();
  const todayLogs = useTodayLogs();
  const [renewPlan, setRenewPlan] = useState<CoachPaymentsTodayBoardRow | null>(null);

  const mergedRows = useMemo(() => {
    const todayMap = todayLogs.data || {};
    return rows.map((row) => ({
      ...row,
      today_log: todayMap[row.client_id] || row.today_log,
    }));
  }, [rows, todayLogs.data]);

  const onLogSession = async (row: CoachPaymentsTodayBoardRow) => {
    try {
      await mutations.logSession.mutateAsync({ client_id: row.client_id });
      toast.success(row.billing_plan.billing_type === "per_session" || row.billing_plan.billing_type === "hourly" ? "Payment marked" : "Session logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to log session");
    }
  };

  if (!featureAvailable) {
    return (
      <div className="rounded-[10px] border border-border/60 bg-background/35 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {unavailableMessage ||
            "Daily session logging is unavailable until billing migrations are applied to this database."}
        </p>
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`today-board-skeleton-${index}`} className="h-48 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (mergedRows.length === 0) {
    return (
      <div className="rounded-[10px] border border-border/60 bg-background/35 p-6 text-center">
        <p className="text-sm text-muted-foreground">Set up billing plans for your clients to use the daily payment log.</p>
        <Button asChild variant="outline" className="mt-3 rounded-xl border-border/60">
          <Link href="/clients">Go to Client Roster</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-[10px] border border-border/60 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Billing Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergedRows.map((row) => {
              const plan = row.billing_plan;
              const hasTodayLog = Boolean(row.today_log);
              const isPackageType = plan.billing_type === "session_package" || plan.billing_type === "program";
              const packageEmpty = isPackageType && plan.sessions_remaining <= 0;
              const packageWarn = isPackageType && plan.sessions_remaining > 0 && plan.sessions_remaining <= 2;

              return (
                <TableRow key={row.client_id} className={cn(packageWarn ? "bg-chart-4/5" : undefined)}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{row.client_name}</p>
                      <p className="text-xs text-muted-foreground">{row.client_status}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", billingTypeClass(plan.billing_type))}>
                      {billingTypeLabel(plan.billing_type)}
                    </span>
                  </TableCell>
                  <TableCell>{planRateLabel(row)}</TableCell>
                  <TableCell>
                    {isPackageType ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {plan.sessions_used}/{plan.sessions_purchased} used · {plan.sessions_remaining} left
                        </p>
                        {packageWarn ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-chart-4/40 bg-chart-4/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-chart-4">
                            <TriangleAlert className="h-3 w-3" />
                            Low credits
                          </span>
                        ) : null}
                      </div>
                    ) : plan.billing_type === "monthly" ? (
                      <span className="text-xs text-muted-foreground">{cycleLabel(plan.billing_cycle_day)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasTodayLog ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-chart-2/40 bg-chart-2/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-chart-2">
                        <CheckCircle2 className="h-3 w-3" />
                        Logged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-border/60">
                        <Link href={`/clients/${row.client_id}/payments`}>View Logs</Link>
                      </Button>
                      {hasTodayLog ? (
                        <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/60" disabled>
                          Logged
                        </Button>
                      ) : packageEmpty ? (
                        <Button size="sm" className="h-8 rounded-lg" onClick={() => setRenewPlan(row)}>
                          Renew Package
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={cn(
                            "h-8 rounded-lg",
                            plan.billing_type === "per_session" || plan.billing_type === "hourly"
                              ? "bg-chart-2 text-black hover:bg-chart-2/90"
                              : "bg-chart-3 text-black hover:bg-chart-3/90"
                          )}
                          onClick={() => void onLogSession(row)}
                          disabled={mutations.logSession.isPending}
                        >
                          {mutations.logSession.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                          {plan.billing_type === "per_session" || plan.billing_type === "hourly" ? "Mark Paid" : "Log Session"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {mergedRows.map((row) => {
          const plan = row.billing_plan;
          const hasTodayLog = Boolean(row.today_log);
          const isPackageType = plan.billing_type === "session_package" || plan.billing_type === "program";
          const packageEmpty = isPackageType && plan.sessions_remaining <= 0;
          const packageWarn = isPackageType && plan.sessions_remaining > 0 && plan.sessions_remaining <= 2;

          return (
            <article key={row.client_id} className={cn("rounded-[10px] border border-border/60 bg-background/35 p-4", packageWarn ? "ring-1 ring-chart-4/40" : undefined)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{row.client_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{planRateLabel(row)}</p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide", billingTypeClass(plan.billing_type))}>
                  {billingTypeLabel(plan.billing_type)}
                </span>
              </div>

              {isPackageType ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.sessions_used}/{plan.sessions_purchased} sessions · {plan.sessions_remaining} left
                </p>
              ) : null}
              {plan.billing_type === "monthly" ? <p className="mt-2 text-xs text-muted-foreground">{cycleLabel(plan.billing_cycle_day)}</p> : null}

              <div className="mt-3 flex items-center gap-2">
                <Button asChild variant="outline" className="h-9 rounded-xl border-border/60">
                  <Link href={`/clients/${row.client_id}/payments`}>View Logs</Link>
                </Button>
                {hasTodayLog ? (
                  <Button className="h-9 rounded-xl" variant="outline" disabled>
                    <CheckCircle2 className="mr-1.5 h-4 w-4 text-chart-2" />
                    Logged
                  </Button>
                ) : packageEmpty ? (
                  <Button className="h-9 rounded-xl" onClick={() => setRenewPlan(row)}>
                    Renew Package
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "h-9 rounded-xl",
                      plan.billing_type === "per_session" || plan.billing_type === "hourly"
                        ? "bg-chart-2 text-black hover:bg-chart-2/90"
                        : "bg-chart-3 text-black hover:bg-chart-3/90"
                    )}
                    onClick={() => void onLogSession(row)}
                    disabled={mutations.logSession.isPending}
                  >
                    {mutations.logSession.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    {plan.billing_type === "per_session" || plan.billing_type === "hourly" ? "Mark Paid" : "Log Session"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {renewPlan ? (
        <PackageRenewalDialog
          open={Boolean(renewPlan)}
          onOpenChange={(next) => {
            if (!next) setRenewPlan(null);
          }}
          plan={renewPlan.billing_plan}
          clientName={renewPlan.client_name}
        />
      ) : null}
    </>
  );
}
