"use client";

import { Database } from "@/types/database";
import { Activity, Map, Timer, Flame } from "lucide-react";
import { cn } from "@/utils";
import { LucideIcon } from "lucide-react";
import { calculatePaceMinutesPerKm, formatPace } from "@/utils/fitness-logic";

type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];
type StatTileProps = {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
};

export function CardioAnalytics({ logs }: { logs: CardioLog[] }) {
  if (!logs || logs.length === 0) return null;

  const latest = logs[0];
  const totalDist = logs.reduce((acc, l) => acc + (l.distance_km || 0), 0);
  
  const latestPace = calculatePaceMinutesPerKm(latest.distance_km || 0, latest.duration_minutes || 0);

  // Reusable Micro-Card Component
  const StatTile = ({ label, value, subtext, icon: Icon, colorClass }: StatTileProps) => (
    <div className="flex h-full min-h-[88px] flex-col justify-between rounded-xl border bg-card p-3.5 shadow-sm sm:min-h-[80px] sm:p-3">
      <div className="mb-1 flex items-center gap-2">
        <div className={cn("p-1.5 rounded-md bg-muted", colorClass)}>
           <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      
      <div>
        <div className="text-lg font-bold leading-tight sm:text-[1.05rem]">{value}</div>
        {subtext && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
      <StatTile 
        label="Distance"
        value={`${latest.distance_km?.toFixed(2)} km`}
        subtext={new Date(latest.date).toLocaleDateString()}
        icon={Map}
        colorClass="text-blue-600 bg-blue-50"
      />
      
      <StatTile 
        label="Pace"
        value={`${formatPace(latestPace)} /km`}
        subtext={`${latest.duration_minutes} min duration`}
        icon={Timer}
        colorClass="text-green-600 bg-green-50"
      />

      <StatTile 
        label="Heart Rate"
        value={latest.average_heart_rate ? `${latest.average_heart_rate} bpm` : "—"}
        subtext="Avg. HR"
        icon={Activity}
        colorClass="text-red-600 bg-red-50"
      />

      <StatTile 
        label="Total Volume"
        value={`${totalDist.toFixed(1)} km`}
        subtext={`${logs.length} sessions total`}
        icon={Flame}
        colorClass="text-orange-600 bg-orange-50"
      />
    </div>
  );
}
