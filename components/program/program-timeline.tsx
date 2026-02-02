"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
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
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['workouts']['Row'];

interface UIProgramItem {
  id: string;
  program_id?: string;
  workout_id?: string | null;
  order_index?: number | null;
  day_label?: string | null;
  item_type?: string;
  workouts?: Workout | null;
  created_at?: string | null;
  nutrition_log_id?: string | null;
}

export function ProgramTimeline({ items, programId }: { items: UIProgramItem[], programId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'timeline-container',
    data: { type: 'container' } 
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "min-h-[200px] h-full transition-all duration-200",
        isOver ? "bg-primary/5 ring-2 ring-primary ring-inset rounded-lg" : ""
      )}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {items.length === 0 && !isOver && (
             <div className="col-span-1 md:col-span-2 h-40 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                <Plus className="h-8 w-8 mb-2 opacity-50" />
                <p>Drag workouts here from the library</p>
             </div>
          )}

          {items.map((item, index) => (
            <TimelineItem 
              key={item.id} 
              item={item} 
              index={index} 
              programId={programId} 
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

const TimelineItem = memo(function TimelineItem({ item, index, programId }: { item: UIProgramItem, index: number, programId: string }) {
  const router = useRouter();
  const { removeItem } = useProgramStore();
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  // @ts-ignore 
  const exerciseCount = item.workouts?.workout_logs?.[0]?.count ?? 0;

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();   // Prevent default link behavior
    e.stopPropagation();  // Stop bubbling to Card click
    
    // 1. Optimistic Update
    removeItem(item.id);
    
    try {
      // 2. Server Update
      await removeItemsFromProgram([item.id], programId);
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
      // Ideally, you would revert the optimistic update here if needed
    }
  };

  const handleCardClick = () => {
    if (!isDragging && item.workout_id) {
      router.push(`/workouts/${item.workout_id}`);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative touch-none h-full group">
      <Card 
        onClick={handleCardClick}
        className={cn(
          "flex flex-col p-3 gap-2 transition-all cursor-pointer border hover:border-primary/50 hover:shadow-sm h-full min-h-[140px]",
          isDragging ? "shadow-xl ring-1 ring-primary bg-background scale-[1.02]" : "bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Drag Handle & Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
             <div 
               {...attributes} 
               {...listeners} 
               onClick={(e) => e.stopPropagation()} 
               className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 rounded-md text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-colors shrink-0"
             >
                <GripVertical className="h-5 w-5" />
             </div>
             
             <h4 className="font-medium text-sm leading-tight pt-0.5 line-clamp-2 select-none">
                {item.workouts?.name || "Untitled Workout"}
             </h4>
          </div>

          {/* Delete Button - VISIBLE ON ALL SCREENS */}
          {/* Increased hit area and z-index to ensure it captures clicks over drag events */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0 relative z-10 -mr-1"
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Footer Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
            <Badge variant="secondary" className="rounded-sm px-1.5 py-0 text-[10px] font-normal h-5 shrink-0">
              {item.day_label === "Unscheduled" ? `Day ${index + 1}` : item.day_label}
            </Badge>
            
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              <span>{item.workouts?.duration_minutes || 45}m</span>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <Dumbbell className="h-3 w-3" />
              <span>{exerciseCount} Ex</span>
            </div>
        </div>
      </Card>
    </div>
  );
});