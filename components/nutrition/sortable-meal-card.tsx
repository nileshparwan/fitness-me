"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  GripVertical, MoreVertical, Trash2, Copy, Check, Circle, Pencil 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { EditMealDialog } from "./edit-meal-dialog";
import { CopyMealDialog } from "./copy-meal-dialog";

interface Props {
  meal: any;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: (id: string) => void;
  programs: any[];
}

export function SortableMealCard({ meal, isSelected, onSelect, onDelete, programs }: Props) {
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

  return (
    <div ref={setNodeRef} style={style} className="touch-none mb-2">
      <div className={`
        group flex items-center gap-0 bg-card border rounded-md overflow-hidden transition-all hover:border-primary/50
        ${meal.is_completed ? "bg-muted/30 opacity-70" : "bg-card shadow-sm"}
        ${isSelected ? "ring-2 ring-primary border-primary" : ""}
      `}>
        
        {/* 1. Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className={`
            w-8 flex items-center justify-center cursor-grab active:cursor-grabbing self-stretch border-r
            ${meal.is_completed ? "bg-muted" : "bg-muted/30 hover:bg-muted/60"}
          `}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* 2. Selection & Content Wrapper */}
        <div className="flex-1 flex items-center gap-3 p-2 min-w-0">
          
          {/* Selection Checkbox (Visible on hover or if selected) */}
          <div className="pl-1">
             <Checkbox 
                checked={isSelected} 
                onCheckedChange={(c) => onSelect(c as boolean)}
                className={isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-100 transition-opacity"}
             />
          </div>

          {/* Info Block */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
             <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase tracking-tight shrink-0 text-muted-foreground border-border">
                  {meal.meal_type.replace('_', ' ')}
                </Badge>
                <span className={`text-sm font-medium truncate ${meal.is_completed && 'line-through decoration-muted-foreground'}`}>
                  {meal.food_name}
                </span>
             </div>
             
             {/* Stats */}
             <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 sm:ml-auto">
                <span className="font-mono font-medium text-foreground">{meal.calories} kcal</span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline">{meal.protein_g}p {meal.carbs_g}c {meal.fats_g}f</span>
             </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
               {/* Fix for Missing Edit Text: 
                   We use the Dialog Trigger directly but ensure it has the styling of a Menu Item 
               */}
               <div onPointerDown={(e) => e.stopPropagation()} className="flex flex-col">
                  {/* EDIT - Wrapped to look like item */}
                  <EditMealDialog meal={meal} asMenuItem />
                  
                  {/* COPY - Existing logic */}
                  <CopyMealDialog meal={meal} programs={programs} />
               </div>
               
               <DropdownMenuSeparator />
               <DropdownMenuItem className="text-destructive text-xs focus:text-destructive" onClick={() => onDelete(meal.id)}>
                 <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </div>
  );
}