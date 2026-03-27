"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AppSheet,
  AppSheetContent,
  AppSheetDescription,
  AppSheetHeader,
  AppSheetTitle,
} from "@/components/ui/app-sheet";
import {
  getBodyMeasurementForDate,
  logBodyMeasurementAction,
  type BodyMeasurementRow,
  type MeasurementSubject,
} from "@/app/actions/body-measurements";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayCircumference, displayWeight } from "@/utils/unit-conversion";
import { cn } from "@/utils";

type LogMeasurementSheetProps = {
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
  waist: string;
  hips: string;
  chest: string;
  neck: string;
  bicep_left: string;
  bicep_right: string;
  thigh_left: string;
  thigh_right: string;
  calf: string;
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
    waist: "",
    hips: "",
    chest: "",
    neck: "",
    bicep_left: "",
    bicep_right: "",
    thigh_left: "",
    thigh_right: "",
    calf: "",
    notes: "",
  };
}

function mapRowToForm(row: BodyMeasurementRow, system: ReturnType<typeof useUnitSystem>): FormState {
  return {
    date: row.date,
    weight: toInputNumber(displayWeight(row.weight, system)),
    body_fat_percent: toInputNumber(row.body_fat_percent),
    waist: toInputNumber(displayCircumference(row.waist, system)),
    hips: toInputNumber(displayCircumference(row.hips, system)),
    chest: toInputNumber(displayCircumference(row.chest, system)),
    neck: toInputNumber(displayCircumference(row.neck, system)),
    bicep_left: toInputNumber(displayCircumference(row.bicep_left, system)),
    bicep_right: toInputNumber(displayCircumference(row.bicep_right, system)),
    thigh_left: toInputNumber(displayCircumference(row.thigh_left, system)),
    thigh_right: toInputNumber(displayCircumference(row.thigh_right, system)),
    calf: toInputNumber(displayCircumference(row.calf, system)),
    notes: row.notes || "",
  };
}

function Field({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {unit}
        </span>
      </div>
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

export function LogMeasurementSheet({
  open,
  subject,
  prefillRow,
  onClose,
  onSaved,
}: LogMeasurementSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const [form, setForm] = useState<FormState>(() => createEmptyForm(toDateInput(new Date())));
  const [showMoreMeasurements, setShowMoreMeasurements] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (prefillRow) {
      setForm(mapRowToForm(prefillRow, system));
      setShowMoreMeasurements(true);
      return;
    }
    const today = toDateInput(new Date());
    setForm(createEmptyForm(today));
    setShowMoreMeasurements(false);
  }, [open, prefillRow, system]);

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
      setForm(mapRowToForm(row, system));
    }
  }, [existingEntryQuery.data, open, prefillRow, system]);

  const hasAnyMeasurement = useMemo(
    () =>
      [
        form.weight,
        form.body_fat_percent,
        form.waist,
        form.hips,
        form.chest,
        form.neck,
        form.bicep_left,
        form.bicep_right,
        form.thigh_left,
        form.thigh_right,
        form.calf,
      ].some((value) => value.trim() !== ""),
    [form]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      await logBodyMeasurementAction(subject, {
        date: form.date,
        weight: toNullableNumber(form.weight),
        body_fat_percent: toNullableNumber(form.body_fat_percent),
        waist: toNullableNumber(form.waist),
        hips: toNullableNumber(form.hips),
        chest: toNullableNumber(form.chest),
        neck: toNullableNumber(form.neck),
        bicep_left: toNullableNumber(form.bicep_left),
        bicep_right: toNullableNumber(form.bicep_right),
        thigh_left: toNullableNumber(form.thigh_left),
        thigh_right: toNullableNumber(form.thigh_right),
        calf: toNullableNumber(form.calf),
        notes: form.notes.trim() || null,
      }, system);
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
    <AppSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <AppSheetContent
        className={cn(
          "gap-0 border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-[760px]" : "max-h-[92vh] rounded-t-2xl"
        )}
      >
        <AppSheetHeader className="border-b border-border/60 px-5 py-4">
          <AppSheetTitle>{prefillRow ? "Edit Measurement" : "Log Measurement"}</AppSheetTitle>
          <AppSheetDescription>
            Track weight, body fat, and body circumferences for progress insights.
          </AppSheetDescription>
        </AppSheetHeader>

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
              <Field
                label="Weight"
                unit={labels.weight}
                value={form.weight}
                onChange={(value) => updateField("weight", value)}
              />
              <Field
                label="Body Fat"
                unit="%"
                value={form.body_fat_percent}
                onChange={(value) => updateField("body_fat_percent", value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Circumferences</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Waist" unit={labels.circumference} value={form.waist} onChange={(value) => updateField("waist", value)} />
              <Field label="Hips" unit={labels.circumference} value={form.hips} onChange={(value) => updateField("hips", value)} />
              <Field
                label="Chest"
                unit={labels.circumference}
                value={form.chest}
                onChange={(value) => updateField("chest", value)}
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
                <Field label="Neck" unit={labels.circumference} value={form.neck} onChange={(value) => updateField("neck", value)} />
                <Field
                  label="Bicep Left"
                  unit={labels.circumference}
                  value={form.bicep_left}
                  onChange={(value) => updateField("bicep_left", value)}
                />
                <Field
                  label="Bicep Right"
                  unit={labels.circumference}
                  value={form.bicep_right}
                  onChange={(value) => updateField("bicep_right", value)}
                />
                <Field
                  label="Thigh Left"
                  unit={labels.circumference}
                  value={form.thigh_left}
                  onChange={(value) => updateField("thigh_left", value)}
                />
                <Field
                  label="Thigh Right"
                  unit={labels.circumference}
                  value={form.thigh_right}
                  onChange={(value) => updateField("thigh_right", value)}
                />
                <Field label="Calf" unit={labels.circumference} value={form.calf} onChange={(value) => updateField("calf", value)} />
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
      </AppSheetContent>
    </AppSheet>
  );
}
