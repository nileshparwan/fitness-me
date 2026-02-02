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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useExerciseMutations } from "@/hooks/use-exercise";
import { toast } from "sonner";

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
        toast.success("Exercise deleted");
      } catch (error) {
        toast.error("Failed to delete exercise");
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {/* Mobile Trigger with Primary Color & Larger Hit Area */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-primary bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl pb-8 px-2">
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Manage {exercise.name}</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-3">
          <SheetClose asChild>
            <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onEdit(exercise)}>
              <Pencil className="mr-3 h-4 w-4" /> Edit Details
            </Button>
          </SheetClose>

          <div className="my-1 border-t" />
          
          <SheetClose asChild>
            <Button variant="destructive" className="w-full justify-start h-12 text-base" onClick={handleDelete}>
              <Trash2 className="mr-3 h-4 w-4" /> Delete Exercise
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}