"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  type CycleSubject,
  type MenstrualCycleRow,
  logCycleAction,
} from "@/app/actions/menstrual-cycles";
import {
  AppSheet,
  AppSheetContent,
  AppSheetDescription,
  AppSheetHeader,
  AppSheetTitle,
} from "@/components/ui/app-sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toDateInput } from "@/lib/utils/date";
import { cn } from "@/utils";

type CycleLogSheetProps = {
  open: boolean;
  subject: CycleSubject;
  prefillRow: MenstrualCycleRow | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  period_start_date: string;
  period_end_date: string;
  cycle_length_days: string;
  period_length_days: string;
  energy_level: string;
  mood: string;
  cramps: string;
  bloating: boolean;
  headache: boolean;
  notes: string;
};

function parseDateInput(value: string | null) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

function formatDateLabel(value: string) {
  const date = parseDateInput(value);
  return date ? format(date, "PPP") : "Pick a date";
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

function diffInDaysInclusive(start: string, end: string) {
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);
  if (!startDate || !endDate) return "";
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  return diff > 0 ? String(diff) : "";
}

function createEmptyForm(): FormState {
  const today = toDateInput(new Date());
  return {
    period_start_date: today,
    period_end_date: "",
    cycle_length_days: "",
    period_length_days: "",
    energy_level: "",
    mood: "",
    cramps: "0",
    bloating: false,
    headache: false,
    notes: "",
  };
}

function mapRowToForm(row: MenstrualCycleRow): FormState {
  return {
    period_start_date: row.period_start_date,
    period_end_date: row.period_end_date || "",
    cycle_length_days: toInputNumber(row.cycle_length_days),
    period_length_days: toInputNumber(row.period_length_days),
    energy_level: toInputNumber(row.energy_level),
    mood: toInputNumber(row.mood),
    cramps: toInputNumber(row.cramps ?? 0),
    bloating: (row.bloating ?? 0) > 0,
    headache: Boolean(row.headache),
    notes: row.notes || "",
  };
}

function DateField({
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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 justify-start rounded-[10px] border-border/60 bg-card/70 text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
            {value ? formatDateLabel(value) : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parseDateInput(value)}
            onSelect={(date) => onChange(date ? toDateInput(date) : "")}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ScaleField({
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
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => onChange(next)}
        className="grid grid-cols-5 gap-2"
      >
        {["1", "2", "3", "4", "5"].map((level) => (
          <ToggleGroupItem
            key={level}
            value={level}
            className="h-10 rounded-[10px] border border-border/60 bg-card/60 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/15"
          >
            {level}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function CycleLogSheet({
  open,
  subject,
  prefillRow,
  onClose,
  onSaved,
}: CycleLogSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [form, setForm] = useState<FormState>(createEmptyForm);

  useEffect(() => {
    if (!open) return;
    setForm(prefillRow ? mapRowToForm(prefillRow) : createEmptyForm());
  }, [open, prefillRow]);

  const derivedPeriodLength = useMemo(
    () => diffInDaysInclusive(form.period_start_date, form.period_end_date),
    [form.period_end_date, form.period_start_date]
  );

  useEffect(() => {
    if (!derivedPeriodLength) return;
    setForm((current) => {
      if (current.period_length_days && current.period_length_days !== derivedPeriodLength) {
        return current;
      }
      if (current.period_length_days === derivedPeriodLength) return current;
      return { ...current, period_length_days: derivedPeriodLength };
    });
  }, [derivedPeriodLength]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      logCycleAction(subject, {
        period_start_date: form.period_start_date,
        period_end_date: form.period_end_date || null,
        cycle_length_days: toNullableNumber(form.cycle_length_days),
        period_length_days: toNullableNumber(form.period_length_days),
        energy_level: toNullableNumber(form.energy_level),
        mood: toNullableNumber(form.mood),
        cramps: toNullableNumber(form.cramps),
        bloating: form.bloating ? 1 : 0,
        headache: form.headache,
        notes: form.notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success(prefillRow ? "Cycle entry updated." : "Cycle entry saved.");
      onSaved();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to save cycle entry");
    },
  });

  const updateField = (key: keyof FormState, value: string | boolean) => {
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
          <AppSheetTitle>{prefillRow ? "Edit Cycle Entry" : "Log Period"}</AppSheetTitle>
          <AppSheetDescription>
            Capture timing, symptoms, and energy so cycle context shows up across the app.
          </AppSheetDescription>
        </AppSheetHeader>

        <form
          className="flex-1 space-y-5 overflow-y-auto px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveMutation.mutateAsync();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DateField
              label="Period Start"
              value={form.period_start_date}
              onChange={(value) => updateField("period_start_date", value)}
            />
            <DateField
              label="Period End"
              value={form.period_end_date}
              onChange={(value) => updateField("period_end_date", value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cycle_length_days">Cycle Length</Label>
              <Input
                id="cycle_length_days"
                type="number"
                min="14"
                max="60"
                value={form.cycle_length_days}
                onChange={(event) => updateField("cycle_length_days", event.target.value)}
                className="h-10 rounded-[10px] border-border/60 bg-card/70"
                placeholder="28"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period_length_days">Period Length</Label>
              <Input
                id="period_length_days"
                type="number"
                min="1"
                max="14"
                value={form.period_length_days}
                onChange={(event) => updateField("period_length_days", event.target.value)}
                className="h-10 rounded-[10px] border-border/60 bg-card/70"
                placeholder="5"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ScaleField
              label="Energy"
              value={form.energy_level}
              onChange={(value) => updateField("energy_level", value)}
            />
            <ScaleField
              label="Mood"
              value={form.mood}
              onChange={(value) => updateField("mood", value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Cramps</Label>
              <RadioGroup
                value={form.cramps}
                onValueChange={(value) => updateField("cramps", value)}
                className="grid gap-2"
              >
                {[
                  { value: "0", label: "None" },
                  { value: "1", label: "Mild" },
                  { value: "2", label: "Moderate" },
                  { value: "3", label: "Severe" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 rounded-[10px] border border-border/60 bg-card/60 px-3 py-2.5 text-sm"
                  >
                    <RadioGroupItem value={option.value} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-3">
              <label className="flex items-center justify-between rounded-[10px] border border-border/60 bg-card/60 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Bloating</div>
                  <div className="text-xs text-muted-foreground">Track if bloating was present this cycle.</div>
                </div>
                <Switch
                  checked={form.bloating}
                  onCheckedChange={(checked) => updateField("bloating", checked)}
                />
              </label>
              <label className="flex items-center justify-between rounded-[10px] border border-border/60 bg-card/60 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Headache</div>
                  <div className="text-xs text-muted-foreground">Track if headaches were present this cycle.</div>
                </div>
                <Switch
                  checked={form.headache}
                  onCheckedChange={(checked) => updateField("headache", checked)}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cycle_notes">Notes</Label>
            <Textarea
              id="cycle_notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Symptoms, training notes, or anything worth tracking."
              className="min-h-[120px] resize-none rounded-[10px] border-border/60 bg-card/70"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-[10px]"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="accent-strong rounded-[10px] text-black"
              disabled={saveMutation.isPending || !form.period_start_date}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {prefillRow ? "Save Changes" : "Save Entry"}
            </Button>
          </div>
        </form>
      </AppSheetContent>
    </AppSheet>
  );
}
