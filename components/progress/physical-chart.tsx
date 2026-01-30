"use client";

import { ComposedChart, Line, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

export function PhysioChart({ data }: { data: any[] }) {
  // Filter out data points where we don't have body weight logged to avoid ugly gaps
  const cleanData = data.filter(d => d.bodyWeight !== null);

  if (cleanData.length < 2) return null;

  return (
    <Card className="col-span-1 lg:col-span-3 shadow-sm border-muted">
      <CardHeader>
        <CardTitle>Relative Strength Analysis</CardTitle>
        <CardDescription>Correlating your lift strength (1RM) vs. your body weight.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cleanData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), "MMM d")} tickLine={false} axisLine={false} style={{ fontSize: '10px' }} />
            
            {/* Left Axis: Strength */}
            <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} domain={['dataMin - 5', 'auto']} />
            
            {/* Right Axis: Body Weight */}
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tickLine={false} axisLine={false} style={{ fontSize: '10px' }} domain={['dataMin - 2', 'auto']} />
            
            <Tooltip 
                labelFormatter={(l) => format(parseISO(l), "MMM d, yyyy")}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            
            <Area yAxisId="left" type="monotone" dataKey="estimated_1rm" name="Est. 1RM (kg)" fill="hsl(var(--primary))" fillOpacity={0.2} stroke="hsl(var(--primary))" strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="bodyWeight" name="Body Weight (kg)" stroke="#82ca9d" strokeWidth={2} dot={{r:3}} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}