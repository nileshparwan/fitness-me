"use client";

import * as React from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WorkoutSelector } from "./workout-selector";

export function WorkoutPicker({ programId }: { programId: string }) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // Adjusted to match builder breakpoint

  const Content = (
    <WorkoutSelector programId={programId} onClose={() => setOpen(false)} />
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Workouts
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Workouts to Add</DialogTitle>
          </DialogHeader>
          {Content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" className="h-12 w-12 rounded-full fixed bottom-4 right-6 shadow-xl z-50 md:hidden bg-primary text-primary-foreground">
          <PlusCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Select Workouts</SheetTitle>
        </SheetHeader>
        {Content}
      </SheetContent>
    </Sheet>
  );
}