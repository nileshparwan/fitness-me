"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import type { MealItemType } from "@/app/actions/meal-groups";
import { MEAL_TYPE_LABELS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";

type MealItemRow = Database["public"]["Tables"]["meal_group_items"]["Row"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  pending?: boolean;
  onSubmit: (payload: {
    type: MealItemType;
    title: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    notes: string | null;
  }) => Promise<void> | void;
  defaultValue?: Partial<MealItemRow>;
};

function toInt(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function MacroSliderField({
  label,
  value,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Input
          className="h-8 w-24 rounded-lg border-border/60 bg-muted/20 text-right"
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(toInt(event.target.value))}
        />
      </div>
      <Slider value={[value]} min={0} max={max} step={step} onValueChange={(next) => onChange(toInt(next[0]))} />
    </div>
  );
}

export function MealItemEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  pending,
  onSubmit,
  defaultValue,
}: Props) {
  const [type, setType] = useState<MealItemType>("breakfast");
  const [itemTitle, setItemTitle] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [notes, setNotes] = useState("");

  const suggestedTitle = useMemo(() => MEAL_TYPE_LABELS[type], [type]);

  useEffect(() => {
    if (!open) return;
    setType((defaultValue?.type as MealItemType) || "breakfast");
    setItemTitle(defaultValue?.title || "");
    setCalories(toInt(defaultValue?.calories));
    setProtein(toInt(defaultValue?.protein_g));
    setCarbs(toInt(defaultValue?.carbs_g));
    setFat(toInt(defaultValue?.fat_g));
    setNotes(defaultValue?.notes || "");
  }, [defaultValue, open]);

  const save = async () => {
    await onSubmit({
      type,
      title: itemTitle.trim() || suggestedTitle,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description || "Configure meal type, calories, macros, and notes."}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Meal Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as MealItemType)}>
              <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder={suggestedTitle} className="rounded-xl border-border/60 bg-muted/20" />
          </div>

          <MacroSliderField label="Calories (kcal)" value={calories} max={2000} step={5} onChange={setCalories} />
          <MacroSliderField label="Protein (g)" value={protein} max={300} step={1} onChange={setProtein} />
          <MacroSliderField label="Carbs (g)" value={carbs} max={300} step={1} onChange={setCarbs} />
          <MacroSliderField label="Fat (g)" value={fat} max={300} step={1} onChange={setFat} />

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setCalories((previous) => Math.min(2000, previous + 50))}>
              +50 kcal
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCalories((previous) => Math.min(2000, previous + 100))}>
              +100 kcal
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setProtein((previous) => Math.min(300, previous + 10))}>
              +10g protein
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCarbs((previous) => Math.min(300, previous + 10))}>
              +10g carbs
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setFat((previous) => Math.min(300, previous + 5))}>
              +5g fat
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional instructions or reminders" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="accent-strong rounded-xl" onClick={() => void save()} disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
