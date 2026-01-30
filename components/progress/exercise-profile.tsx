"use client";

import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/database";
import { Dumbbell, Activity, Layers } from "lucide-react";

type ExerciseDetails = Database['public']['Tables']['exercise_library']['Row'];

export function ExerciseProfile({ details }: { details: ExerciseDetails | null }) {
  if (!details) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4 bg-white/40 p-3 rounded-lg border border-white/20">
      
      {/* Category */}
      <div className="flex items-center gap-1.5">
        <Activity className="h-4 w-4 text-primary" />
        <span className="font-medium text-gray-900 capitalize">{details.category || "General"}</span>
      </div>

      <div className="h-4 w-px bg-gray-300 mx-1" />

      {/* Equipment */}
      <div className="flex items-center gap-1.5">
        <Dumbbell className="h-4 w-4 text-blue-600" />
        <span className="capitalize">{details.equipment?.replace(/_/g, " ") || "Bodyweight"}</span>
      </div>

      <div className="h-4 w-px bg-gray-300 mx-1" />

      {/* Muscles */}
      {details.muscle_groups && details.muscle_groups.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-600" />
          <div className="flex gap-1">
            {details.muscle_groups.slice(0, 3).map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] h-5 px-1.5 capitalize">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}