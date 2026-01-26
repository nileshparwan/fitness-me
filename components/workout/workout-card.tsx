import Link from "next/link";
import { Calendar, Clock, Dumbbell } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkoutCardProps {
  workout: {
    id: string;
    name: string;
    status: string | null;
    date: string | Date;
    duration_minutes: number | null;
    workout_logs: any[];
  };
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  // Safe date parsing
  const dateObj = typeof workout.date === 'string' ? new Date(workout.date) : workout.date;
  
  // Safe status handling
  const status = workout.status || "draft"; // Default to 'draft' if null

  return (
    <Link href={`/workouts/${workout.id}`} className="block h-full">
      <Card className="hover:bg-muted/50 transition-all duration-200 cursor-pointer h-full border-l-4 border-l-primary/0 hover:border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-bold truncate pr-4">
            {workout.name}
          </CardTitle>
          <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="capitalize">
            {status}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Calendar className="mr-2 h-3 w-3 opacity-70" />
            {format(dateObj, "PPP")}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{workout.duration_minutes || "--"}m</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{workout.workout_logs?.length || 0} Ex</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}