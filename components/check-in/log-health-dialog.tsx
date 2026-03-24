"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getHealthCheckInForDate,
  logDailyHealthAction,
  type HealthCheckInRow,
  type HealthSubject,
} from "@/app/actions/daily-health-log";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils";

type LogHealthDialogProps = {
  open: boolean;
  subject: HealthSubject;
  prefillRow: HealthCheckInRow | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  date: string;
  sleep_hours: string;
  sleep_score: number | null;
  hrv_ms: string;
  resting_heart_rate: string;
  steps: string;
  energy_level: number | null;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subjectKey(subject: HealthSubject) {
  return subject.type === "me" ? "me" : `client:${subject.id}`;
}

function toInputNumber(value: number | null) {
  return value == null ? "" : String(value);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function createEmptyForm(date: string): FormState {
  return {
    date,
    sleep_hours: "",
    sleep_score: null,
    hrv_ms: "",
    resting_heart_rate: "",
    steps: "",
    energy_level: null,
  };
}

function mapRowToForm(row: HealthCheckInRow): FormState {
  return {
    date: row.date,
    sleep_hours: toInputNumber(row.sleep_hours),
    sleep_score: row.sleep_score != null ? Math.round(row.sleep_score / 20) : null,
    hrv_ms: toInputNumber(row.hrv_ms),
    resting_heart_rate: toInputNumber(row.resting_heart_rate),
    steps: toInputNumber(row.steps),
    energy_level: row.energy_level,
  };
}

function ScaleButtons({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[1, 2, 3, 4, 5].map((score) => (
        <Button
          key={score}
          type="button"
          size="sm"
          variant={value === score ? "default" : "outline"}
          className={cn("h-8 w-8 rounded-[10px] p-0", value === score ? "text-black" : undefined)}
          onClick={() => onChange(value === score ? null : score)}
        >
          {score}
        </Button>
      ))}
    </div>
  );
}

export function LogHealthDialog({
  open,
  subject,
  prefillRow,
  onClose,
  onSaved,
}: LogHealthDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [form, setForm] = useState<FormState>(() => createEmptyForm(toDateInput(new Date())));

  useEffect(() => {
    if (!open) return;
    if (prefillRow) {
      setForm(mapRowToForm(prefillRow));
      return;
    }
    setForm(createEmptyForm(toDateInput(new Date())));
  }, [open, prefillRow]);

  const existingEntryQuery = useQuery({
    queryKey: ["health-checkins", "prefill", subjectKey(subject), form.date],
    queryFn: () => getHealthCheckInForDate(subject, form.date),
    enabled: open && !prefillRow && Boolean(form.date),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open || prefillRow) return;
    if (existingEntryQuery.data) {
      setForm(mapRowToForm(existingEntryQuery.data));
    }
  }, [existingEntryQuery.data, open, prefillRow]);

  const hasAnyField = useMemo(
    () =>
      form.sleep_hours.trim() !== "" ||
      form.sleep_score != null ||
      form.hrv_ms.trim() !== "" ||
      form.resting_heart_rate.trim() !== "" ||
      form.steps.trim() !== "" ||
      form.energy_level != null,
    [form]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      await logDailyHealthAction(subject, {
        date: form.date,
        sleep_hours: toNullableNumber(form.sleep_hours),
        sleep_score: form.sleep_score,
        hrv_ms: toNullableNumber(form.hrv_ms),
        resting_heart_rate: toNullableNumber(form.resting_heart_rate),
        steps: toNullableNumber(form.steps),
        energy_level: form.energy_level,
      });
    },
    onSuccess: () => {
      toast.success("Health check-in saved.");
      onSaved();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to save health check-in");
    },
  });

  const updateField = (key: keyof FormState, value: string | number | null) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-[760px]" : "max-h-[92vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Log Today</SheetTitle>
          <SheetDescription>Log sleep, vitals, and activity for recovery tracking.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => {
                const nextDate = event.target.value;
                setForm(createEmptyForm(nextDate));
              }}
              className="h-9 rounded-[10px] border-border/60 bg-card/70"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Sleep</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Hours slept</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.sleep_hours}
                  onChange={(event) => updateField("sleep_hours", event.target.value)}
                  className="h-9 rounded-[10px] border-border/60 bg-card/70"
                />
              </div>
              <div className="grid gap-2">
                <Label>Sleep quality</Label>
                <ScaleButtons
                  value={form.sleep_score}
                  onChange={(value) => updateField("sleep_score", value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Vitals</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>HRV (ms)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.hrv_ms}
                  onChange={(event) => updateField("hrv_ms", event.target.value)}
                  className="h-9 rounded-[10px] border-border/60 bg-card/70"
                />
              </div>
              <div className="grid gap-2">
                <Label>Resting Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.resting_heart_rate}
                  onChange={(event) => updateField("resting_heart_rate", event.target.value)}
                  className="h-9 rounded-[10px] border-border/60 bg-card/70"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Activity</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Steps</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.steps}
                  onChange={(event) => updateField("steps", event.target.value)}
                  className="h-9 rounded-[10px] border-border/60 bg-card/70"
                />
              </div>
              <div className="grid gap-2">
                <Label>Energy level</Label>
                <ScaleButtons
                  value={form.energy_level}
                  onChange={(value) => updateField("energy_level", value)}
                />
              </div>
            </div>
          </div>

          {existingEntryQuery.isFetching && !prefillRow ? (
            <p className="text-xs text-muted-foreground">Checking existing check-in for selected date...</p>
          ) : null}
        </div>

        <div className="border-t border-border/60 px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-[10px]" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="accent-strong rounded-[10px] text-black"
              disabled={!hasAnyField || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
