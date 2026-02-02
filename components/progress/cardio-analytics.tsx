"use client";

import { Database } from "@/types/database";
import { Activity, Map, Timer, Flame } from "lucide-react";
import { cn } from "@/utils";

type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

export function CardioAnalytics({ logs }: { logs: CardioLog[] }) {
  if (!logs || logs.length === 0) return null;

  const latest = logs[0];
  const totalDist = logs.reduce((acc, l) => acc + (l.distance_km || 0), 0);
  
  const latestPace = (latest.distance_km && latest.distance_km > 0) 
    ? latest.duration_minutes / latest.distance_km 
    : 0;

  const formatPace = (decimalMin: number) => {
    const min = Math.floor(decimalMin);
    const sec = Math.round((decimalMin - min) * 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Reusable Micro-Card Component
  const StatTile = ({ label, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="flex flex-col justify-between p-3 rounded-xl border bg-card shadow-sm h-full min-h-[80px]">
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("p-1.5 rounded-md bg-muted", colorClass)}>
           <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
      </div>
      
      <div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        {subtext && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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