import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, Timer, Scale } from "lucide-react";
import { format } from "date-fns";
import { HistoryEntry } from "@/app/actions/analytics";

export function ExerciseRecords({ history, type }: { history: HistoryEntry[], type: string }) {
  if (history.length === 0) return null;

  // --- Logic to find Records ---
  let recordCards = [];

  if (type.toLowerCase() === 'cardio') {
    // 1. Max Distance
    const maxDist = history.reduce((prev, current) => 
      (current.distance_km || 0) > (prev.distance_km || 0) ? current : prev
    , history[0]);

    // 2. Longest Duration
    const maxDur = history.reduce((prev, current) => 
      (current.duration_minutes || 0) > (prev.duration_minutes || 0) ? current : prev
    , history[0]);

    recordCards = [
      { label: "Farthest Distance", value: `${maxDist.distance_km} km`, icon: TrendingUp, date: maxDist.date },
      { label: "Longest Session", value: `${maxDur.duration_minutes} min`, icon: Timer, date: maxDur.date },
    ];
  } else {
    // 1. Max Weight Lifted
    const maxWeight = history.reduce((prev, current) => 
      (current.weight || 0) > (prev.weight || 0) ? current : prev
    , history[0]);

    // 2. Best Estimated 1RM
    const max1RM = history.reduce((prev, current) => 
      (current.estimated_1rm || 0) > (prev.estimated_1rm || 0) ? current : prev
    , history[0]);

    recordCards = [
      { label: "Heaviest Lift", value: `${maxWeight.weight} kg`, icon: Scale, date: maxWeight.date },
      { label: "Best Est. 1RM", value: `${max1RM.estimated_1rm} kg`, icon: Trophy, date: max1RM.date },
    ];
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {recordCards.map((record, i) => (
        <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-l-4 border-l-primary shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {record.label}
              </p>
              <h4 className="text-2xl font-bold tracking-tight">{record.value}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">
                Achieved on {format(new Date(record.date), "MMM d, yyyy")}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <record.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}