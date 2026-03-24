"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBodyMeasurements,
  type BodyMeasurementRow,
  type MeasurementSubject,
} from "@/app/actions/body-measurements";
import { LogMeasurementDialog } from "@/components/measurements/log-measurement-dialog";
import { MeasurementsTable } from "@/components/measurements/measurements-table";
import { SubjectSelector } from "@/components/shared/subject-selector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MeasurementRange = "30d" | "90d" | "180d" | "1y" | "all";

function subjectKey(subject: MeasurementSubject) {
  return subject.type === "me" ? "me" : `client:${subject.id}`;
}

function RangeSelect({
  value,
  onChange,
}: {
  value: MeasurementRange;
  onChange: (value: MeasurementRange) => void;
}) {
  return (
    <div className="grid min-w-[150px] gap-2">
      <Label className="text-xs text-muted-foreground">Range</Label>
      <Select value={value} onValueChange={(next) => onChange(next as MeasurementRange)}>
        <SelectTrigger className="h-9 rounded-[10px] border-border/60 bg-card/70">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30d">30 days</SelectItem>
          <SelectItem value="90d">90 days</SelectItem>
          <SelectItem value="180d">180 days</SelectItem>
          <SelectItem value="1y">1 year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MeasurementsPage() {
  const [subject, setSubject] = useState<MeasurementSubject>({ type: "me" });
  const [range, setRange] = useState<MeasurementRange>("90d");
  const [logOpen, setLogOpen] = useState(false);
  const [editRow, setEditRow] = useState<BodyMeasurementRow | null>(null);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["body-measurements", subjectKey(subject), range] as const,
    [range, subject]
  );

  const measurementsQuery = useQuery({
    queryKey,
    queryFn: () => getBodyMeasurements(subject, range),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="page-shell section-gap">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Body Measurements</h1>
        <p className="text-sm text-muted-foreground">
          Track weight, body fat, and circumferences over time.
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
          + Log Measurement
        </Button>
      </div>

      <MeasurementsTable
        data={measurementsQuery.data || []}
        isLoading={measurementsQuery.isLoading}
        onEdit={(row) => {
          setEditRow(row);
          setLogOpen(true);
        }}
      />

      <LogMeasurementDialog
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
