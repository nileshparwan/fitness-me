"use client";

import { useState, useEffect } from "react"; 
import Link from "next/link";
import { Calendar, Clock, Dumbbell, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { WorkoutStatusSelect } from "@/components/workout/workout-status-select"; 
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['training_sessions']['Row'] & {
  strength_sets: Database['public']['Tables']['strength_sets']['Row'][];
};

interface WorkoutCardProps {
  workout: Workout; 
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const [currentStatus, setCurrentStatus] = useState(workout.status || "draft");

  useEffect(() => {
    setCurrentStatus(workout.status || "draft");
  }, [workout.status]);

  const dateObj = typeof workout.date === 'string' ? new Date(workout.date) : workout.date;

  // Refined Color Palette for the Status Badge/Border
  const getStatusStyles = (s: string) => {
    switch (s) {
      case "active": return { border: "border-blue-500", badge: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" };
      case "completed": return { border: "border-green-500", badge: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" };
      case "archived": return { border: "border-stone-400", badge: "bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-200" };
      default: return { border: "border-amber-400", badge: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" }; 
    }
  };

  const styles = getStatusStyles(currentStatus);

  return (
    <div className="group h-full">
      <Link href={`/workouts/${workout.id}`} className="block h-full">
        <Card className={cn(
          "relative h-full transition-all duration-200 hover:shadow-lg cursor-pointer overflow-hidden",
          "border-l-[4px] bg-card rounded-2xl", 
          styles.border
        )}>
          <CardContent className="p-0 flex flex-col h-full">
            
            {/* TOP ROW: Date & Status */}
            {/* Putting status here ensures it never overlaps the title */}
            <div className="flex items-center justify-between px-3.5 pb-1 pt-3.5 sm:p-4 sm:pb-1">
              <div className="flex items-center text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wider">
                <Calendar className="mr-1.5 h-3 w-3" />
                {format(dateObj, "MMM d")}
              </div>

              <div 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} 
                className="relative z-10"
              >
                <WorkoutStatusSelect 
                  workoutId={workout.id} 
                  status={currentStatus}
                  className={cn("h-5 text-[10px] px-2 font-medium border shadow-none", styles.badge)}
                  onStatusChange={(newStatus) => setCurrentStatus(newStatus)}
                />
              </div>
            </div>

            {/* MIDDLE: Title */}
            {/* Full width available now. min-h ensures consistent card height alignment */}
            <div className="flex-1 px-3.5 py-2 sm:px-4">
              <h3 className="font-bold text-base leading-tight text-foreground line-clamp-2" title={workout.name}>
                {workout.name}
              </h3>
            </div>
            
            {/* BOTTOM: Stats Footer */}
            {/* Uses a subtle background to ground the card */}
            <div className="mt-3 flex items-center justify-between border-t bg-muted/25 px-3.5 py-3 text-xs text-muted-foreground sm:px-4">
               <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{workout.duration_minutes || "--"} min</span>
               </div>
               <div className="h-3 w-px bg-border" /> {/* Divider */}
               <div className="flex items-center gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5" />
                  <span>{workout.strength_sets?.length || 0} Exercises</span>
               </div>
            </div>

          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
