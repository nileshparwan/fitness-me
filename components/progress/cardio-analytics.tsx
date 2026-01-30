"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/database";
import { Activity, Map, Timer, Flame } from "lucide-react";

type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

export function CardioAnalytics({ logs }: { logs: CardioLog[] }) {
  if (!logs || logs.length === 0) return null;

  // Most recent log for "Current Status"
  const latest = logs[0];

  // Calculations for the selected period
  const totalDist = logs.reduce((acc, l) => acc + (l.distance_km || 0), 0);
  const totalDuration = logs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
  
  // Calculate average pace for the latest run (min/km)
  const latestPace = (latest.distance_km && latest.distance_km > 0) 
    ? latest.duration_minutes / latest.distance_km 
    : 0;

  // Format Pace (e.g., 5.5 min/km -> 5:30 min/km)
  const formatPace = (decimalMin: number) => {
    const min = Math.floor(decimalMin);
    const sec = Math.round((decimalMin - min) * 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Latest Distance */}
      <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-blue-900">Latest Distance</CardTitle>
          <Map className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-950">
            {latest.distance_km?.toFixed(2)} <span className="text-sm font-normal text-blue-600">km</span>
          </div>
          <p className="text-xs text-blue-600/80 mt-1">
            {new Date(latest.date).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
      
      {/* 2. Latest Pace */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Latest Pace</CardTitle>
          <Timer className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
             {formatPace(latestPace)} <span className="text-sm font-normal text-muted-foreground">/km</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
             Duration: {latest.duration_minutes} min
          </p>
        </CardContent>
      </Card>

      {/* 3. Average Heart Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Heart Rate</CardTitle>
          <Activity className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {latest.average_heart_rate ? latest.average_heart_rate : "—"} <span className="text-sm font-normal text-muted-foreground">bpm</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
             Intensity Zone analysis below
          </p>
        </CardContent>
      </Card>

      {/* 4. Total Volume (Period) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
          <Flame className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDist.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span></div>
          <p className="text-xs text-muted-foreground mt-1">
            Over {logs.length} sessions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}