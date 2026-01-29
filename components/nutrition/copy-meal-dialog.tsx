"use client";

import { useState } from "react";
import { copyMeal, moveMeal } from "@/app/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ArrowRightLeft } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function CopyMealDialog({ meal, programs }: { meal: any, programs: any[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"copy" | "move">("copy");
  const [targetProgram, setTargetProgram] = useState("");

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
      setOpen(false);
    } catch (e) {
      toast.error("Action failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Copy className="mr-2 h-4 w-4" /> Copy / Move
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Organize Meal</DialogTitle></DialogHeader>
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
              <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
              <SelectContent>
                {programs.filter(p => p.id !== meal.program_id).map(p => (
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
      </DialogContent>
    </Dialog>
  );
}