"use client";

import { useState, useEffect } from "react"; // Import useState
import Link from "next/link";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils";
import { WorkoutStatusSelect } from "@/components/workout/workout-status-select"; 

interface WorkoutCardProps {
  workout: {
    id: string;
    name: string;
    status: string | null;
    date: string | Date;
    duration_minutes: number | null;
    workout_logs: any[];
  };
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  // 1. STATE: Track status locally so UI updates instantly
  const [currentStatus, setCurrentStatus] = useState(workout.status || "draft");

  // Sync state if prop changes (e.g. after router.refresh brings new server data)
  useEffect(() => {
    setCurrentStatus(workout.status || "draft");
  }, [workout.status]);

  const dateObj = typeof workout.date === 'string' ? new Date(workout.date) : workout.date;

  // 2. LOGIC: Use 'currentStatus' (State) instead of 'workout.status' (Prop)
  const getStatusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
      case "completed": return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
      case "archived": return "bg-stone-100 text-stone-600 hover:bg-stone-200 border-stone-200";
      default: return "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200"; 
    }
  };

  const borderColor = 
    currentStatus === 'active' ? "border-l-blue-500" :
    currentStatus === 'completed' ? "border-l-green-500" :
    currentStatus === 'archived' ? "border-l-stone-400" :
    "border-l-yellow-400";

  return (
    <div className="relative group h-full">
      <Link href={`/workouts/${workout.id}`} className="block h-full">
        <Card className={cn(
          "hover:bg-muted/50 transition-all duration-200 cursor-pointer h-full border-l-4",
          borderColor // This now updates instantly
        )}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-bold truncate pr-2 leading-tight">
              {workout.name}
            </CardTitle>
            
            <div 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="z-20 relative -mt-1 -mr-2"
            >
              {/* 3. PASS STATE UPDATER */}
              <WorkoutStatusSelect 
                workoutId={workout.id} 
                status={currentStatus}
                className={cn("border", getStatusColor(currentStatus))}
                onStatusChange={(newStatus) => setCurrentStatus(newStatus)}
              />
            </div>
          </CardHeader>
          
          <CardContent>
             {/* ... content remains the same ... */}
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Calendar className="mr-2 h-3 w-3 opacity-70" />
              {format(dateObj, "PPP")}
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{workout.duration_minutes || "--"}m</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Dumbbell className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium">{workout.workout_logs?.length || 0} Ex</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}