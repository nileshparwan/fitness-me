"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { SupplementAssignmentRow } from "@/app/actions/supplements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  SUPPLEMENT_UNIT_OPTIONS,
  type SupplementUnitValue,
  normalizeSupplementDisplayName,
} from "@/lib/nutrition/supplements";
import { cn } from "@/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: SupplementAssignmentRow | null;
  onSave: (input: {
    id: string;
    default_servings: number;
    unit: SupplementUnitValue | null;
  }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  pending?: boolean;
};

export function EditAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  onSave,
  onRemove,
  pending,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [servings, setServings] = useState("1");
  const [unit, setUnit] = useState<SupplementUnitValue>("unit");

  const supportedUnits = useMemo(() => new Set<string>(SUPPLEMENT_UNIT_OPTIONS.map((option) => option.value)), []);

  useEffect(() => {
    if (!assignment || !open) return;
    setServings(String(assignment.default_servings || 1));
    const unitCandidate = (assignment.unit || assignment.serving_label || "unit").toLowerCase();
    setUnit(supportedUnits.has(unitCandidate) ? (unitCandidate as SupplementUnitValue) : "unit");
  }, [assignment, open, supportedUnits]);

  if (!assignment) return null;

  const submit = async () => {
    await onSave({
      id: assignment.id,
      default_servings: Number(servings || 1),
      unit,
    });
    onOpenChange(false);
  };

  const remove = async () => {
    await onRemove(assignment.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-[520px]" : "max-h-[92vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Edit - {normalizeSupplementDisplayName(assignment.supplement_name)}</SheetTitle>
          <SheetDescription>Update dosage and unit for this assignment.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="assignment-serving">Default dosage</Label>
            <Input
              id="assignment-serving"
              type="number"
              min={0.1}
              step={0.1}
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(value) => setUnit(value as SupplementUnitValue)}>
              <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                {SUPPLEMENT_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="destructive" onClick={() => void remove()} disabled={pending}>
            Remove from stack
          </Button>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="accent-strong rounded-xl text-black" onClick={() => void submit()} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
