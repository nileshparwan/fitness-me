"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCustomSupplementAction } from "@/app/actions/supplements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { supplementKeys } from "@/lib/query-keys-supplements";
import { cn } from "@/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (supplementId: string) => void;
  initialName?: string;
};

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

export function CreateCustomSupplementDialog({ open, onOpenChange, onCreated, initialName }: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<SupplementCategory[]>(["other"]);

  useEffect(() => {
    if (!open) return;
    setName(initialName?.trim() || "");
    setCategories(["other"]);
  }, [initialName, open]);

  const createMutation = useMutation({
    mutationFn: createCustomSupplementAction,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === supplementKeys.all[0] && query.queryKey[1] === "catalog",
      });
      toast.success("Custom supplement created");
      onCreated?.(result.id);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create supplement");
    },
  });

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
    if (!name.trim()) {
      toast.error("Supplement name is required");
      return;
    }
    if (categories.length === 0) {
      toast.error("Select at least one category");
      return;
    }

    await createMutation.mutateAsync({
      name: name.trim(),
      categories,
    });
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
          <SheetTitle>Create Supplement</SheetTitle>
          <SheetDescription>
            Add a supplement with name and categories.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="supplement-name">Name *</Label>
            <Input
              id="supplement-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Calcium"
              className="rounded-xl border-border/60 bg-muted/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Categories *</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => {
                const active = categories.includes(option.value);
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
            Cancel
          </Button>
          <Button
            type="button"
            className="accent-strong rounded-xl text-black"
            onClick={() => void submit()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Supplement
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
