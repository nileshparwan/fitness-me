"use client";

import * as React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { WorkoutSelector } from "./workout-selector";

export function WorkoutPicker({ programId }: { programId: string }) {
  const [open, setOpen] = React.useState(false);

  const Content = (
    <WorkoutSelector programId={programId} onClose={() => setOpen(false)} />
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hidden md:inline-flex">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Workouts
        </Button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <Button size="icon" className="fixed bottom-4 right-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl md:hidden">
          <PlusCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent size={{ tablet: "lg", desktop: "lg" }} className="flex max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle>Select Workouts to Add</DialogTitle>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
