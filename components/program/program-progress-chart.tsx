"use client";

import * as React from "react";
import { 
  Area, 
  AreaChart, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  type ChartConfig 
} from "@/components/ui/chart";
import { format, subDays, isWithinInterval } from "date-fns";
import { Activity, Dumbbell, TrendingUp, Heart } from "lucide-react";

// --- Types ---
interface WorkoutLogSet {
  id: string;
  created_at: string | null;
  workout_id: string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  is_warmup: boolean | null;
  calculated_1rm: number | null;
  workouts: { name: string; date: string; } | null;
}

interface CardioLog {
  id: string;
  date: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  average_heart_rate: number | null;
}

const calculateEpley1RM = (weight: number, reps: number) => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

interface ChartProps {
  logs: WorkoutLogSet[];
  cardioLogs: CardioLog[];
}

const chartConfig = {
  volume: { label: "Volume", color: "hsl(var(--primary))" },
  strength: { label: "1RM", color: "#000" },
  rpe: { label: "RPE", color: "hsl(var(--muted-foreground))" },
  cardio: { label: "Distance", color: "#f97316" }, // Orange
  duration: { label: "Duration", color: "#3b82f6" }, // Blue
} satisfies ChartConfig;

export function ProgramProgressChart({ logs = [], cardioLogs = [] }: ChartProps) {
  const [timeRange, setTimeRange] = React.useState("all");
  const [activeTab, setActiveTab] = React.useState("volume");

  // --- 1. Strength Logic (Unchanged) ---
  const strengthData = React.useMemo(() => {
    if (!logs.length) return [];
    const sessions: Record<string, any> = {};

    logs.forEach((set) => {
      const rawDate = set.workouts?.date || set.created_at;
      if (!rawDate) return;
      
      const dateKey = format(new Date(rawDate), "yyyy-MM-dd");
      const sessionKey = `${dateKey}_${set.workout_id}`; 

      if (!sessions[sessionKey]) {
        sessions[sessionKey] = {
          date: new Date(rawDate),
          formattedDate: format(new Date(rawDate), "MMM d"),
          fullDate: format(new Date(rawDate), "PPP"),
          workoutName: set.workouts?.name || "Strength",
          totalVolume: 0,
          max1RM: 0,
          avgRPE: 0,
          rpeSum: 0,
          rpeCount: 0,
          workingSets: 0,
        };
      }

      const weight = set.weight || 0;
      const reps = set.reps || 0;

      if (!set.is_warmup) {
        sessions[sessionKey].totalVolume += weight * reps;
        sessions[sessionKey].workingSets += 1;
      }

      const e1RM = set.calculated_1rm || calculateEpley1RM(weight, reps);
      if (e1RM > sessions[sessionKey].max1RM) sessions[sessionKey].max1RM = e1RM;

      if (set.rpe) {
        sessions[sessionKey].rpeSum += set.rpe;
        sessions[sessionKey].rpeCount += 1;
      }
    });

    let processed = Object.values(sessions).map((s: any) => ({
      ...s,
      avgRPE: s.rpeCount > 0 ? parseFloat((s.rpeSum / s.rpeCount).toFixed(1)) : 0,
    }));

    processed.sort((a, b) => a.date.getTime() - b.date.getTime());

    const now = new Date();
    if (timeRange === "1m") processed = processed.filter(s => isWithinInterval(s.date, { start: subDays(now, 30), end: now }));
    else if (timeRange === "3m") processed = processed.filter(s => isWithinInterval(s.date, { start: subDays(now, 90), end: now }));

    return processed;
  }, [logs, timeRange]);

  // --- 2. Cardio Logic (Aggregates same-day sessions) ---
  const cardioData = React.useMemo(() => {
    if (!cardioLogs.length) return [];
    const sessions: Record<string, any> = {};

    cardioLogs.forEach((log) => {
      if (!log.date) return;
      const dateKey = format(new Date(log.date), "yyyy-MM-dd");

      if (!sessions[dateKey]) {
        sessions[dateKey] = {
          date: new Date(log.date),
          formattedDate: format(new Date(log.date), "MMM d"),
          fullDate: format(new Date(log.date), "PPP"),
          totalDuration: 0,
          totalDistance: 0,
          totalCalories: 0,
          activities: new Set(),
        };
      }
      sessions[dateKey].totalDuration += log.duration_minutes || 0;
      sessions[dateKey].totalDistance += log.distance_km || 0;
      sessions[dateKey].totalCalories += log.calories_burned || 0;
      sessions[dateKey].activities.add(log.activity_type);
    });

    let processed = Object.values(sessions).map((s: any) => ({
        ...s,
        activityLabel: Array.from(s.activities).join(", ")
    }));
    
    processed.sort((a, b) => a.date.getTime() - b.date.getTime());

    const now = new Date();
    if (timeRange === "1m") processed = processed.filter(s => isWithinInterval(s.date, { start: subDays(now, 30), end: now }));
    else if (timeRange === "3m") processed = processed.filter(s => isWithinInterval(s.date, { start: subDays(now, 90), end: now }));

    return processed;
  }, [cardioLogs, timeRange]);

  const axisStyle = { fontSize: 11, stroke: "#888888" };

  return (
    <Card className="w-full mb-8 shadow-sm border bg-card/50">
      <CardHeader className="p-4 md:p-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span>Performance Analytics</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Training load and intensity metrics.
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
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

      <CardContent className="p-4 md:p-6 pt-2">
        <Tabs defaultValue="volume" onValueChange={setActiveTab} className="space-y-4">
          
          <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/50">
            <TabsTrigger value="volume" className="text-xs py-2"><Dumbbell className="h-3.5 w-3.5 sm:mr-2" /><span className="hidden sm:inline">Volume</span></TabsTrigger>
            <TabsTrigger value="strength" className="text-xs py-2"><TrendingUp className="h-3.5 w-3.5 sm:mr-2" /><span className="hidden sm:inline">Max Strength</span></TabsTrigger>
            <TabsTrigger value="cardio" className="text-xs py-2"><Heart className="h-3.5 w-3.5 sm:mr-2" /><span className="hidden sm:inline">Cardio</span></TabsTrigger>
          </TabsList>

          <div className="h-[250px] md:h-[350px] w-full mt-4">
            
            {/* 1. VOLUME CHART (Unchanged) */}
            {activeTab === "volume" && (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <AreaChart data={strengthData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" {...axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis {...axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Area 
                    dataKey="totalVolume" 
                    type="monotone" 
                    fill={chartConfig.volume.color} 
                    fillOpacity={0.2} 
                    stroke={chartConfig.volume.color} 
                    strokeWidth={2}
                    connectNulls={true} 
                  />
                </AreaChart>
              </ChartContainer>
            )}

            {/* 2. STRENGTH CHART (Unchanged) */}
            {activeTab === "strength" && (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <LineChart data={strengthData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" {...axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis {...axisStyle} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                  <Line 
                    dataKey="max1RM" 
                    type="linear" 
                    stroke={chartConfig.strength.color} 
                    strokeWidth={2} 
                    dot={{ fill: chartConfig.strength.color, r: 4 }} 
                    activeDot={{ r: 6 }} 
                    connectNulls={true} 
                  />
                </LineChart>
              </ChartContainer>
            )}

            {/* 3. CARDIO CHART (UPDATED) */}
            {activeTab === "cardio" && (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={cardioData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" {...axisStyle} tickLine={false} axisLine={false} minTickGap={30} />
                  
                  {/* Left Axis: Duration (Min) - Controls the Bars */}
                  <YAxis yAxisId="left" {...axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}m`} />
                  
                  {/* Right Axis: Distance (Km) - Controls the Line */}
                  <YAxis yAxisId="right" orientation="right" {...axisStyle} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}km`} />
                  
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                  
                  {/* Bars for Duration */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="totalDuration" 
                    fill={chartConfig.duration.color} 
                    radius={[4, 4, 0, 0]} 
                    barSize={20} 
                    name="Duration"
                  />
                  
                  {/* Line for Distance - Added dots so single days are visible */}
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="totalDistance" 
                    stroke={chartConfig.cardio.color} 
                    strokeWidth={2}
                    dot={{ fill: chartConfig.cardio.color, r: 4, strokeWidth: 0 }} // Visible Dot
                    activeDot={{ r: 6 }} 
                    connectNulls={true} 
                    name="Distance"
                  />
                </BarChart>
              </ChartContainer>
            )}

            {/* EMPTY STATE */}
            {((activeTab === "volume" || activeTab === "strength") && !strengthData.length) || 
             (activeTab === "cardio" && !cardioData.length) ? (
              <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                <p className="text-sm">No logs found for this period.</p>
              </div>
            ) : null}

          </div>
        </Tabs>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t text-sm">
           {(activeTab === "volume" || activeTab === "strength") && (
             <>
               <StatBox label="Workouts" value={strengthData.length} />
               <StatBox label="Work Capacity" value={`${(strengthData.reduce((acc, c) => acc + c.totalVolume, 0) / 1000).toFixed(1)}k`} sub="kg" />
               <StatBox label="Peak 1RM" value={Math.max(...strengthData.map(c => c.max1RM), 0)} sub="kg" />
               <StatBox label="Avg Intensity" value={(strengthData.reduce((acc, c) => acc + c.avgRPE, 0) / (strengthData.length || 1)).toFixed(1)} sub="RPE" />
             </>
           )}
           {activeTab === "cardio" && (
             <>
               <StatBox label="Sessions" value={cardioData.length} />
               <StatBox label="Total Time" value={Math.round(cardioData.reduce((acc, c) => acc + c.totalDuration, 0) / 60)} sub="hrs" />
               <StatBox label="Total Dist" value={cardioData.reduce((acc, c) => acc + c.totalDistance, 0).toFixed(1)} sub="km" />
               <StatBox label="Output" value={`${(cardioData.reduce((acc, c) => acc + c.totalCalories, 0) / 1000).toFixed(1)}k`} sub="kcal" />
             </>
           )}
        </div>
      </CardContent>
    </Card>
  );
}

const StatBox = ({ label, value, sub }: { label: string, value: string | number, sub?: string }) => (
  <div className="bg-muted/20 p-2 rounded-lg text-center sm:text-left">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
    <p className="text-lg font-bold leading-none truncate">
      {value} <span className="text-[10px] font-normal text-muted-foreground">{sub}</span>
    </p>
  </div>
);