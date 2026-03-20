"use client";

import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/utils";

type DeleteConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string | null;
  pending?: boolean;
  onConfirm: () => Promise<void> | void;
  title?: string;
};

export function DeleteConfirmSheet({
  open,
  onOpenChange,
  itemName,
  pending,
  onConfirm,
  title = "Remove item",
}: DeleteConfirmSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto border-border/70 bg-card/95 p-0",
          isDesktop ? "w-full sm:max-w-sm" : "max-h-[70vh] rounded-t-2xl"
        )}
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {itemName ? `"${itemName}" will be permanently removed.` : "This item will be permanently removed."} This action cannot be undone.
          </SheetDescription>
        </SheetHeader>
        <div className="flex gap-3 px-5 py-4">
          <Button variant="outline" className="flex-1 rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1 rounded-xl" disabled={pending} onClick={() => void onConfirm()}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Remove
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
