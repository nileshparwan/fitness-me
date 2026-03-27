"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  getCyclesAction,
  type CycleSubject,
  type MenstrualCycleRow,
} from "@/app/actions/menstrual-cycles";
import { CycleLogSheet } from "@/components/cycle/cycle-log-sheet";
import { CycleLengthChart } from "@/components/cycle/cycle-length-chart";
import { CyclePhaseSummaryRow } from "@/components/cycle/cycle-phase-summary-row";
import { SymptomTrendCard } from "@/components/cycle/symptom-trend-card";
import { cn } from "@/utils";
import { getDaysUntilNextPeriod, getNextPeriodDate } from "@/utils/cycle-phase";
import { CYCLE_PANEL_CLASS, CYCLE_SUB_PANEL_CLASS } from "./_constants";

const SELF_SUBJECT: CycleSubject = { type: "me" };

function formatMetric(value: number | null, suffix = " days") {
  if (value === null) return "—";
  return `${value}${suffix}`;
}

function summarizeRegularity(cycleLengths: number[]) {
  if (cycleLengths.length < 3) return "—";
  const average = cycleLengths.reduce((sum, value) => sum + value, 0) / cycleLengths.length;
  const variance =
    cycleLengths.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    cycleLengths.length;
  const standardDeviation = Math.sqrt(variance);

  if (standardDeviation < 3) return "Regular";
  if (standardDeviation <= 7) return "Somewhat regular";
  return "Irregular";
}

function CycleStatsCard({ cycles }: { cycles: MenstrualCycleRow[] }) {
  const cycleLengths = cycles
    .map((cycle) => cycle.cycle_length_days)
    .filter((value): value is number => value !== null);
  const hasRangeStats = cycleLengths.length >= 2;
  const average =
    cycleLengths.length >= 2
      ? Number(
          (
            cycleLengths.reduce((sum, value) => sum + value, 0) / cycleLengths.length
          ).toFixed(1)
        )
      : null;

  const stats = [
    { label: "Avg Cycle", value: average === null ? "—" : `${average} days` },
    {
      label: "Shortest",
      value: hasRangeStats ? formatMetric(Math.min(...cycleLengths)) : "—",
    },
    {
      label: "Longest",
      value: hasRangeStats ? formatMetric(Math.max(...cycleLengths)) : "—",
    },
    { label: "Regularity", value: summarizeRegularity(cycleLengths) },
  ];

  return (
    <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Cycle Snapshot</h3>
        <p className="text-sm text-muted-foreground">
          Recent cycle consistency based on your logged history.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(CYCLE_SUB_PANEL_CLASS, "space-y-1")}>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NextPeriodCard({
  latestCycle,
  averageLength,
}: {
  latestCycle: MenstrualCycleRow | null;
  averageLength: number | null;
}) {
  if (!latestCycle) {
    return (
      <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Next period expected</h3>
          <p className="text-sm text-muted-foreground">
            Estimated based on your average cycle length.
          </p>
        </div>
        <div
          className={cn(
            CYCLE_SUB_PANEL_CLASS,
            "flex min-h-[160px] items-center justify-center text-center text-sm text-muted-foreground"
          )}
        >
          Log a cycle to get a period prediction
        </div>
      </section>
    );
  }

  const cycleLength = averageLength ?? latestCycle.cycle_length_days ?? 28;
  const nextPeriodDate = getNextPeriodDate(latestCycle.period_start_date, cycleLength);
  const daysUntil = getDaysUntilNextPeriod(latestCycle.period_start_date, cycleLength);
  const overdueBy = Math.max(0, differenceInCalendarDays(new Date(), nextPeriodDate));
  const isToday = differenceInCalendarDays(nextPeriodDate, new Date()) === 0;

  let countdown = `in ${daysUntil} days`;
  if (overdueBy > 0) countdown = `Overdue by ${overdueBy} day${overdueBy === 1 ? "" : "s"}`;
  else if (isToday) countdown = "Today";

  return (
    <section className={cn(CYCLE_PANEL_CLASS, "space-y-4")}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Next period expected</h3>
        <p className="text-sm text-muted-foreground">
          Estimated based on your average cycle length.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className={cn(CYCLE_SUB_PANEL_CLASS, "space-y-2")}>
          <p className="text-sm text-muted-foreground">
            {format(nextPeriodDate, "EEEE, MMMM d")}
          </p>
          <p className="text-2xl font-semibold text-foreground">{countdown}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimated based on your average cycle length
        </p>
      </div>
    </section>
  );
}

export function CycleTabContent() {
  const [logOpen, setLogOpen] = useState(false);
  const [editRow, setEditRow] = useState<MenstrualCycleRow | null>(null);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["cycles", "me"] as const, []);

  const cyclesQuery = useSuspenseQuery({
    queryKey,
    queryFn: () => getCyclesAction({ subject: SELF_SUBJECT, limit: 250 }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const cycles = useMemo(() => cyclesQuery.data.cycles ?? [], [cyclesQuery.data.cycles]);
  const latestCycle = cycles[0] ?? null;
  const averageLength = useMemo(() => {
    const values = cycles
      .map((cycle) => cycle.cycle_length_days)
      .filter((value): value is number => value !== null);
    if (values.length < 2) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [cycles]);

  return (
    <div className="space-y-4">
      <CyclePhaseSummaryRow
        latestCycle={latestCycle}
        onLogRequested={() => {
          setEditRow(null);
          setLogOpen(true);
        }}
      />
      <CycleStatsCard cycles={cycles} />
      <CycleLengthChart cycles={cycles} />
      <SymptomTrendCard cycles={cycles} />
      <NextPeriodCard latestCycle={latestCycle} averageLength={averageLength} />
      <div className="flex justify-end">
        <Link
          href="/health/cycle"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View full cycle log →
        </Link>
      </div>
      <CycleLogSheet
        open={logOpen}
        subject={SELF_SUBJECT}
        prefillRow={editRow}
        onClose={() => {
          setLogOpen(false);
          setEditRow(null);
        }}
        onSaved={() => {
          setLogOpen(false);
          setEditRow(null);
          void queryClient.invalidateQueries({ queryKey });
        }}
      />
    </div>
  );
}
