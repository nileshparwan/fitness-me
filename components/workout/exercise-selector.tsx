"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExercises } from "@/hooks/use-exercise";

interface ExerciseSelectorProps {
  onSelect: (exercise: { id: string; name: string }) => void;
}

export function ExerciseSelector({ onSelect }: ExerciseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: exercises, isLoading } = useExercises(search);

  const handleSelect = (ex: any) => {
    onSelect({ id: ex.id, name: ex.name });
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Add Exercise
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>
        <div className="p-2">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : exercises?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No exercises found.</div>
            ) : (
              <div className="space-y-1">
                {exercises?.map((ex) => (
                  <Button
                    key={ex.id}
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => handleSelect(ex)}
                  >
                    <div className="flex flex-col items-start">
                      <span>{ex.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{ex.muscle_groups?.[0]}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}