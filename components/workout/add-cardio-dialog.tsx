"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Activity, Plus } from "lucide-react";
import { CardioLogForm } from "./cardio-log-form";
import { useRouter } from "next/navigation";

export function AddCardioDialog({ workoutId }: { workoutId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh(); // Refresh page to show new log
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Add Cardio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Cardio Session</DialogTitle>
        </DialogHeader>
        <CardioLogForm 
          workoutId={workoutId} 
          onSuccess={handleSuccess} 
          onCancel={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}