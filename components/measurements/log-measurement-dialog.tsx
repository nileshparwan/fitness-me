"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getBodyMeasurementForDate,
  logBodyMeasurementAction,
  type BodyMeasurementRow,
  type MeasurementSubject,
} from "@/app/actions/body-measurements";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils";

type LogMeasurementDialogProps = {
  open: boolean;
  subject: MeasurementSubject;
  prefillRow: BodyMeasurementRow | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  date: string;
  weight: string;
  body_fat_percent: string;
  waist_cm: string;
  hips_cm: string;
  chest_cm: string;
  neck_cm: string;
  bicep_left_cm: string;
  bicep_right_cm: string;
  thigh_left_cm: string;
  thigh_right_cm: string;
  calf_cm: string;
  notes: string;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subjectKey(subject: MeasurementSubject) {
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
    weight: "",
    body_fat_percent: "",
    waist_cm: "",
    hips_cm: "",
    chest_cm: "",
    neck_cm: "",
    bicep_left_cm: "",
    bicep_right_cm: "",
    thigh_left_cm: "",
    thigh_right_cm: "",
    calf_cm: "",
    notes: "",
  };
}

function mapRowToForm(row: BodyMeasurementRow): FormState {
  return {
    date: row.date,
    weight: toInputNumber(row.weight),
    body_fat_percent: toInputNumber(row.body_fat_percent),
    waist_cm: toInputNumber(row.waist_cm),
    hips_cm: toInputNumber(row.hips_cm),
    chest_cm: toInputNumber(row.chest_cm),
    neck_cm: toInputNumber(row.neck_cm),
    bicep_left_cm: toInputNumber(row.bicep_left_cm),
    bicep_right_cm: toInputNumber(row.bicep_right_cm),
    thigh_left_cm: toInputNumber(row.thigh_left_cm),
    thigh_right_cm: toInputNumber(row.thigh_right_cm),
    calf_cm: toInputNumber(row.calf_cm),
    notes: row.notes || "",
  };
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-[10px] border-border/60 bg-card/70"
      />
    </div>
  );
}

export function LogMeasurementDialog({
  open,
  subject,
  prefillRow,
  onClose,
  onSaved,
}: LogMeasurementDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [form, setForm] = useState<FormState>(() => createEmptyForm(toDateInput(new Date())));
  const [showMoreMeasurements, setShowMoreMeasurements] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (prefillRow) {
      setForm(mapRowToForm(prefillRow));
      setShowMoreMeasurements(true);
      return;
    }
    const today = toDateInput(new Date());
    setForm(createEmptyForm(today));
    setShowMoreMeasurements(false);
  }, [open, prefillRow]);

  const existingEntryQuery = useQuery({
    queryKey: ["body-measurements", "prefill", subjectKey(subject), form.date],
    queryFn: () => getBodyMeasurementForDate(subject, form.date),
    enabled: open && !prefillRow && Boolean(form.date),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open || prefillRow) return;
    const row = existingEntryQuery.data;
    if (row) {
      setForm(mapRowToForm(row));
    }
  }, [existingEntryQuery.data, open, prefillRow]);

  const hasAnyMeasurement = useMemo(
    () =>
      [
        form.weight,
        form.body_fat_percent,
        form.waist_cm,
        form.hips_cm,
        form.chest_cm,
        form.neck_cm,
        form.bicep_left_cm,
        form.bicep_right_cm,
        form.thigh_left_cm,
        form.thigh_right_cm,
        form.calf_cm,
      ].some((value) => value.trim() !== ""),
    [form]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      await logBodyMeasurementAction(subject, {
        date: form.date,
        weight: toNullableNumber(form.weight),
        body_fat_percent: toNullableNumber(form.body_fat_percent),
        waist_cm: toNullableNumber(form.waist_cm),
        hips_cm: toNullableNumber(form.hips_cm),
        chest_cm: toNullableNumber(form.chest_cm),
        neck_cm: toNullableNumber(form.neck_cm),
        bicep_left_cm: toNullableNumber(form.bicep_left_cm),
        bicep_right_cm: toNullableNumber(form.bicep_right_cm),
        thigh_left_cm: toNullableNumber(form.thigh_left_cm),
        thigh_right_cm: toNullableNumber(form.thigh_right_cm),
        calf_cm: toNullableNumber(form.calf_cm),
        notes: form.notes.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Measurement saved.");
      onSaved();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to save measurement");
    },
  });

  const updateField = (key: keyof FormState, value: string) => {
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
          <SheetTitle>{prefillRow ? "Edit Measurement" : "Log Measurement"}</SheetTitle>
          <SheetDescription>
            Track weight, body fat, and body circumferences for progress insights.
          </SheetDescription>
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
              disabled={Boolean(prefillRow)}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Core</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Weight (kg)" value={form.weight} onChange={(value) => updateField("weight", value)} />
              <Field
                label="Body Fat (%)"
                value={form.body_fat_percent}
                onChange={(value) => updateField("body_fat_percent", value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Circumferences</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Waist (cm)" value={form.waist_cm} onChange={(value) => updateField("waist_cm", value)} />
              <Field label="Hips (cm)" value={form.hips_cm} onChange={(value) => updateField("hips_cm", value)} />
              <Field
                label="Chest (cm)"
                value={form.chest_cm}
                onChange={(value) => updateField("chest_cm", value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-[10px] px-2 text-xs"
              onClick={() => setShowMoreMeasurements((current) => !current)}
            >
              {showMoreMeasurements ? "Hide more measurements" : "+ More measurements"}
            </Button>

            {showMoreMeasurements ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Neck (cm)" value={form.neck_cm} onChange={(value) => updateField("neck_cm", value)} />
                <Field
                  label="Bicep Left (cm)"
                  value={form.bicep_left_cm}
                  onChange={(value) => updateField("bicep_left_cm", value)}
                />
                <Field
                  label="Bicep Right (cm)"
                  value={form.bicep_right_cm}
                  onChange={(value) => updateField("bicep_right_cm", value)}
                />
                <Field
                  label="Thigh Left (cm)"
                  value={form.thigh_left_cm}
                  onChange={(value) => updateField("thigh_left_cm", value)}
                />
                <Field
                  label="Thigh Right (cm)"
                  value={form.thigh_right_cm}
                  onChange={(value) => updateField("thigh_right_cm", value)}
                />
                <Field label="Calf (cm)" value={form.calf_cm} onChange={(value) => updateField("calf_cm", value)} />
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Optional notes"
              className="min-h-[90px] rounded-[10px] border-border/60 bg-card/70"
            />
          </div>

          {existingEntryQuery.isFetching && !prefillRow ? (
            <p className="text-xs text-muted-foreground">Checking for an existing entry on this date...</p>
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
              disabled={!hasAnyMeasurement || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Measurement"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
