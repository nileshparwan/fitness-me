"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
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

export function ExerciseRecords({ history, type }: { history: HistoryEntry[], type: string }) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (history.length === 0) return null;

  let recordRows: Array<{ label: string; value: string; date: string }> = [];

  if (type.toLowerCase() === 'cardio') {
    const maxDist = history.reduce((prev, current) => 
      (current.distance || 0) > (prev.distance || 0) ? current : prev
    , history[0]);

    const maxDur = history.reduce((prev, current) => 
      (current.duration_minutes || 0) > (prev.duration_minutes || 0) ? current : prev
    , history[0]);

    recordRows = [
      { label: `Farthest Distance (${labels.distance})`, value: formatDistanceValue(maxDist.distance, labels.distance, system), date: maxDist.date },
      { label: "Longest Session", value: `${maxDur.duration_minutes ?? 0} min`, date: maxDur.date },
    ];
  } else {
    const maxWeight = history.reduce((prev, current) => 
      (current.weight || 0) > (prev.weight || 0) ? current : prev
    , history[0]);

    const max1RM = history.reduce((prev, current) => 
      (current.estimated_1rm || 0) > (prev.estimated_1rm || 0) ? current : prev
    , history[0]);

    recordRows = [
      { label: `Heaviest Lift (${labels.weight})`, value: formatWeightValue(maxWeight.weight, labels.weight, system), date: maxWeight.date },
      { label: `Best Est. 1RM (${labels.weight})`, value: formatWeightValue(max1RM.estimated_1rm, labels.weight, system), date: max1RM.date },
    ];
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Record</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Achieved On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recordRows.map((record) => (
            <TableRow key={record.label}>
              <TableCell>{record.label}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{record.value}</TableCell>
              <TableCell className="text-right">{format(new Date(record.date), "MMM d, yyyy")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
