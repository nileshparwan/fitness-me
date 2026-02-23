"use client";

import { useState, useEffect } from "react"; 
import Link from "next/link";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
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

  // Compact status styles to match program/meal-plan card language.
  const getStatusStyles = (s: string) => {
    switch (s) {
      case "active":
        return { badge: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" };
      case "completed":
        return { badge: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" };
      case "archived":
        return { badge: "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200" };
      default:
        return { badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" };
    }
  };

  const styles = getStatusStyles(currentStatus);
  const dateLabel = format(dateObj, "MMM d");

  return (
    <div className="h-full">
      <Link href={`/workouts/${workout.id}`} className="block h-full">
        <Card className={cn(
          "group relative h-[130px] w-[200px] shrink-0 overflow-hidden border border-border bg-card py-0 md:py-0 transition-all duration-200",
          "hover:border-primary/50 hover:shadow-md"
        )}>
          <CardContent className="flex h-full flex-col p-3">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/20 dark:text-sky-500">
                <Dumbbell className="h-4 w-4" />
              </div>

              <div 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} 
                className="relative z-10"
              >
                <WorkoutStatusSelect 
                  workoutId={workout.id} 
                  status={currentStatus}
                  className={cn(
                    "h-5 min-w-[68px] border px-1 text-[9px] font-medium shadow-none",
                    styles.badge
                  )}
                  onStatusChange={(newStatus) => setCurrentStatus(newStatus)}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h3 className="truncate text-sm font-semibold leading-tight text-foreground" title={workout.name}>
                {workout.name}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {dateLabel}
              </p>
            </div>

            <div className="mt-2 flex items-center justify-between border-t pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
               <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{workout.duration_minutes || "--"}m</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <Dumbbell className="h-3 w-3" />
                  <span>{workout.strength_sets?.length || 0} items</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
