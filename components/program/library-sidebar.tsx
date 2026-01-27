"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function LibrarySidebar({ workouts }: { workouts: any[] }) {
  const [search, setSearch] = useState("");

  const filtered = workouts.filter((w) => {
    if (w.status === 'archived') return false;
    return w.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 space-y-2">
        <h3 className="font-semibold text-lg">Workout Library</h3>
        <div className="relative">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Search..." 
             className="pl-9"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-3 pb-4">
          {filtered.map((workout) => (
            <DraggableLibraryItem key={workout.id} workout={workout} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DraggableLibraryItem({ workout }: { workout: any }) {
  // FIX: Use a unique ID prefix so DnD-Kit doesn't confuse this with the sortable list
  const uniqueId = `lib::${workout.id}`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: uniqueId, 
    data: {
      type: "library-item", 
      workout, // Pass full workout data for the overlay
    },
  });

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 cursor-grab hover:border-primary transition-colors flex items-center gap-3 bg-card ${
        isDragging ? "opacity-40 ring-2 ring-primary" : ""
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{workout.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] h-4 px-1">{workout.status}</Badge>
          <span className="text-[10px] text-muted-foreground">{workout.duration_minutes || 0}m</span>
        </div>
      </div>
    </Card>
  );
}