"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, MoreVertical, Trash2, Copy, Pencil 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";

// Import components
import { EditMealDialog } from "./edit-meal-dialog";
import { CopyMealDialog } from "./copy-meal-dialog";
import { NutritionMeal, ProgramSummary } from "@/types/nutrition";

interface Props {
  meal: NutritionMeal;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: (id: string) => void;
  programs: ProgramSummary[];
}

export function SortableMealCard({ meal, isSelected, onSelect, onDelete, programs }: Props) {
  // 1. STATE MANAGEMENT: The card controls the visibility
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: meal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
    position: "relative" as const,
  };

  const displayType = (meal.meal_type || "meal").replace(/_/g, ' ');

  return (
    <>
      {/* 2. RENDER DIALOGS: Hidden until state changes */}
      <CopyMealDialog 
        meal={meal} 
        programs={programs} 
        open={isCopyOpen} 
        onOpenChange={setIsCopyOpen} 
      />
      
      <EditMealDialog 
        meal={meal} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <div ref={setNodeRef} style={style} className="touch-none mb-2">
        <div className={`
          group flex items-center gap-0 bg-card border rounded-md overflow-hidden transition-all hover:border-primary/50
          ${isSelected ? "ring-2 ring-primary border-primary" : "bg-card shadow-sm"}
        `}>
          
          <div 
            {...attributes} 
            {...listeners} 
            className="w-8 flex items-center justify-center cursor-grab active:cursor-grabbing self-stretch border-r bg-muted/30 hover:bg-muted/60"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 flex items-center gap-3 p-2 min-w-0">
            <div className="pl-1">
              <Checkbox 
                  checked={isSelected} 
                  onCheckedChange={(c) => onSelect(c as boolean)}
                  className={isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100 transition-opacity"}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase tracking-tight shrink-0 text-muted-foreground border-border">
                    {displayType}
                  </Badge>
                  <span className="text-sm font-medium truncate">
                    {meal.food_name}
                  </span>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 sm:ml-auto">
                  <span className="font-mono font-medium text-foreground">{meal.calories ?? 0} kcal</span>
                  <span className="hidden xs:inline">•</span>
                  <span className="hidden xs:inline">
                      {meal.protein_g ?? 0}p {meal.carbs_g ?? 0}c {meal.fats_g ?? 0}f
                  </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                
                {/* 3. TRIGGERS: Simple menu items that update state */}
                
                <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Details
                </DropdownMenuItem>

                <DropdownMenuItem onSelect={() => setIsCopyOpen(true)}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy / Move
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem className="text-destructive text-xs focus:text-destructive" onClick={() => onDelete(meal.id)}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </div>
    </>
  );
}