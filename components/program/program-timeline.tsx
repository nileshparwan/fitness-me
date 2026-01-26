"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  SortableContext, 
  rectSortingStrategy, // <--- CHANGED: Must use 'rect' for grids
  useSortable 
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core"; 
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Clock, Dumbbell, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils"; 
import { toast } from "sonner";
import { useProgramStore } from "@/stores/use-program-store";
import { removeItemsFromProgram } from "@/app/actions/program";

export function ProgramTimeline({ items, programId }: { items: any[], programId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'timeline-container',
    data: { type: 'container' } 
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "min-h-[400px] rounded-xl transition-all duration-200 p-2",
        isOver ? "bg-primary/5 border-2 border-dashed border-primary" : "bg-transparent border-2 border-transparent"
      )}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        {/* CHANGED: Used Grid Layout instead of space-y */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24 lg:pb-0">
          
          {items.length === 0 && !isOver && (
             // Span full width when empty
             <div className="col-span-1 md:col-span-2 h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                <Plus className="h-8 w-8 mb-2 opacity-50" />
                <p>Drag workouts here</p>
             </div>
          )}

          {items.map((item, index) => (
            <TimelineItem key={item.id} item={item} index={index} programId={programId} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function TimelineItem({ item, index, programId }: any) {
  const router = useRouter();
  const { removeItem } = useProgramStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const exerciseCount = item.workouts?.workout_logs?.[0]?.count 
    ?? item.workouts?.workout_logs?.length 
    ?? 0;

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    // if(!confirm("Remove this workout?")) return;
    
    removeItem(item.id);
    
    try {
      await removeItemsFromProgram([item.id], programId);
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleCardClick = () => {
    if (!isDragging) {
      router.push(`/workouts/${item.workout_id}`);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative touch-none group h-full">
      <Card 
        onClick={handleCardClick}
        className={cn(
          "flex flex-col p-3 gap-2 transition-all cursor-pointer border hover:border-primary/50 hover:shadow-sm h-[150px]",
          isDragging ? "shadow-xl ring-1 ring-primary bg-background scale-105" : "bg-card"
        )}
      >
        {/* Header Row: Handle + Title + Delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
             {/* Handle */}
             <div 
               {...attributes} 
               {...listeners} 
               onClick={(e) => e.stopPropagation()} 
               className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors shrink-0"
             >
                <GripVertical className="h-4 w-4" />
             </div>
             
             {/* Title */}
             <h4 {...attributes} 
               {...listeners} 
               onClick={(e) => e.stopPropagation()}
               className="font-medium text-sm truncate leading-tight pt-0.5">
                {item.workouts?.name}
             </h4>
          </div>

          {/* Delete (Desktop) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex shrink-0 -mr-1"
            onClick={handleRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Metadata Row (Bottom) */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
            <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px] font-normal h-5">
              {item.day_label === "Unscheduled" ? `Day ${index + 1}` : item.day_label}
            </Badge>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{item.workouts?.duration_minutes || 45}m</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              <span>{exerciseCount} Ex</span>
            </div>
        </div>

        {/* Mobile Delete Button (Bottom Right absolute or distinct row) */}
        {/* Kept hidden on desktop, visible on mobile bottom right if preferred, 
            but for cleaner grid, usually top right or swipe is best. 
            Here we just render it standard for mobile. */}
         <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 absolute top-2 right-2 text-red-600 hover:text-destructive md:hidden"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
      </Card>
    </div>
  );
}