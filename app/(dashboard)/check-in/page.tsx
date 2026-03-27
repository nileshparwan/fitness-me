"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getHealthCheckIns,
  type HealthCheckInRow,
  type HealthSubject,
} from "@/app/actions/daily-health-log";
import { HealthLogTable } from "@/components/check-in/health-log-table";
import { LogHealthSheet } from "@/components/check-in/log-health-sheet";
import { SubjectSelector } from "@/components/shared/subject-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HealthRange = "7d" | "30d" | "90d" | "all";

function subjectKey(subject: HealthSubject) {
  return subject.type === "me" ? "me" : `client:${subject.id}`;
}

function RangeSelect({
  value,
  onChange,
}: {
  value: HealthRange;
  onChange: (value: HealthRange) => void;
}) {
  return (
    <div className="grid min-w-[150px] gap-2">
      <Label className="text-xs text-muted-foreground">Range</Label>
      <Select value={value} onValueChange={(next) => onChange(next as HealthRange)}>
        <SelectTrigger className="h-9 rounded-[10px] border-border/60 bg-card/70">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">7 days</SelectItem>
          <SelectItem value="30d">30 days</SelectItem>
          <SelectItem value="90d">90 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function CheckInPage() {
  const [subject, setSubject] = useState<HealthSubject>({ type: "me" });
  const [range, setRange] = useState<HealthRange>("30d");
  const [logOpen, setLogOpen] = useState(false);
  const [editRow, setEditRow] = useState<HealthCheckInRow | null>(null);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["health-checkins", subjectKey(subject), range] as const,
    [range, subject]
  );

  const healthQuery = useQuery({
    queryKey,
    queryFn: () => getHealthCheckIns(subject, range),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="page-shell section-gap">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Daily Health Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Log sleep, vitals, and activity. Powers recovery insights on the progress page.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <SubjectSelector subject={subject} onSubjectChange={setSubject} />
        <RangeSelect value={range} onChange={setRange} />
        <Button
          type="button"
          size="sm"
          className="accent-strong rounded-[10px] text-black"
          onClick={() => {
            setEditRow(null);
            setLogOpen(true);
          }}
        >
          + Log Today
        </Button>
      </div>

      <HealthLogTable
        data={healthQuery.data || []}
        isLoading={healthQuery.isLoading}
        onEdit={(row) => {
          setEditRow(row);
          setLogOpen(true);
        }}
      />

      <LogHealthSheet
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
