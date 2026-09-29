"use client";

import { useMemo } from "react";

import { MuscleBodyMap } from "@/components/progress/body-highlighter/muscle-body-map";
import { buildExerciseData, type MuscleMapping } from "@/lib/calculations/muscle-map";

type MuscleActivationOption = {
  name: string;
  muscles: string[];
  frequency: number;
};

type HumanBodyMapProps = {
  muscles: MuscleActivationOption[];
  title?: string;
  description?: string;
  compact?: boolean;
  showBothViews?: boolean;
  className?: string;
  posteriorMuscles?: string[];
  mapping?: MuscleMapping;
};

export function HumanBodyMap({
  muscles,
  title = "Muscle Activation Snapshot",
  description,
  compact = false,
  showBothViews = true,
  className,
  posteriorMuscles = [],
  mapping,
}: HumanBodyMapProps) {
  const data = useMemo(() => buildExerciseData(muscles, mapping), [muscles, mapping]);

  if (data.length === 0) {
    return (
      <section className={`rounded-[18px] border border-white/10 bg-[#0f172b]/85 p-5 ${className ?? ""}`}>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Log more strength work to unlock your body map.
        </p>
      </section>
    );
  }

  return (
    <MuscleBodyMap
      title={title}
      description={description}
      data={data}
      compact={compact}
      showBothViews={showBothViews}
      className={className}
      posteriorMuscles={posteriorMuscles}
    />
  );
}

