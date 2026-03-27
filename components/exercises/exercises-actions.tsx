"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/app-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useExerciseMutations } from "@/hooks/use-exercise";

interface ExerciseActionsProps {
  exercise: any;
  onEdit: (exercise: any) => void;
}

export function ExerciseActions({ exercise, onEdit }: ExerciseActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { remove } = useExerciseMutations();

  const handleDelete = async () => {
    if (confirm("Delete this exercise?")) {
      try {
        await remove.mutateAsync(exercise.id);
      } catch {
        // Toast feedback is handled by the mutation layer.
      }
    }
  };

  if (isDesktop) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(exercise)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Mobile Trigger with Primary Color & Larger Hit Area */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent size={{ tablet: "md", desktop: "md" }} className="px-3 pb-8 sm:px-4">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle>Manage {exercise.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onEdit(exercise)}>
              <Pencil className="mr-3 h-4 w-4" /> Edit Details
            </Button>
          </DialogClose>

          <div className="my-1 border-t" />
          
          <DialogClose asChild>
            <Button variant="destructive" className="w-full justify-start h-12 text-base" onClick={handleDelete}>
              <Trash2 className="mr-3 h-4 w-4" /> Delete Exercise
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
