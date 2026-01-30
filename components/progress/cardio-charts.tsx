"use client";

import { useState } from "react";
import { Area, ComposedChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, AreaChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from "date-fns"; // Added isValid

// Safe date formatter
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
  return isValid(date) ? format(date, "MMM d") : "";
};

const formatTooltipDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
  return isValid(date) ? format(date, "MMM d, yyyy") : "";
};

export function CardioCharts({ data, exerciseName }: { data: any[], exerciseName: string }) {
  const [activeTab, setActiveTab] = useState("efficiency");

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-sm border-muted">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>{exerciseName} Trends</CardTitle>
                <CardDescription>Endurance & Heart Rate Analysis</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
                <TabsTrigger value="distance">Volume</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
           {activeTab === "efficiency" ? (
              <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillHR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                
                {/* SAFE DATE FORMATTING */}
                <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: '10px' }} 
                />
                
                <YAxis yAxisId="left" orientation="left" stroke="#ef4444" domain={['dataMin - 10', 'auto']} tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" domain={['dataMin - 1', 'auto']} reversed tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
                
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelFormatter={formatTooltipDate}
                />
                <Legend />
                
                <Area yAxisId="left" type="monotone" dataKey="heart_rate" name="Avg HR (bpm)" stroke="#ef4444" fill="url(#fillHR)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="pace" name="Pace (min/km)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
           ) : (
              // ... (Second chart: Volume)
              <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                <Tooltip labelFormatter={formatTooltipDate} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                <Area type="step" dataKey="distance" name="Distance (km)" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
           )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}