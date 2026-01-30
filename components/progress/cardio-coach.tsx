"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/database";
import { calculateCardioInsights } from "@/utils/fitness-logic";
import { Brain, Activity, Flame, Timer } from "lucide-react";

type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

export function CardioCoach({ logs, birthDate }: { logs: CardioLog[], birthDate?: string | null }) {
  // Ensure we have enough data before calculating
const insights = logs.length >= 2 ? calculateCardioInsights(logs, birthDate) : null;

// If logs exist but not enough for trend analysis, show a simpler empty state or single-log view
if (logs.length === 1) {
    // Basic single session view (optional implementation)
    return null; // Or return a "Log one more session to see trends" card
}

if (!insights) return null;

  return (
    <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-blue-950 to-slate-900 text-white border-none shadow-xl">
       <CardHeader className="pb-2">
         <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500/20 rounded-md"><Brain className="h-4 w-4 text-blue-400" /></div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Endurance Coach</span>
         </div>
         <CardTitle className="text-xl">Training Analysis</CardTitle>
       </CardHeader>
       
       <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Main Insight */}
             <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                <span className="text-xs text-gray-400 uppercase font-semibold">Intensity Zone</span>
                <div className="flex items-end gap-2 mt-1">
                   <span className="text-xl font-bold text-white">{insights.zoneDescription}</span>
                </div>
                <div className="mt-2 text-sm text-blue-200">
                   {insights.hrZone < 70 
                     ? "Great for building aerobic base and fat adaptation." 
                     : "High intensity. Ensure you rest adequately tomorrow."}
                </div>
             </div>

             {/* Trends */}
             <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                   <span className="text-sm text-gray-300 flex items-center gap-2">
                      <Timer className="h-4 w-4 text-green-400" /> Pace Trend
                   </span>
                   <span className={`text-sm font-bold ${insights.paceDiff > 0 ? "text-green-400" : "text-orange-400"}`}>
                      {insights.paceDiff > 0 ? "Faster" : "Slower"} by {Math.abs(insights.paceDiff).toFixed(2)} min/km
                   </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                   <span className="text-sm text-gray-300 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" /> Efficiency
                   </span>
                   <span className="text-sm font-medium text-gray-200">
                      {insights.isMoreEfficient ? "Improving (Lower HR at same pace)" : "Stable"}
                   </span>
                </div>
             </div>
          </div>
       </CardContent>
    </Card>
  );
}