"use client";

import { useState, useEffect } from "react";
import { copyMeal, moveMeal } from "@/app/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { NutritionMeal, ProgramSummary } from "@/types/nutrition";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Props {
  meal: NutritionMeal;
  programs: ProgramSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CopyMealDialog({ meal, programs, open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [targetProgram, setTargetProgram] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Safety check: Ensure programs is always an array
  const safePrograms = programs || [];

  const handleAction = async () => {
    if (!targetProgram) return toast.error("Select a program");
    try {
      if (mode === "copy") {
        await copyMeal(meal.id, targetProgram);
        toast.success("Meal Copied Successfully");
      } else {
        await moveMeal(meal.id, targetProgram);
        toast.success("Meal Moved Successfully");
      }
      onOpenChange(false);
      setTargetProgram(""); // Reset
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const Content = (
    <div className="space-y-6 py-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "copy" | "move")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="copy">Copy to...</TabsTrigger>
          <TabsTrigger value="move">Move to...</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        <Label>Target Program</Label>
        <Select value={targetProgram} onValueChange={setTargetProgram}>
          <SelectTrigger>
            <SelectValue placeholder="Select Program" />
          </SelectTrigger>
          <SelectContent position="popper"> {/* 'popper' helps prevent layout shifts inside modals */}
            {safePrograms
              .filter(p => p.id !== meal.program_id)
              .map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {mode === "copy" 
            ? "Creates a duplicate of this meal in the selected program." 
            : "Removes meal from this program and moves it to the selected one."}
        </p>
      </div>
      
      <Button onClick={handleAction} className="w-full">
        {mode === "copy" ? <Copy className="mr-2 h-4 w-4" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
        {mode === "copy" ? "Copy Meal" : "Move Meal"}
      </Button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="px-6"><DialogHeader><DialogTitle>Organize Meal</DialogTitle></DialogHeader>{Content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-6">
        <SheetHeader className="text-left"><SheetTitle>Organize Meal</SheetTitle></SheetHeader>
        {Content}
      </SheetContent>
    </Sheet>
  );
}