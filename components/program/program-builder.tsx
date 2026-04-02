"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  rectIntersection, // Use strict intersection for better drop detection
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMediaQuery } from "@/hooks/use-media-query";

import { ProgramTimeline } from "./program-timeline";
import { LibrarySidebar } from "./library-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useProgramStore } from "@/stores/use-program-store";
import { addWorkoutsToProgram, updateProgramItemOrder } from "@/app/actions/program";
import { WorkoutPicker } from "../workout/workout-picker";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['workouts']['Row'];
type Program = Database['public']['Tables']['programs']['Row'];
type ProgramItem = Database['public']['Tables']['program_workouts']['Row'] & {
  workouts: Workout | null;
};

type ProgramWithDetails = Program & {
  program_workouts: ProgramItem[];
};

interface ProgramBuilderProps {
  program: ProgramWithDetails;
  allWorkouts: Workout[];
}

export function ProgramBuilder({ program, allWorkouts }: ProgramBuilderProps) {
  const { items, setItems, addItem, moveItem, isSidebarOpen, toggleSidebar } = useProgramStore();
  
  // Mixed type for drag item
  const [activeItem, setActiveItem] = useState<(Workout & { source: 'library' }) | (ProgramItem & { source: 'program'; name?: string }) | null>(null);
  
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => {
    const sorted = program.program_workouts?.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)) || [];
    setItems(sorted as any); 
  }, [program.program_workouts, setItems]);

  const availableWorkouts = allWorkouts.filter(
    (w) => !items.some((item) => item.workout_id === w.id)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "library-item") {
      setActiveItem({ ...active.data.current.workout, source: "library" });
    } else {
      const item = items.find((i) => i.id === active.id);
      if (item) {
         // @ts-ignore
         setActiveItem({ ...item, source: "program", name: item.workouts?.name });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    if (active.data.current?.type === "library-item") {
      const isOverTimeline = over.id === 'timeline-container' || items.some(i => i.id === over.id);

      if (isOverTimeline) {
        const rawId = String(active.id).replace("lib::", "");
        const workoutData = active.data.current?.workout;
        const tempId = `temp-${Date.now()}`;
        
        addItem({
          id: tempId,
          workout_id: rawId,
          program_id: program.id,
          order_index: items.length,
          item_type: "workout",
          day_label: "New",
          workouts: workoutData,
        });

        await withToastFeedback(addWorkoutsToProgram(program.id, [rawId]), {
          loading: "Adding workout...",
          success: "Added to program",
          error: "Failed to save",
        }).catch(() => null);
      }
      return;
    }

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      
      moveItem(oldIndex, newIndex);

      const freshItems = useProgramStore.getState().items;
      
      const updates = freshItems.map((item, index) => ({
        id: item.id,
        order_index: index,
        item_type: item.item_type || "workout",
        day_label: item.day_label,
      }));

      await withToastFeedback(updateProgramItemOrder(updates, program.id), {
        loading: "Saving program order...",
        success: "Program order saved",
        error: "Failed to save order",
      }).catch(() => null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection} // Strict intersection prevents accidental drops
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* LAYOUT FIX: 
        1. overflow-hidden on parent enforces the calculated height.
        2. gap-6 adds spacing between columns.
      */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-14rem)] gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: TIMELINE */}
        {/* min-h-0 is CRITICAL for flex children to scroll properly */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-background rounded-xl border overflow-hidden">
          
          <header className="flex items-center justify-between p-3 border-b bg-muted/20 flex-shrink-0">
             <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-sm md:text-base">Timeline ({items.length})</h2>
             </div>
             {isDesktop && (
               <Button variant="ghost" size="sm" onClick={toggleSidebar} className="h-8 text-xs">
                 {isSidebarOpen ? <PanelRightClose className="mr-2 h-3 w-3"/> : <PanelRightOpen className="mr-2 h-3 w-3"/>}
                 {isSidebarOpen ? "Hide Library" : "Show Library"}
               </Button>
             )}
          </header>

          {/* SCROLL CONTAINER: 
            1. flex-1 fills remaining space.
            2. overflow-y-auto enables the scrollbar.
            3. relative ensures DnD positioning works.
          */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 scroll-smooth relative bg-muted/10">
             <ProgramTimeline items={items} programId={program.id} />
             
             {!isDesktop && (
                <div className="mt-8 flex justify-center pb-10">
                   <WorkoutPicker programId={program.id} />
                </div>
             )}
          </div>
        </div>

        {/* RIGHT COLUMN: LIBRARY */}
        {isDesktop && isSidebarOpen && (
           <aside className="w-80 flex-shrink-0 flex flex-col border rounded-xl overflow-hidden animate-in slide-in-from-right-5 duration-200">
              <div className="flex-1 overflow-hidden h-full bg-background">
                 <LibrarySidebar workouts={availableWorkouts} />
              </div>
           </aside>
        )}
      </div>

      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
        {activeItem ? (
           <div className="w-[300px] cursor-grabbing">
              <Card className="p-4 bg-background border-primary shadow-2xl">
                 <span className="font-bold">
                    {/* @ts-ignore */}
                    {activeItem.source === 'library' ? activeItem.name : activeItem.workouts?.name || activeItem.name}
                 </span>
              </Card>
           </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
}
