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
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

// Components
import { ProgramTimeline } from "./program-timeline";
import { LibrarySidebar } from "./library-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useProgramStore } from "@/stores/use-program-store";
import { addWorkoutsToProgram, updateProgramItemOrder } from "@/app/actions/program";
import { WorkoutPicker } from "../workout/workout-picker"; // Verify path

export function ProgramBuilder({ program, allWorkouts }: { program: any; allWorkouts: any[] }) {
  // 1. Connect to Store
  const { items, setItems, addItem, moveItem, isSidebarOpen, toggleSidebar } = useProgramStore();
  
  const [activeItem, setActiveItem] = useState<any>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // 2. Sync Initial DB Data to Store
  useEffect(() => {
    // Ensure we map any missing fields if necessary, though DB should provide them
    const sorted = program.program_items?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
    setItems(sorted);
  }, [program.program_items, setItems]);

  // 3. Filter Library: Hides workouts that are already in the timeline
  const availableWorkouts = allWorkouts.filter(
    (w) => !items.some((item) => item.workout_id === w.id)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- HANDLERS ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "library-item") {
      setActiveItem({ ...active.data.current.workout, source: "library" });
    } else {
      const item = items.find((i) => i.id === active.id);
      if (item) setActiveItem({ ...item, source: "program" });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    // SCENARIO 1: Drag FROM Library -> INTO Timeline
    if (active.data.current?.type === "library-item") {
      const isOverTimeline = over.id === 'timeline-container' || items.some(i => i.id === over.id);

      if (isOverTimeline) {
        const rawId = String(active.id).replace("lib::", "");
        const workoutData = active.data.current?.workout;
        const tempId = `temp-${Date.now()}`;
        
        // Add to Store (Instant UI update)
        addItem({
          id: tempId,
          workout_id: rawId,
          program_id: program.id,
          order_index: items.length,
          item_type: "workout",
          day_label: "New",
          workouts: workoutData,
        });

        // Sync with DB
        try {
          await addWorkoutsToProgram(program.id, [rawId]);
          toast.success("Added to program");
        } catch (error) {
          toast.error("Failed to save");
          // Optionally revert store here
        }
      }
      return;
    }

    // SCENARIO 2: Reordering
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      
      // 1. Update Store immediately (Optimistic UI)
      moveItem(oldIndex, newIndex);

      // 2. Prepare payload for DB
      // We must get the fresh state AFTER the move to calculate correct indices
      const freshItems = useProgramStore.getState().items;
      
      // --- FIX IS HERE ---
      // We map 'item_type' and 'day_label' so the Server Action accepts the data
      const updates = freshItems.map((item, index) => ({
        id: item.id,
        order_index: index,
        item_type: item.item_type || "workout", // Required by DB Not-Null constraint
        day_label: item.day_label,
      }));

      // 3. Call Server Action
      try {
        await updateProgramItemOrder(updates, program.id);
      } catch (error) {
        toast.error("Failed to save order");
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row h-[calc(100vh-12rem)] gap-6">
        
        {/* LEFT: TIMELINE */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between mb-4 flex-shrink-0">
             <div className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-lg">Timeline ({items.length})</h2>
             </div>
             {isDesktop && (
               <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                 {isSidebarOpen ? <PanelRightClose className="mr-2 h-4 w-4"/> : <PanelRightOpen className="mr-2 h-4 w-4"/>}
                 {isSidebarOpen ? "Hide Library" : "Show Library"}
               </Button>
             )}
          </header>

          <div className="flex-1 overflow-y-auto bg-muted/10 border rounded-xl p-2 md:p-4 scroll-smooth relative">
             <ProgramTimeline items={items} programId={program.id} />
             {!isDesktop && <div className="mt-8 flex justify-center pb-20"><WorkoutPicker programId={program.id} /></div>}
          </div>
        </div>

        {/* RIGHT: LIBRARY (Using Filtered Workouts) */}
        {isDesktop && isSidebarOpen && (
           <aside className="w-80 flex-shrink-0 flex flex-col border-l pl-6 animate-in slide-in-from-right-5 duration-200">
              <LibrarySidebar workouts={availableWorkouts} />
           </aside>
        )}
      </div>

      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) }}>
        {activeItem ? (
           <div className="w-[300px] cursor-grabbing">
              <Card className="p-4 bg-background border-primary shadow-2xl">
                 <span className="font-bold">
                    {activeItem.source === 'library' ? activeItem.name : activeItem.workouts?.name}
                 </span>
              </Card>
           </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
}