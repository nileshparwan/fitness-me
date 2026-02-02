"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Clock, Dumbbell, ChevronRight } from "lucide-react";
import { cn } from "@/utils";
import { WorkoutStatusSelect } from "@/components/workout/workout-status-select";

interface WorkoutListItemProps {
  workout: {
    id: string;
    name: string;
    status: string | null;
    date: string | Date;
    duration_minutes: number | null;
    workout_logs: any[];
  };
}

export function WorkoutListItem({ workout }: WorkoutListItemProps) {
  const [currentStatus, setCurrentStatus] = useState(workout.status || "draft");

  useEffect(() => {
    setCurrentStatus(workout.status || "draft");
  }, [workout.status]);

  const dateObj = typeof workout.date === 'string' ? new Date(workout.date) : workout.date;

  const getStatusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed": return "bg-green-100 text-green-700 border-green-200";
      case "archived": return "bg-stone-100 text-stone-600 border-stone-200";
      default: return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/5 transition-all shadow-sm">
      
      {/* Date Badge */}
      <Link href={`/workouts/${workout.id}`} className="shrink-0">
        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg border bg-muted/20">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/80 leading-none">
            {format(dateObj, "MMM")}
          </span>
          <span className="text-xl font-bold leading-none tracking-tight mt-0.5">
            {format(dateObj, "d")}
          </span>
        </div>
      </Link>

      {/* Main Info (Clickable) */}
      <Link href={`/workouts/${workout.id}`} className="flex-1 min-w-0">
        <div className="mb-1">
           <h3 className="font-semibold text-base truncate leading-none">{workout.name}</h3>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {workout.duration_minutes || 0}m
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="h-3 w-3" /> {workout.workout_logs?.length || 0} Ex
          </span>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Status Select */}
        <div onClick={(e) => e.preventDefault()}>
            <WorkoutStatusSelect
                workoutId={workout.id}
                status={currentStatus}
                className={cn("h-8 text-[10px] w-[90px] border-0 font-semibold", getStatusColor(currentStatus))}
                onStatusChange={setCurrentStatus}
            />
        </div>
      </div>
    </div>
  );
}