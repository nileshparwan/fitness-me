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
import { Database } from "@/types/database";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayDistance, displayWeight } from "@/utils/unit-conversion";

type WorkoutLog = Database["public"]["Tables"]["workout_sets"]["Row"];
type CardioLog = Database["public"]["Tables"]["workout_cardio"]["Row"];
type HistoryLog = WorkoutLog | CardioLog;

interface Props {
  logs: HistoryLog[];
}

export function HistoryTable({ logs }: Props) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (!logs || logs.length === 0) return null;
  const getLogDate = (log: HistoryLog) => ("activity_type" in log ? log.date : log.created_at || "");

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(getLogDate(a) || 0).getTime();
    const dateB = new Date(getLogDate(b) || 0).getTime();
    return dateB - dateA;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, "MMM d, yyyy") : "-";
  };

  const isCardio = (log: HistoryLog): log is CardioLog => "activity_type" in log;

  return (
    <Card className="shadow-sm border-muted h-full flex flex-col">
      <CardHeader className="px-3 pb-3 pt-4 sm:px-6">
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
          
          <Table className="min-w-[560px] md:min-w-full">
            {/* STICKY HEADER: Use sticky top-0 and z-index to keep it visible */}
            <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[110px] whitespace-nowrap pl-3 font-semibold sm:pl-6">Date</TableHead>
                <TableHead className="w-[170px] whitespace-nowrap font-semibold">Exercise</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Performance</TableHead>
                <TableHead className="whitespace-nowrap font-semibold">Intensity</TableHead>
                <TableHead className="whitespace-nowrap pr-3 text-right font-semibold sm:pr-6">Metric</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {sortedLogs.map((log) => {
                const isCardioLog = isCardio(log);

                return (
                  <TableRow key={log.id} className="hover:bg-muted/5 group">
                    <TableCell className="whitespace-nowrap pl-3 font-medium text-muted-foreground sm:pl-6">
                      {formatDate(getLogDate(log))}
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
                            <span className="text-sm font-medium">{displayDistance(log.distance, system)} {labels.distance}</span>
                            <span className="text-xs text-muted-foreground">{log.duration_minutes} min</span>
                         </div>
                      ) : (
                         <div className="flex flex-col">
                            <span className="text-sm font-medium">{displayWeight(log.weight, system)} {labels.weight}</span>
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
                          <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-600 border-slate-200">
                             Rest {log.rest_seconds ?? '-'}s
                          </Badge>
                       )}
                    </TableCell>

                    <TableCell className="whitespace-nowrap pr-3 text-right sm:pr-6">
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
