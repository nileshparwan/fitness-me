import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dumbbell, Timer, Activity, Calendar } from "lucide-react";
import { HistoryEntry } from "@/app/actions/analytics";

export function ExerciseHistory({ history }: { history: HistoryEntry[] }) {
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
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {history.map((log, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            {/* Left: Date & RPE */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {format(new Date(log.date), "MMM d, yyyy")}
              </div>
              {log.type === 'strength' && log.rpe && (
                 <Badge variant="outline" className="text-[10px] h-5">
                   RPE {log.rpe}
                 </Badge>
              )}
            </div>

            {/* Right: The Numbers */}
            <div className="text-right">
              {log.type === 'strength' ? (
                // STRENGTH DISPLAY
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold tabular-nums">
                    {log.weight} <span className="text-xs text-muted-foreground font-normal">kg</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" /> {log.reps} reps
                  </span>
                  {log.estimated_1rm && (
                     <span className="text-[10px] text-primary/80 mt-1">
                        1RM: {log.estimated_1rm}kg
                     </span>
                  )}
                </div>
              ) : (
                // CARDIO DISPLAY
                <div className="flex flex-col items-end">
                   <span className="text-lg font-bold tabular-nums">
                    {log.distance_km} <span className="text-xs text-muted-foreground font-normal">km</span>
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="h-3 w-3" /> {log.duration_minutes} mins
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}