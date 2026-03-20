"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { MEAL_TYPE_ICONS } from "@/components/nutrition/meal-groups/meal-group-types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getMealUnitOptions, normalizeMealUnit } from "@/lib/nutrition/meal-units";
import { useUnitLabels } from "@/stores/use-settings-store";
import { cn } from "@/utils";

const NO_UNIT_SELECT_VALUE = "__no_unit__";

export type MealItemEditorValue = {
  type: string;
  title: string;
  quantity: number | null;
  unit: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  notes: string | null;
  planned_time: string | null;
  save_to_favorites: boolean;
};

export type MealItemTypeOption = {
  value: string;
  label: string;
};

type MealItemEditorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  mode: "create" | "edit";
  defaultValue?: Partial<MealItemEditorValue> | null;
  mealTypeOptions: MealItemTypeOption[];
  onSave: (value: MealItemEditorValue) => Promise<void> | void;
  title?: string;
  description?: string;
  submitLabel?: string;
  quickMode?: boolean;
  showPlannedTime?: boolean;
  showFiber?: boolean;
  showSaveToFavorites?: boolean;
  disableMealType?: boolean;
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function toSafeInt(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function toSafeDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function MacroField({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (next: number) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={max}
            value={value}
            onChange={(event) => onChange(clampInt(toSafeInt(event.target.value), 0, max))}
            className="h-8 w-24 border-border/60 bg-background/80 text-right"
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={(values) => onChange(clampInt(values[0] ?? 0, 0, max))} />
    </div>
  );
}

export function MealItemEditorSheet({
  open,
  onOpenChange,
  pending,
  mode,
  defaultValue,
  mealTypeOptions,
  onSave,
  title,
  description,
  submitLabel,
  quickMode = false,
  showPlannedTime = false,
  showFiber = false,
  showSaveToFavorites = false,
  disableMealType = false,
}: MealItemEditorSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const units = useUnitLabels();

  const fallbackType = mealTypeOptions[0]?.value || "breakfast";
  const [type, setType] = useState(fallbackType);
  const [plannedTime, setPlannedTime] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [notes, setNotes] = useState("");
  const [saveToFavorites, setSaveToFavorites] = useState(false);

  const unitOptions = useMemo(() => getMealUnitOptions(unit), [unit]);
  const titleText = title || (mode === "create" ? "Add Meal Item" : "Edit Meal Item");
  const descriptionText =
    description || (mode === "create" ? "Set item details for this entry." : "Update values and notes for this entry.");

  useEffect(() => {
    if (!open) return;
    const nextType = defaultValue?.type && mealTypeOptions.some((option) => option.value === defaultValue.type)
      ? defaultValue.type
      : fallbackType;
    setType(nextType);
    setPlannedTime(defaultValue?.planned_time || "");
    setTitleValue(defaultValue?.title || "");
    setQuantity(defaultValue?.quantity !== null && defaultValue?.quantity !== undefined ? `${defaultValue.quantity}` : "");
    setUnit(defaultValue?.unit || "");
    setCalories(toSafeInt(defaultValue?.calories));
    setProtein(toSafeInt(defaultValue?.protein_g));
    setCarbs(toSafeInt(defaultValue?.carbs_g));
    setFat(toSafeInt(defaultValue?.fat_g));
    setFiber(toSafeInt(defaultValue?.fiber_g));
    setNotes(defaultValue?.notes || "");
    setSaveToFavorites(Boolean(defaultValue?.save_to_favorites));
  }, [defaultValue, fallbackType, mealTypeOptions, open]);

  const runQuickAction = (action: "plus_50_kcal" | "plus_100_kcal" | "plus_10_protein" | "plus_10_carbs" | "plus_5_fat") => {
    if (action === "plus_50_kcal") setCalories((current) => clampInt(current + 50, 0, 2000));
    if (action === "plus_100_kcal") setCalories((current) => clampInt(current + 100, 0, 2000));
    if (action === "plus_10_protein") setProtein((current) => clampInt(current + 10, 0, 300));
    if (action === "plus_10_carbs") setCarbs((current) => clampInt(current + 10, 0, 300));
    if (action === "plus_5_fat") setFat((current) => clampInt(current + 5, 0, 300));
  };

  const onSubmit = async () => {
    const normalizedUnit = unit.trim();
    const canonicalUnit = normalizeMealUnit(normalizedUnit);
    const unitForSave = canonicalUnit || normalizedUnit || null;
    const payload: MealItemEditorValue = {
      type,
      title: titleValue.trim(),
      quantity: toSafeDecimal(quantity),
      unit: unitForSave,
      calories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      fiber_g: showFiber ? fiber : null,
      notes: notes.trim() || null,
      planned_time: showPlannedTime ? plannedTime.trim() || null : null,
      save_to_favorites: showSaveToFavorites ? saveToFavorites : false,
    };

    await onSave(payload);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-xl" : "max-h-[88vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>{titleText}</SheetTitle>
          <SheetDescription>{descriptionText}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Meal Section</Label>
              <Select value={type} onValueChange={setType} disabled={disableMealType}>
                <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTypeOptions.map((option) => {
                    const Icon = MEAL_TYPE_ICONS[option.value as keyof typeof MEAL_TYPE_ICONS] || MEAL_TYPE_ICONS.breakfast;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4 text-chart-2" />
                          <span>{option.label}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {showPlannedTime && !quickMode ? (
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={plannedTime}
                  onChange={(event) => setPlannedTime(event.target.value)}
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>
            ) : null}
          </div>

          {!quickMode ? (
            <>
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={titleValue}
                  onChange={(event) => setTitleValue(event.target.value)}
                  placeholder="e.g. Greek Yogurt Bowl"
                  className="rounded-xl border-border/60 bg-muted/20"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="rounded-xl border-border/60 bg-muted/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={unit || NO_UNIT_SELECT_VALUE}
                    onValueChange={(value) => setUnit(value === NO_UNIT_SELECT_VALUE ? "" : value)}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-muted/20">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_UNIT_SELECT_VALUE}>No unit</SelectItem>
                      {unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <MacroField label="Calories" value={calories} max={2000} unit={units.energy} onChange={setCalories} />
            <MacroField label="Protein" value={protein} max={300} unit={units.macro} onChange={setProtein} />
            <MacroField label="Carbs" value={carbs} max={300} unit={units.macro} onChange={setCarbs} />
            <MacroField label="Fat" value={fat} max={300} unit={units.macro} onChange={setFat} />
            {showFiber ? <MacroField label="Fiber" value={fiber} max={120} unit={units.macro} onChange={setFiber} /> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => runQuickAction("plus_50_kcal")}>
              +50 {units.energy}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runQuickAction("plus_100_kcal")}>
              +100 {units.energy}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runQuickAction("plus_10_protein")}>
              +10{units.macro} protein
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runQuickAction("plus_10_carbs")}>
              +10{units.macro} carbs
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runQuickAction("plus_5_fat")}>
              +5{units.macro} fat
            </Button>
          </div>

          {!quickMode ? (
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes..."
                className="min-h-20 rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          ) : null}

          {!quickMode && showSaveToFavorites ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
              <Checkbox id="save-favorite-item" checked={saveToFavorites} onCheckedChange={(checked) => setSaveToFavorites(Boolean(checked))} />
              <Label htmlFor="save-favorite-item" className="text-sm">
                Save to favorites for quick reuse
              </Label>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 px-5 py-4">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="accent-strong flex-1 rounded-xl" onClick={() => void onSubmit()} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel || (mode === "create" ? "Save Item" : "Update Item")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
