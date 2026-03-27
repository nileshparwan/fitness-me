"use client";

import { useMemo, useState } from "react";
import { subMonths, subYears } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import {
  getCyclesAction,
  type CycleSubject,
  type MenstrualCycleRow,
} from "@/app/actions/menstrual-cycles";
import { CycleLogSheet } from "@/components/cycle/cycle-log-sheet";
import { CyclePhaseSummaryRow } from "@/components/cycle/cycle-phase-summary-row";
import { CyclesTable } from "@/components/cycle/cycles-table";
import { SubjectSelector } from "@/components/shared/subject-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CycleRange = "3m" | "6m" | "1y" | "all";

function subjectKey(subject: CycleSubject) {
  return subject.type === "me" ? "me" : `client:${subject.id}`;
}

function RangeSelect({
  value,
  onChange,
}: {
  value: CycleRange;
  onChange: (value: CycleRange) => void;
}) {
  return (
    <div className="grid min-w-[150px] gap-2">
      <Label className="text-xs text-muted-foreground">Range</Label>
      <Select value={value} onValueChange={(next) => onChange(next as CycleRange)}>
        <SelectTrigger className="h-9 rounded-[10px] border-border/60 bg-card/70">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3m">3 months</SelectItem>
          <SelectItem value="6m">6 months</SelectItem>
          <SelectItem value="1y">1 year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function filterCyclesByRange(rows: MenstrualCycleRow[], range: CycleRange) {
  if (range === "all") return rows;

  const now = new Date();
  const cutoff =
    range === "3m"
      ? subMonths(now, 3)
      : range === "6m"
        ? subMonths(now, 6)
        : subYears(now, 1);

  return rows.filter((row) => new Date(row.period_start_date) >= cutoff);
}

export default function CyclePage() {
  const [subject, setSubject] = useState<CycleSubject>({ type: "me" });
  const [range, setRange] = useState<CycleRange>("6m");
  const [logOpen, setLogOpen] = useState(false);
  const [editRow, setEditRow] = useState<MenstrualCycleRow | null>(null);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["cycles", subjectKey(subject)] as const,
    [subject]
  );

  const cyclesQuery = useQuery({
    queryKey,
    queryFn: () => getCyclesAction({ subject, limit: 250 }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const allCycles = useMemo(
    () => cyclesQuery.data?.cycles ?? [],
    [cyclesQuery.data?.cycles]
  );
  const filteredCycles = useMemo(
    () => filterCyclesByRange(allCycles, range),
    [allCycles, range]
  );
  const latestCycle = allCycles[0] ?? null;

  return (
    <div className="page-shell section-gap">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <section className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Cycle Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Log and track menstrual cycles. Use phase insights to guide training and nutrition.
          </p>
        </section>
        <Button
          type="button"
          size="sm"
          className="accent-strong rounded-[10px] text-black"
          onClick={() => {
            setEditRow(null);
            setLogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Log Period
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <SubjectSelector subject={subject} onSubjectChange={setSubject} />
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <CyclePhaseSummaryRow
        latestCycle={latestCycle}
        onLogRequested={() => {
          setEditRow(null);
          setLogOpen(true);
        }}
      />

      <CyclesTable
        data={filteredCycles}
        isLoading={cyclesQuery.isLoading}
        onEdit={(row) => {
          setEditRow(row);
          setLogOpen(true);
        }}
        onDeleted={() => {
          void queryClient.invalidateQueries({ queryKey });
        }}
      />

      <CycleLogSheet
        open={logOpen}
        subject={subject}
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
