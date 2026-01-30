"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface RadarData {
  muscle: string;
  score: number;
}

export function AthleteRadar({ data }: { data: RadarData[] }) {
  return (
    <Card className="col-span-1 shadow-sm h-full">
      <CardHeader>
         <CardTitle className="text-base">Training Balance</CardTitle>
         <CardDescription>Muscle Focus (Last 30 days)</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px]">
         <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data || []}>
               <PolarGrid stroke="var(--border)" />
               <PolarAngleAxis dataKey="muscle" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
               <Radar 
                  name="Score" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.4} 
               />
               <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
               />
            </RadarChart>
         </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}