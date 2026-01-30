"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Database } from "@/types/database";
import { Dumbbell, Target, Zap, RotateCcw } from "lucide-react";

type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];

export function AnalyticsPanel({ logs }: { logs: WorkoutLog[] }) {
  if (!logs || logs.length === 0) return null;

  const latest = logs[0]; // Assumes sorted descending
  const currentMax = latest.calculated_1rm || 0;
  
  // Calculate Volume (Weight * Reps) for latest session
  const latestVolume = (latest.weight || 0) * (latest.reps || 0);
  
  // Find Best Volume in period
  const bestVolume = Math.max(...logs.map(l => (l.weight || 0) * (l.reps || 0)));
  const volumePercentage = bestVolume ? (latestVolume / bestVolume) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Est 1RM */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current 1RM</CardTitle>
          <Dumbbell className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentMax} kg</div>
          <p className="text-xs text-muted-foreground mt-1">
             Based on {latest.weight}kg x {latest.reps}
          </p>
        </CardContent>
      </Card>

      {/* 2. Volume Load */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Set Volume</CardTitle>
          <Zap className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestVolume.toLocaleString()} kg</div>
          <Progress value={volumePercentage} className="h-2 mt-2 bg-yellow-100 dark:bg-yellow-950" />
          <p className="text-xs text-muted-foreground mt-1">
            {volumePercentage.toFixed(0)}% of best set
          </p>
        </CardContent>
      </Card>

      {/* 3. Intensity / RPE */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Intensity (RPE)</CardTitle>
          <Target className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latest.rpe || "-"} <span className="text-sm font-normal text-muted-foreground">/ 10</span></div>
          <p className="text-xs text-muted-foreground mt-1">
             Last recorded exertion
          </p>
        </CardContent>
      </Card>

      {/* 4. Consistency */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Logged Sets</CardTitle>
          <RotateCcw className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{logs.length}</div>
          <p className="text-xs text-muted-foreground mt-1">Data points in period</p>
        </CardContent>
      </Card>
    </div>
  );
}