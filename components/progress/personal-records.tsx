"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Database } from "@/types/database";
import { Trophy, Scale, Repeat } from "lucide-react";

type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];

export function PersonalRecords({ logs }: { logs: WorkoutLog[] }) {
  if (!logs.length) return null;

  // Calculate Records
  const maxWeight = Math.max(...logs.map(l => l.weight || 0));
  const maxVolume = Math.max(...logs.map(l => (l.weight || 0) * (l.reps || 0)));
  
  // Best Set (Highest Calculated 1RM logic)
  const bestSet = logs.reduce((prev, current) => 
    (prev.calculated_1rm || 0) > (current.calculated_1rm || 0) ? prev : current
  );

  return (
    <div className="grid grid-cols-3 gap-4">
       <Card className="bg-yellow-50/50 border-yellow-100">
          <CardContent className="p-4 flex flex-col items-center text-center">
             <Trophy className="h-5 w-5 text-yellow-600 mb-2" />
             <span className="text-xs font-bold text-yellow-700 uppercase">Heaviest</span>
             <span className="text-xl font-bold text-gray-900">{maxWeight}kg</span>
          </CardContent>
       </Card>
       <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex flex-col items-center text-center">
             <Scale className="h-5 w-5 text-blue-600 mb-2" />
             <span className="text-xs font-bold text-blue-700 uppercase">Best Vol</span>
             <span className="text-xl font-bold text-gray-900">{maxVolume}</span>
          </CardContent>
       </Card>
       <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex flex-col items-center text-center">
             <Repeat className="h-5 w-5 text-green-600 mb-2" />
             <span className="text-xs font-bold text-green-700 uppercase">Best Set</span>
             <span className="text-sm font-bold text-gray-900">{bestSet.weight}kg x {bestSet.reps}</span>
          </CardContent>
       </Card>
    </div>
  );
}