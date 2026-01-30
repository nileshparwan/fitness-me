"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database } from "@/types/database";

type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];

interface Props {
  logs: WorkoutLogRow[];
  exerciseName: string;
}

export function AdvancedCoach({ logs, exerciseName }: Props) {
  if (!logs || logs.length === 0) return null;

  // 1. Sort logs by date (descending)
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
  );

  // 2. Get Last Session Data
  const lastLogDate = sortedLogs[0].created_at?.split("T")[0];
  const lastSessionLogs = sortedLogs.filter(l => l.created_at?.startsWith(lastLogDate || ""));

  // 3. Calculate Metrics
  const lastSessionMax = Math.max(...lastSessionLogs.map(l => l.weight || 0));
  const lastSessionRPE = lastSessionLogs.reduce((acc, l) => acc + (l.rpe || 0), 0) / lastSessionLogs.length;
  
  // 4. GENERATE RECOMMENDATION
  // Adjusted thresholds to match your seed data's intensity
  let nextLoad = lastSessionMax;
  let advice = "";
  let statusColor = "";

  if (lastSessionRPE >= 8.0) { 
    // High Intensity (RPE 8+) -> Recommend small deload/reset (-4kg approx)
    nextLoad = lastSessionMax - 4; 
    advice = "Intensity was high. Resetting load to build momentum.";
    statusColor = "text-orange-500";
  } else if (lastSessionRPE < 6.5) {
    // Too Easy -> Aggressive jump
    nextLoad = lastSessionMax + 5;
    advice = "Session was very easy. Increase load significantly.";
    statusColor = "text-green-500";
  } else {
    // Optimal (6.5 - 7.9) -> Small increase
    nextLoad = lastSessionMax + 1.25; 
    advice = "Optimal zone. Attempt a micro-load increase.";
    statusColor = "text-emerald-500";
  }
  
  // Round to nearest 0.5kg
  nextLoad = Math.round(nextLoad * 2) / 2;

  // 5. Calculate Difference
  const diff = nextLoad - lastSessionMax;

  return (
    <Card className="col-span-1 lg:col-span-2 border-none shadow-lg bg-slate-950 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      <CardHeader className="relative z-10 pb-2 mb-2">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Brain className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
                <CardTitle className="text-lg tracking-wide text-indigo-100">COACH INTELLIGENCE</CardTitle>
                <CardDescription className="text-slate-400">Analysis of recent performance</CardDescription>
            </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
         {/* LEFT: Recommendation */}
         <div className="space-y-4 bg-slate-900/50 p-6 rounded-xl border border-white/5">
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Next {exerciseName} Load
                </h4>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white tracking-tighter">
                        {nextLoad}
                    </span>
                    <span className="text-xl text-slate-500 font-medium">kg</span>
                </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-black/20">
                <div className={`mt-1 h-2 w-2 rounded-full ${statusColor.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`} />
                <p className="text-sm text-slate-300 leading-relaxed">
                    {advice}
                </p>
            </div>
         </div>

         {/* RIGHT: Metrics */}
         <div className="space-y-4">
            
            {/* COMPARISON ROW */}
            <TooltipProvider>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors group">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">vs Last Session</span>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-slate-600 hover:text-indigo-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-800 text-slate-200 border-slate-700">
                           <p>Next Load ({nextLoad}kg) vs Previous Max ({lastSessionMax}kg)</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                {/* DYNAMIC BADGE COLOR */}
                <Badge variant="outline" className={`${diff >= 0 ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-orange-500/30 text-orange-400 bg-orange-500/10'} px-3 py-1 font-mono`}>
                    {diff > 0 ? '+' : ''}{diff}kg
                </Badge>
            </div>
            </TooltipProvider>

            {/* FOCUS ROW */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-white/5">
                <span className="text-sm text-slate-400">Training Focus</span>
                <span className="text-sm font-medium text-blue-400">
                    {lastSessionMax > 100 ? "Strength" : "Hypertrophy"}
                </span>
            </div>

            {/* TREND ROW */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-white/5">
                <span className="text-sm text-slate-400">RPE Trend</span>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    {lastSessionRPE >= 8 ? <TrendingUp className="h-4 w-4 text-orange-400" /> : <Minus className="h-4 w-4 text-slate-500" />}
                    {lastSessionRPE >= 8 ? "High Intensity" : "Stable"}
                </div>
            </div>

         </div>
      </CardContent>
    </Card>
  );
}