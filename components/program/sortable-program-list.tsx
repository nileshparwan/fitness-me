"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical, Dumbbell, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { toast } from "sonner";
import Link from "next/link";
import { removeItemsFromProgram, updateProgramItemOrder } from "@/app/actions/program";

// ----------------------------------------------------------------------
// 1. The Draggable Item Component
// ----------------------------------------------------------------------
interface SortableItemProps {
  id: string;
  item: any;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function SortableItem({ id, item, isSelectMode, isSelected, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.3 : 1, // Dim the original item while dragging
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3 touch-none">
      <Card className={cn(
        "flex items-center p-3 gap-3 bg-card transition-all border",
        isSelected && "border-primary bg-primary/5",
        isDragging && "border-primary/50" // Style for the item left behind
      )}>
        
        {/* DRAG HANDLE or CHECKBOX */}
        <div className="flex-shrink-0">
          {isSelectMode ? (
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              checked={isSelected}
              onChange={() => onToggle(id)}
            />
          ) : (
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-md"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 min-w-[3rem] justify-center">
              {item.day_label || "Day " + (item.order_index + 1)}
            </Badge>
            <h4 className="font-semibold text-sm truncate">
              {item.workouts?.name || "Untitled Workout"}
            </h4>
          </div>
          <div className="text-xs text-muted-foreground flex gap-2 items-center">
            <Dumbbell className="h-3 w-3" />
            <span>{item.workouts?.duration_minutes || 0} min</span>
          </div>
        </div>

        {/* ACTION */}
        <Button variant="ghost" size="sm" asChild className="ml-auto h-8 text-xs">
          <Link href={`/workouts/${item.workout_id}`}>View</Link>
        </Button>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. The Drag Overlay (The "Ghost" item that follows your mouse/finger)
// ----------------------------------------------------------------------
function ItemOverlay({ item }: { item: any }) {
  if (!item) return null;
  return (
    <Card className="flex items-center p-3 gap-3 bg-background border-primary shadow-xl cursor-grabbing scale-105">
      <div className="p-2 -ml-2 text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] h-5">{item.day_label}</Badge>
          <h4 className="font-semibold text-sm truncate">{item.workouts?.name}</h4>
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------
// 3. The Main List Container
// ----------------------------------------------------------------------
export function SortableProgramList({ items, programId }: { items: any[], programId: string }) {
  const [localItems, setLocalItems] = useState(items);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<any | null>(null);

  // Sync local state when database fetches new data
  useEffect(() => { setLocalItems(items) }, [items]);

  // SENSORS:
  // PointerSensor with activationConstraint is CRITICAL for Mobile.
  // It ensures scrolling doesn't trigger a drag. You must move 8px to drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const item = localItems.find((i) => i.id === event.active.id);
    setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (over && active.id !== over.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Optimistic UI Update: Calculate new order indices
        const updates = newItems.map((item, index) => ({
          id: item.id,
          order_index: index,
        }));

        // Send to Server
        updateProgramItemOrder(updates, programId).catch(() => {
          toast.error("Failed to save order");
          setLocalItems(items); // Revert on failure
        });

        return newItems;
      });
    }
  };

  const handleBulkDelete = async () => {
    if(!confirm("Remove selected items from this program?")) return;
    try {
      await removeItemsFromProgram(selectedIds, programId);
      toast.success("Items removed");
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="pb-24">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between mb-4 bg-muted/30 p-2 rounded-lg border">
        <div className="text-sm font-medium px-2">
          {localItems.length} Workout{localItems.length !== 1 && 's'}
        </div>
        <div className="flex gap-2">
          {isSelectMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsSelectMode(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove ({selectedIds.length})
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsSelectMode(true)}>
              Edit / Select
            </Button>
          )}
        </div>
      </div>

      {/* DRAG CONTEXT */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]} // Force vertical movement only
      >
        <SortableContext 
          items={localItems.map((i) => i.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localItems.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                item={item}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.includes(item.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay (Visual Feedback) */}
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
          {activeItem ? <ItemOverlay item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}