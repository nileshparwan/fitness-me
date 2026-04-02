"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { HistoryEntry } from "@/app/actions/exercises";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayDistance, displayWeight } from "@/utils/unit-conversion";

function formatWeightValue(value: number | null | undefined, unit: string, system: ReturnType<typeof useUnitSystem>) {
  const converted = displayWeight(value, system);
  return converted === null ? "-" : `${converted} ${unit}`;
}

function formatDistanceValue(value: number | null | undefined, unit: string, system: ReturnType<typeof useUnitSystem>) {
  const converted = displayDistance(value, system);
  return converted === null ? "-" : `${converted} ${unit}`;
}

export function ExerciseHistory({ history }: { history: HistoryEntry[] }) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <Activity className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-sm font-medium">No logs found</p>
        <p className="text-xs">Complete a workout to see history here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">Reps</TableHead>
            <TableHead className="text-right">Est. 1RM</TableHead>
            <TableHead className="text-right">Distance</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((log, index) => (
            <TableRow key={`${log.date}-${log.type}-${index}`}>
              <TableCell>{format(new Date(log.date), "MMM d, yyyy")}</TableCell>
              <TableCell className="capitalize">{log.type}</TableCell>
              <TableCell className="text-right tabular-nums">
                {log.type === "strength" ? formatWeightValue(log.weight, labels.weight, system) : "-"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{log.type === "strength" ? (log.reps ?? "-") : "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {log.type === "strength" && log.estimated_1rm !== null
                  ? formatWeightValue(log.estimated_1rm, labels.weight, system)
                  : "-"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {log.type === "cardio" ? formatDistanceValue(log.distance, labels.distance, system) : "-"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {log.type === "cardio" && log.duration_minutes !== null ? `${log.duration_minutes} min` : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
