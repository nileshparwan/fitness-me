"use client";

import { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell 
} from "recharts";
import { 
  Search, Filter, Calendar, ArrowUpRight, ArrowDownRight, 
  MousePointer2, Activity, Zap, Terminal 
} from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils";

// --- Types ---
type AnalyticsEvent = {
  id: string;
  event_name: string;
  page_path: string;
  created_at: string;
  metadata: any;
  user_id?: string;
};

interface Props {
  initialEvents: AnalyticsEvent[];
  totalHistoricalEvents: number;
  activeUserCount: number;
}

// --- Constants ---
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--destructive)",
  "var(--chart-5)",
  "var(--chart-3)",
];

export function AnalyticsView({ initialEvents, totalHistoricalEvents, activeUserCount }: Props) {
  // --- State ---
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState("30"); // "7", "30", "90"

  // --- Filter Logic ---
  const filteredEvents = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(daysFilter));

    return initialEvents.filter(event => {
      const eventDate = parseISO(event.created_at);
      const matchesDate = isAfter(eventDate, cutoffDate);
      
      const matchesType = typeFilter === "all" || event.event_name === typeFilter;
      
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        event.event_name.toLowerCase().includes(searchLower) ||
        event.page_path?.toLowerCase().includes(searchLower) ||
        JSON.stringify(event.metadata).toLowerCase().includes(searchLower);

      return matchesDate && matchesType && matchesSearch;
    });
  }, [initialEvents, search, typeFilter, daysFilter]);

  // --- Derived Stats (Based on Filtered Data) ---
  const stats = useMemo(() => {
    // 1. Group by Date
    const dailyMap = new Map<string, number>();
    // 2. Group by Event Name
    const eventTypeMap = new Map<string, number>();

    filteredEvents.forEach(e => {
      // Daily
      const date = e.created_at.split("T")[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
      
      // Types
      eventTypeMap.set(e.event_name, (eventTypeMap.get(e.event_name) || 0) + 1);
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const typeData = Array.from(eventTypeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { dailyData, typeData, total: filteredEvents.length };
  }, [filteredEvents]);

  // Unique event types for the dropdown
  const uniqueTypes = useMemo(() => 
    Array.from(new Set(initialEvents.map(e => e.event_name))), 
  [initialEvents]);

  return (
    <div className="section-gap animate-in fade-in duration-500">
      
      {/* --- CONTROLS TOOLBAR --- */}
      <div className="surface-pad flex flex-col items-start justify-between gap-4 rounded-xl border bg-card shadow-sm md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search paths, metadata..."
              className="pl-8 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-background">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
           <span className="text-sm text-muted-foreground hidden md:inline">Time Range:</span>
           <div className="flex p-1 bg-muted rounded-lg">
             {["7", "30", "90"].map((day) => (
                <button
                  key={day}
                  onClick={() => setDaysFilter(day)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-md transition-all",
                    daysFilter === day ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {day}d
                </button>
             ))}
           </div>
        </div>
      </div>

      {/* --- KEY METRICS ROW --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <StatCard 
            title="Filtered Events" 
            value={stats.total} 
            icon={Activity}
            subtext={`In last ${daysFilter} days`}
         />
         <StatCard 
            title="Avg Daily Events" 
            value={Math.round(stats.total / Math.max(stats.dailyData.length, 1))} 
            icon={Zap} 
            subtext="Based on current filter"
         />
         <StatCard 
            title="Unique Users" 
            value={activeUserCount} 
            icon={MousePointer2} 
            subtext="In recent history"
         />
         <StatCard 
            title="Total Historical" 
            value={(totalHistoricalEvents / 1000).toFixed(1) + 'k'} 
            icon={Terminal} 
            subtext="Lifetime logs"
         />
      </div>

      {/* --- CHARTS ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Event Volume</CardTitle>
            <CardDescription>Daily activity frequency over selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 12, fill: "var(--muted-foreground)"}} 
                  tickFormatter={(val) => format(parseISO(val), "MMM d")}
                  minTickGap={30}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelFormatter={(label) => format(parseISO(label), "PPP")}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--chart-3)" 
                  strokeWidth={2} 
                  fill="url(#colorCount)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>Events by type.</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px] p-4">
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1">
                {stats.typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.typeData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No distribution data
                  </div>
                )}
              </div>

              <div className="mt-3 max-h-16 overflow-y-auto">
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                  {stats.typeData.slice(0, 8).map((entry, index) => (
                    <div key={entry.name} className="flex min-w-0 items-center gap-1.5 text-xs">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="max-w-[130px] truncate text-muted-foreground" title={entry.name}>
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- DETAILED TABLE --- */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Event Logs</CardTitle>
            <CardDescription>Detailed breakdown of filtered events.</CardDescription>
          </div>
          <Badge variant="outline">{filteredEvents.length} results</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead className="hidden md:table-cell">Path</TableHead>
                <TableHead className="hidden lg:table-cell">Metadata</TableHead>
                <TableHead className="text-right">User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.slice(0, 10).map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {format(parseISO(event.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-xs">
                      {event.event_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate" title={event.page_path}>
                    {event.page_path}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground max-w-[300px] truncate">
                    {JSON.stringify(event.metadata)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-mono">
                    {event.user_id?.slice(0, 8)}...
                  </TableCell>
                </TableRow>
              ))}
              {filteredEvents.length === 0 && (
                <TableRow>
                   <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No events found matching your filters.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {filteredEvents.length > 10 && (
             <div className="mt-4 text-center text-xs text-muted-foreground">
               Showing recent 10 of {filteredEvents.length} events
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ title, value, icon: Icon, subtext }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
           <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
           <div className="p-1.5 bg-primary/10 rounded-md">
             <Icon className="h-4 w-4 text-primary" />
           </div>
        </div>
        <div className="mt-3">
           <div className="text-2xl font-bold">{value}</div>
           <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  )
}
