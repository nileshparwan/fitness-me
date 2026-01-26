"use client";

import * as React from "react";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Line, 
  ComposedChart,
  Bar,
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { Activity, Dumbbell, Flame, TrendingUp } from "lucide-react";

// --- Types based on your schema ---
interface WorkoutLogSet {
  id: string;
  created_at: string | null; // <--- Changed from string to string | null
  workout_id: string;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  is_warmup: boolean | null;
  calculated_1rm: number | null;
  workouts: {
    name: string;
  } | null; // Supabase joins can technically return null if relationship is broken
}

// --- Fitness Formulas ---
const calculateEpley1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export function ProgramProgressChart({ logs }: { logs: WorkoutLogSet[] }) {
  const [timeRange, setTimeRange] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("volume");

  // --- 1. Data Aggregation (Grouping Sets into Sessions) ---
  const chartData = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Group sets by "Session" (unique combination of date + workout_id)
    const sessions: Record<string, any> = {};

    logs.forEach((set) => {
      if (!set.created_at) return;
      
      // Create a unique key for the session (e.g., "2023-10-25_workoutUUID")
      const dateKey = format(new Date(set.created_at), "yyyy-MM-dd");
      const sessionKey = `${dateKey}_${set.workout_id}`;

      if (!sessions[sessionKey]) {
        sessions[sessionKey] = {
          date: new Date(set.created_at),
          formattedDate: format(new Date(set.created_at), "MMM d"),
          fullDate: format(new Date(set.created_at), "PPP"),
          workoutName: set.workouts?.name || "Unknown Workout",
          totalVolume: 0,
          max1RM: 0,
          totalRPE: 0,
          rpeCount: 0,
          workingSets: 0,
        };
      }

      // --- CALCULATIONS ---
      const weight = set.weight || 0;
      const reps = set.reps || 0;

      // 1. Volume Load (Ignore warmups for accurate hypertrophy tracking)
      if (!set.is_warmup) {
        sessions[sessionKey].totalVolume += weight * reps;
        sessions[sessionKey].workingSets += 1;
      }

      // 2. Estimated 1RM (Track Peak Strength)
      // We want the HIGHEST estimated 1RM achieved in this session
      const e1RM = set.calculated_1rm || calculateEpley1RM(weight, reps);
      if (e1RM > sessions[sessionKey].max1RM) {
        sessions[sessionKey].max1RM = e1RM;
      }

      // 3. RPE Stats
      if (set.rpe) {
        sessions[sessionKey].totalRPE += set.rpe;
        sessions[sessionKey].rpeCount += 1;
      }
    });

    // Convert object back to array and compute averages
    let processedData = Object.values(sessions).map((s: any) => ({
      ...s,
      avgRPE: s.rpeCount > 0 ? parseFloat((s.totalRPE / s.rpeCount).toFixed(1)) : 0,
    }));

    // Sort by Date
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filter by Time Range
    const now = new Date();
    if (timeRange === "1m") {
      processedData = processedData.filter(s => isWithinInterval(s.date, { start: subDays(now, 30), end: now }));
    } else if (timeRange === "3m") {
      processedData = processedData.filter(s => isWithinInterval(s.date, { start: subDays(now, 90), end: now }));
    }

    return processedData;
  }, [logs, timeRange]);

  // --- 2. Render Charts ---
  const renderChart = () => {
    if (activeTab === "volume") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="formattedDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip label="Volume Load" unit="kg" />} />
            <Area 
              type="monotone" 
              dataKey="totalVolume" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorVolume)" 
              name="Volume Load"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (activeTab === "strength") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="formattedDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 10]} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip label="Est. 1RM" unit="kg" secondLabel="Avg RPE" secondUnit="" />} />
            
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="max1RM" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              name="Max Strength (1RM)"
            />
            <Bar 
              yAxisId="right"
              dataKey="avgRPE"
              fill="hsl(var(--secondary))"
              opacity={0.3}
              radius={[4, 4, 0, 0]}
              barSize={20}
              name="Avg RPE"
            />
            <Legend verticalAlign="top" height={36}/>
          </ComposedChart>
        </ResponsiveContainer>
      );
    }
  };

  if (chartData.length === 0) return null;

  return (
    <Card className="w-full mb-8 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Progress & Analytics
            </CardTitle>
            <CardDescription>
              Performance trends based on your {logs.length} logged sets.
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">Last 30 Days</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="volume" onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="volume" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Volume (Hypertrophy)
            </TabsTrigger>
            <TabsTrigger value="strength" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Strength & RPE
            </TabsTrigger>
          </TabsList>
          
          <div className="h-[350px] w-full mt-4">
            {renderChart()}
          </div>
        </Tabs>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t text-sm">
           <div>
            <p className="text-muted-foreground">Total Workouts</p>
            <p className="text-xl font-bold">{chartData.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Volume</p>
            <p className="text-xl font-bold">{(chartData.reduce((acc, c) => acc + c.totalVolume, 0) / 1000).toFixed(1)}k <span className="text-xs font-normal text-muted-foreground">kg</span></p>
          </div>
           <div>
            <p className="text-muted-foreground">Highest 1RM</p>
            <p className="text-xl font-bold">{Math.max(...chartData.map(c => c.max1RM))} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Intensity</p>
            <p className="text-xl font-bold">{
               (chartData.reduce((acc, c) => acc + c.avgRPE, 0) / (chartData.filter(c => c.avgRPE > 0).length || 1)).toFixed(1)
            } <span className="text-xs font-normal text-muted-foreground">RPE</span></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Tooltip ---
const CustomTooltip = ({ active, payload, label, unit, label: mainLabel, secondLabel, secondUnit }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg text-xs ring-1 ring-black/5">
        <div className="font-bold mb-1 text-sm">{data.workoutName}</div>
        <div className="text-muted-foreground mb-3">{data.fullDate}</div>
        
        <div className="space-y-1.5">
          {/* Main Metric */}
          <div className="flex justify-between gap-6">
            <span className="text-primary font-medium flex items-center gap-1">
               {mainLabel === "Volume Load" ? <Dumbbell className="h-3 w-3"/> : <TrendingUp className="h-3 w-3"/>}
               {mainLabel}:
            </span>
            <span className="font-mono font-bold">{data[payload[0].dataKey].toLocaleString()} {unit}</span>
          </div>

          {/* Secondary Metric (if exists) */}
          {secondLabel && payload[1] && (
            <div className="flex justify-between gap-6">
              <span className="text-secondary font-medium flex items-center gap-1">
                 <Flame className="h-3 w-3"/> {secondLabel}:
              </span>
              <span className="font-mono font-bold">{data[payload[1].dataKey]} {secondUnit}</span>
            </div>
          )}

          {/* Working Sets Count */}
          <div className="pt-2 mt-2 border-t flex justify-between gap-6 text-muted-foreground">
             <span>Working Sets:</span>
             <span>{data.workingSets}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};