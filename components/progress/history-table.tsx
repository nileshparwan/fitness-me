"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isValid } from "date-fns";
import { Dumbbell, Activity, CalendarDays } from "lucide-react";

interface Props {
  logs: any[];
}

export function HistoryTable({ logs }: Props) {
  if (!logs || logs.length === 0) return null;

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.date || b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, "MMM d, yyyy") : "-";
  };

  const isCardio = (log: any) => log.activity_type !== undefined;

  return (
    <Card className="shadow-sm border-muted h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            <CardTitle>History Log</CardTitle>
        </div>
        <CardDescription>Recent performance records</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 relative"> 
        {/* FIX: 
           1. h-[500px] limits height 
           2. overflow-y-auto enables vertical scroll 
           3. overflow-x-auto enables horizontal scroll (mobile)
        */}
        <div className="h-[500px] w-full overflow-y-auto overflow-x-auto border-t">
          
          <Table className="min-w-[600px] md:min-w-full">
            {/* STICKY HEADER: Use sticky top-0 and z-index to keep it visible */}
            <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] whitespace-nowrap pl-6 font-semibold">Date</TableHead>
                <TableHead className="w-[180px] whitespace-nowrap font-semibold">Exercise</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Performance</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Intensity</TableHead>
                <TableHead className="text-right whitespace-nowrap pr-6 font-semibold">Metric</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {sortedLogs.map((log) => {
                const isCardioLog = isCardio(log);

                return (
                  <TableRow key={log.id} className="hover:bg-muted/5 group">
                    <TableCell className="font-medium whitespace-nowrap text-muted-foreground pl-6">
                      {formatDate(log.date || log.created_at)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isCardioLog ? (
                          <Activity className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                          {isCardioLog ? log.activity_type : log.exercise_name}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                      {isCardioLog ? (
                         <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.distance_km} km</span>
                            <span className="text-xs text-muted-foreground">{log.duration_minutes} min</span>
                         </div>
                      ) : (
                         <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.weight} kg</span>
                            <span className="text-xs text-muted-foreground">{log.reps} reps x {log.set_number} sets</span>
                         </div>
                      )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap">
                       {isCardioLog ? (
                          <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-600 border-blue-200">
                             {log.average_heart_rate ? `${log.average_heart_rate} bpm` : '-'}
                          </Badge>
                       ) : (
                          <Badge variant="outline" className={`font-mono text-xs ${log.rpe >= 9 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                             RPE {log.rpe || '-'}
                          </Badge>
                       )}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap pr-6">
                       {isCardioLog ? (
                          <span className="text-sm text-muted-foreground font-mono">
                            {log.calories_burned} kcal
                          </span>
                       ) : (
                          <span className="text-sm font-semibold text-slate-600">
                             {log.calculated_1rm ? `1RM: ${log.calculated_1rm}` : '-'}
                          </span>
                       )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
        </div>
      </CardContent>
    </Card>
  );
}