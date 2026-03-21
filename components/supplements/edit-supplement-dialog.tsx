"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateCustomSupplementAction } from "@/app/actions/supplements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { normalizeSupplementDisplayName } from "@/lib/nutrition/supplements";
import { supplementKeys } from "@/lib/query-keys-supplements";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import type { Database } from "@/types/database";
import { cn } from "@/utils";

type SupplementCatalogRow = Database["public"]["Tables"]["supplement_catalog"]["Row"];

const CATEGORY_OPTIONS: Array<{
  value: "vitamin" | "mineral" | "omega" | "protein" | "electrolyte" | "herbal" | "other";
  label: string;
}> = [
  { value: "vitamin", label: "Vitamin" },
  { value: "mineral", label: "Mineral" },
  { value: "omega", label: "Omega" },
  { value: "protein", label: "Performance" },
  { value: "electrolyte", label: "Electrolyte" },
  { value: "herbal", label: "Herbal" },
  { value: "other", label: "Other" },
];

type SupplementCategory = (typeof CATEGORY_OPTIONS)[number]["value"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement: SupplementCatalogRow | null;
};

function readCategories(row: SupplementCatalogRow | null): SupplementCategory[] {
  if (!row) return ["other"];
  const fromArray = (row as SupplementCatalogRow & { categories?: unknown }).categories;
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    return Array.from(new Set(fromArray.filter((item): item is SupplementCategory => typeof item === "string"))) as SupplementCategory[];
  }
  if (typeof row.category === "string") return [row.category as SupplementCategory];
  return ["other"];
}

export function EditSupplementDialog({ open, onOpenChange, supplement }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<SupplementCategory[]>(["other"]);

  useEffect(() => {
    if (!open || !supplement) return;
    setName(normalizeSupplementDisplayName(supplement.name));
    setCategories(readCategories(supplement));
  }, [open, supplement]);

  const updateMutation = useMutation({
    mutationFn: updateCustomSupplementAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: supplementKeys.catalog() });
      onOpenChange(false);
    },
  });

  const selectedCategorySet = useMemo(() => new Set(categories), [categories]);

  const toggleCategory = (category: SupplementCategory) => {
    setCategories((current) => {
      if (current.includes(category)) {
        if (current.length === 1) return current;
        return current.filter((entry) => entry !== category);
      }
      return [...current, category];
    });
  };

  const submit = async () => {
    if (!supplement) return;
    if (!name.trim()) {
      toast.error("Supplement name is required");
      return;
    }
    if (categories.length === 0) {
      toast.error("Select at least one category");
      return;
    }
    await withToastFeedback(
      updateMutation.mutateAsync({
        id: supplement.id,
        name: name.trim(),
        categories,
      }),
      {
        loading: "Updating supplement...",
        success: "Supplement updated",
        error: "Unable to update supplement",
      }
    ).catch(() => null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-[480px]" : "max-h-[90vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Edit Supplement</SheetTitle>
          <SheetDescription>Update name and categories.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-supplement-name">Name *</Label>
            <Input
              id="edit-supplement-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Supplement name"
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Categories *</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = selectedCategorySet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleCategory(option.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-chart-2/45 bg-chart-2/12 text-foreground"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:border-chart-2/35"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border/60 px-5 py-4">
          <Button type="button" variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="accent-strong rounded-xl text-black"
            onClick={() => void submit()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
