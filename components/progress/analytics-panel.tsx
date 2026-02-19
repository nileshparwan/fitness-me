"use client";

import { Database } from "@/types/database";
import { Dumbbell, Zap, RotateCcw } from "lucide-react";
import { cn } from "@/utils";
import { LucideIcon } from "lucide-react";

type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
type StatTileProps = {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
  progress?: number;
};

export function AnalyticsPanel({ logs }: { logs: WorkoutLog[] }) {
  if (!logs || logs.length === 0) return null;

  const latest = logs[0]; 
  const currentMax = latest.calculated_1rm || 0;
  
  const latestVolume = (latest.weight || 0) * (latest.reps || 0);
  const bestVolume = Math.max(...logs.map(l => (l.weight || 0) * (l.reps || 0)));
  const volumePercentage = bestVolume ? (latestVolume / bestVolume) * 100 : 0;

  // Reusable Micro-Card Component
  const StatTile = ({ label, value, subtext, icon: Icon, colorClass, progress }: StatTileProps) => (
    <div className="flex flex-col justify-between p-3 rounded-xl border bg-card shadow-sm h-full min-h-[80px]">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-md bg-muted", colorClass)}>
           <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
      </div>
      
      <div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        
        {/* FIX: Replaced <Progress> component with a custom div structure to avoid TS Error */}
        {progress !== undefined && (
          <div className="h-1.5 w-full bg-muted rounded-full mt-2 overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", colorClass?.replace('text-', 'bg-'))} 
              style={{ width: `${Math.min(progress, 100)}%` }} 
            />
          </div>
        )}
        
        {subtext && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <StatTile 
        label="Est. 1RM" 
        value={`${currentMax} kg`} 
        subtext={`${latest.weight}kg x ${latest.reps}`}
        icon={Dumbbell}
        colorClass="text-primary bg-primary/10"
      />

      <StatTile 
        label="Volume" 
        value={`${latestVolume.toLocaleString()} kg`}
        progress={volumePercentage}
        subtext={`${volumePercentage.toFixed(0)}% of best`}
        icon={Zap}
        colorClass="text-yellow-600 bg-yellow-50"
      />

      <StatTile 
        label="Logged" 
        value={logs.length}
        subtext="Total Sets"
        icon={RotateCcw}
        colorClass="text-blue-600 bg-blue-50"
      />
    </div>
  );
}
