"use client";

import React from "react";
import { format } from "date-fns";
import { 
  Dumbbell, 
  Activity, 
  Calendar, 
  User, 
  Timer, 
  Flame, 
  Heart, 
  MapPin 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PrintViewProps {
  workout: {
    name: string;
    date: string;
    notes?: string | null;
    user?: { email: string } | null;
  };
  strengthLogs: any[];
  cardioLogs: any[];
}

export const WorkoutPrintView = React.forwardRef<HTMLDivElement, PrintViewProps>(
  ({ workout, strengthLogs, cardioLogs }, ref) => {
    
    // Grouping Logic
    const strengthGroups = groupBy(strengthLogs, "exercise_name");
    const cardioGroups = groupBy(cardioLogs, "activity_type");

    return (
      <div 
        ref={ref} 
        className="max-w-3xl mx-auto bg-card text-card-foreground min-h-screen p-8 md:p-12"
      >
        {/* --- HEADER --- */}
        <div className="space-y-6 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight uppercase">
                {workout.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> 
                  {format(new Date(workout.date), "PPP")}
                </span>
                {workout.user && (
                   <span className="flex items-center gap-1.5">
                     <User className="h-4 w-4" /> 
                     {workout.user.email?.split('@')[0]}
                   </span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs uppercase tracking-widest px-3 py-1">
              FitTrack Log
            </Badge>
          </div>

          {workout.notes && (
            <div className="bg-muted/50 border-l-4 border-primary/50 p-4 rounded-r-md text-sm italic text-muted-foreground">
              "{workout.notes}"
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* --- STRENGTH SECTION --- */}
        {strengthLogs.length > 0 && (
          <div className="mb-12 space-y-8">
            <div className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight text-primary">
              <Dumbbell className="h-6 w-6" /> 
              <h2>Strength Training</h2>
            </div>
            
            <div className="grid gap-8">
              {Object.entries(strengthGroups).map(([name, sets]: [string, any]) => (
                <div key={name} className="break-inside-avoid rounded-lg border bg-card shadow-sm overflow-hidden">
                  <div className="bg-muted/30 px-4 py-3 border-b">
                    <h3 className="font-bold text-lg">{name}</h3>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider border-b">
                        <th className="px-4 py-2 w-16">Set</th>
                        <th className="px-4 py-2">Weight</th>
                        <th className="px-4 py-2">Reps</th>
                        <th className="px-4 py-2 text-right">RPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sets.map((set: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-muted-foreground">#{set.set_number}</td>
                          <td className="px-4 py-3 font-bold">
                            {set.weight} <span className="text-xs font-normal text-muted-foreground">kg</span>
                          </td>
                          <td className="px-4 py-3">{set.reps}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {set.rpe || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- CARDIO SECTION --- */}
        {cardioLogs.length > 0 && (
          <div className="mb-12 space-y-8 break-inside-avoid">
             <div className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight text-blue-600 dark:text-blue-400">
              <Activity className="h-6 w-6" /> 
              <h2>Cardio Session</h2>
            </div>
            
            <div className="grid gap-8">
              {Object.entries(cardioGroups).map(([activity, logs]: [string, any]) => (
                <div key={activity} className="break-inside-avoid rounded-lg border bg-card shadow-sm overflow-hidden">
                   <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3 border-b border-blue-100 dark:border-blue-900/50">
                    <h3 className="font-bold text-lg">{activity}</h3>
                  </div>
                  
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider border-b">
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2">Distance</th>
                        <th className="px-4 py-2">Calories Burned</th>
                        <th className="px-4 py-2 text-right">Avg HR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log: any, i: number) => (
                        <tr key={i} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3 font-bold flex items-center gap-2">
                             <Timer className="h-3 w-3 text-muted-foreground" />
                             {log.duration_minutes} <span className="text-xs font-normal text-muted-foreground">min</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                             {log.distance_km ? (
                               <span className="flex items-center gap-2 text-foreground">
                                 <MapPin className="h-3 w-3 text-blue-500" /> {log.distance_km} km
                               </span>
                             ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                             {log.calories_burned ? (
                               <span className="flex items-center gap-2 text-foreground">
                                 <Flame className="h-3 w-3 text-orange-500" /> {log.calories_burned} kcal
                               </span>
                             ) : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                             {log.average_heart_rate ? (
                               <span className="flex items-center justify-end gap-2">
                                 {log.average_heart_rate} <Heart className="h-3 w-3 text-red-500" />
                               </span>
                             ) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- FOOTER --- */}
        <div className="mt-20 pt-8 border-t text-center space-y-2">
           <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
             Generated by
           </div>
           <div className="text-sm font-bold text-foreground">FitTrack</div>
        </div>
      </div>
    );
  }
);
WorkoutPrintView.displayName = "WorkoutPrintView";

function groupBy(array: any[], key: string) {
  return array.reduce((result: any, currentValue: any) => {
    const groupKey = currentValue[key] || "Other";
    (result[groupKey] = result[groupKey] || []).push(currentValue);
    return result;
  }, {});
}