"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ChartPoint {
    date: string;
    estimated_1rm: number;
    volume: number;
}

interface Props {
    data: ChartPoint[];
    exerciseName: string;
    timeRange: string;
}

export function ProgressCharts({ data, exerciseName, timeRange }: Props) {
    const [activeTab, setActiveTab] = useState("strength");

    // Calculate Trend Metrics (Logic merged from StrengthTrendChart)
    const currentMax = data.length > 0 ? (data[data.length - 1].estimated_1rm || 0) : 0;
    const startMax = data.length > 0 ? (data[0].estimated_1rm || 0) : 0;
    const growth = startMax ? ((currentMax - startMax) / startMax) * 100 : 0;
    const isPositive = growth >= 0;

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-muted h-full min-h-[400px]">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <CardTitle>{exerciseName} Analysis</CardTitle>
                        <div className="flex items-center gap-2">
                            <CardDescription>History over {timeRange}</CardDescription>
                            {/* Trend Badge Logic Included Here */}
                            {data.length > 1 && activeTab === 'strength' && (
                                <Badge variant="outline" className={`ml-2 text-[10px] h-5 px-1.5 flex gap-1 items-center ${isPositive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(growth).toFixed(1)}%
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="strength">Strength</TabsTrigger>
                            <TabsTrigger value="volume">Volume</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    {activeTab === "strength" ? (
                        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillStrength" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                // This handles timestamps safely
                                tickFormatter={(val) => {
                                    if (!val) return "";
                                    try {
                                        return format(parseISO(val), "MMM d");
                                    } catch (e) {
                                        return val;
                                    }
                                }}
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: '10px' }}
                                minTickGap={30} // Prevents bunching if you have many workouts
                            />
                            <YAxis
                                domain={['dataMin - 5', 'auto']}
                                axisLine={false}
                                tickLine={false}
                                style={{ fontSize: '10px' }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelFormatter={(l) => l ? format(parseISO(l), "MMM d, yyyy") : ""}
                                formatter={(val: number) => [`${val} kg`, "Est. 1RM"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="estimated_1rm"
                                stroke="hsl(var(--primary))"
                                fill="url(#fillStrength)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                // This handles timestamps safely
                                tickFormatter={(val) => {
                                    if (!val) return "";
                                    try {
                                        return format(parseISO(val), "MMM d");
                                    } catch (e) {
                                        return val;
                                    }
                                }}
                                tickLine={false}
                                axisLine={false}
                                style={{ fontSize: '10px' }}
                                minTickGap={30} // Prevents bunching if you have many workouts
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                style={{ fontSize: '10px' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelFormatter={(l) => l ? format(parseISO(l), "MMM d, yyyy") : ""}
                                formatter={(val: number) => [`${val.toLocaleString()} kg`, "Volume Load"]}
                            />
                            <Bar
                                dataKey="volume"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                                opacity={0.8}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}