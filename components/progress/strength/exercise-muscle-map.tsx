"use client";

import { useEffect, useMemo, useState } from "react";

import { MuscleBodyMap } from "@/components/progress/body-highlighter/muscle-body-map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildExerciseData, mapMuscleGroupsToBodyMapMuscles, type MuscleMapping } from "@/lib/calculations/muscle-map";

type MuscleActivationOption = {
  name: string;
  muscles: string[];
  frequency: number;
};

type ExerciseMuscleMapProps = {
  exercises: MuscleActivationOption[];
  posteriorMuscles?: string[];
  mapping?: MuscleMapping;
};

function formatLabel(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ExerciseMuscleMap({ exercises, posteriorMuscles = [], mapping }: ExerciseMuscleMapProps) {
  const [selectedName, setSelectedName] = useState<string>(exercises[0]?.name ?? "");

  useEffect(() => {
    if (!exercises.some((exercise) => exercise.name === selectedName)) {
      setSelectedName(exercises[0]?.name ?? "");
    }
  }, [exercises, selectedName]);

  const activeExercise = exercises.find((exercise) => exercise.name === selectedName) ?? exercises[0] ?? null;
  const data = useMemo(() => (activeExercise ? buildExerciseData([activeExercise], mapping) : []), [activeExercise, mapping]);
  const muscles = useMemo(() => {
    if (!activeExercise) return [];
    const posteriorSet = new Set(posteriorMuscles);
    return mapMuscleGroupsToBodyMapMuscles(activeExercise.muscles, mapping).map((muscle) => ({
      name: formatLabel(muscle),
      side: posteriorSet.has(muscle) ? "Posterior" : "Anterior",
    }));
  }, [activeExercise, posteriorMuscles, mapping]);

  return (
    <div className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Exercise Focus</h2>
          <p className="mt-1 text-sm text-muted-foreground">Select one of your most-used exercises to inspect the muscle emphasis.</p>
        </div>
        <div className="w-full max-w-xs">
          <Select value={activeExercise?.name ?? ""} onValueChange={setSelectedName}>
            <SelectTrigger>
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((option) => (
                <SelectItem key={option.name} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <MuscleBodyMap title={activeExercise?.name || "Muscle Map"} data={data} showBothViews={true} posteriorMuscles={posteriorMuscles} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {muscles.map((muscle) => (
          <div key={`${muscle.name}-${muscle.side}`} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs">
            <span className="font-medium text-foreground">{muscle.name}</span>
            <span className="ml-2 text-muted-foreground">{muscle.side}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
