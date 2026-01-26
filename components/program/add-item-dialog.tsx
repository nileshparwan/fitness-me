"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { useWorkouts } from "@/hooks/use-workout";
import { attachItemToProgram } from "@/app/actions/program";

export function AddItemDialog({ programId }: { programId: string }) {
  const [open, setOpen] = useState(false);
  const [dayLabel, setDayLabel] = useState("");
  const { history } = useWorkouts(); // Assuming this returns { data: workouts }
  const workouts = history.data || [];

  async function handleAdd(id: string, type: "workout" | "nutrition") {
    try {
      if (!dayLabel) {
        toast.error("Please add a label (e.g., 'Monday' or 'Day 1')");
        return;
      }
      await attachItemToProgram(programId, id, type, dayLabel);
      toast.success("Added to program!");
      setOpen(false);
      setDayLabel("");
    } catch (e) {
      toast.error("Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Program</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Input 
            placeholder="Label (e.g. Monday, Leg Day, Day 1...)" 
            value={dayLabel}
            onChange={(e) => setDayLabel(e.target.value)}
          />

          <Tabs defaultValue="workouts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            </TabsList>
            
            <TabsContent value="workouts">
              <ScrollArea className="h-[300px] border rounded-md p-2">
                <div className="space-y-2">
                  {workouts.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer border">
                      <div className="flex flex-col">
                        <span className="font-medium">{w.name}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(w.date), 'PP')}</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleAdd(w.id, 'workout')}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="nutrition">
              <div className="p-4 text-center text-sm text-muted-foreground">
                {/* Ideally, you would create a useNutritionLogs() hook similar to useWorkouts()
                   and map them here just like above. 
                */}
                Select a past nutrition log to copy into this plan.
                <br />(Implement useNutrition hook to list items here)
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}