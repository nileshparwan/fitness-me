"use client";

import { format } from "date-fns";

import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import type { WorkoutFormValues } from "@/types/workout";
import { displayDistance, displayWeight } from "@/utils/unit-conversion";
import { cn } from "@/utils";

interface WorkoutPreviewProps {
  initialData: WorkoutFormValues;
  workoutId?: string;
}

type RenderGroup =
  | { kind: "superset"; groupId: string; indices: number[] }
  | { kind: "standalone"; index: number };

type StrengthEntry = Extract<WorkoutFormValues["exercises"][number], { type: "strength" }>;

function isStrengthEntry(
  entry: WorkoutFormValues["exercises"][number] | undefined
): entry is StrengthEntry {
  return entry?.type === "strength";
}

export function WorkoutPreview({ initialData }: WorkoutPreviewProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  const renderGroups: RenderGroup[] = (() => {
    const seen = new Set<number>();
    const result: RenderGroup[] = [];

    initialData.exercises.forEach((entry, index) => {
      if (seen.has(index)) return;

      if (isStrengthEntry(entry) && entry.superset_group_id) {
        const linkedIndices = initialData.exercises.flatMap((candidate, candidateIndex) =>
          isStrengthEntry(candidate) && candidate.superset_group_id === entry.superset_group_id
            ? [candidateIndex]
            : []
        );

        linkedIndices.forEach((candidateIndex) => seen.add(candidateIndex));

        if (linkedIndices.length > 1) {
          result.push({
            kind: "superset",
            groupId: entry.superset_group_id,
            indices: linkedIndices,
          });
          return;
        }
      }

      seen.add(index);
      result.push({ kind: "standalone", index });
    });

    return result;
  })();

  function renderStrengthRow(set: StrengthEntry["sets"][number]) {
    const notes = [
      set.is_warmup ? "warmup" : null,
      set.is_dropset ? "dropset" : null,
      set.tempo ? `tempo ${set.tempo}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <p key={set.set_number} className="text-xs text-muted-foreground">
        Set {set.set_number}: {displayWeight(set.weight, system)?.toFixed(0) ?? "0"}
        {labels.weight} × {set.reps}
        {notes ? ` (${notes})` : ""}
      </p>
    );
  }

  function renderCardioRow(
    set: NonNullable<Extract<WorkoutFormValues["exercises"][number], { type: "cardio" }>["cardio_sets"]>[number]
  ) {
    const parts = [
      `${set.duration} min`,
      set.distance !== undefined
        ? `${displayDistance(set.distance, system)?.toFixed(1) ?? "0.0"} ${labels.distance}`
        : null,
      set.reps !== undefined ? `${set.reps} reps` : null,
    ].filter(Boolean);

    return (
      <p key={set.set_number} className="text-xs text-muted-foreground">
        {parts.join(" · ")}
      </p>
    );
  }

  function renderExerciseCard(
    entry: WorkoutFormValues["exercises"][number],
    index: number,
    tone: "strength" | "cardio"
  ) {
    return (
      <section
        key={`${entry.name || entry.type}-${index}`}
        className="overflow-hidden rounded-[14px] border border-border/60 bg-background/35"
      >
        <div
          className={cn(
            "px-5 py-3",
            tone === "strength" ? "bg-chart-4/10 text-foreground" : "bg-chart-5/10 text-foreground"
          )}
        >
          <h3 className="text-sm font-semibold">{entry.name || `Exercise ${index + 1}`}</h3>
        </div>

        <div className="space-y-1 px-5 py-4">
          {entry.type === "strength"
            ? entry.sets.map(renderStrengthRow)
            : (entry.cardio_sets ?? []).map(renderCardioRow)}
          {entry.notes?.trim() ? <p className="pt-2 text-xs text-muted-foreground">{entry.notes}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <div className="glass-surface !rounded-[18px] border-border/50 p-6">
      <div className="space-y-1">
        <h2 className="text-[1.75rem] font-semibold tracking-tight">
          {initialData.name || "Untitled Workout"}
        </h2>
        <p className="text-sm text-muted-foreground">{format(initialData.date, "yyyy-MM-dd")}</p>
      </div>

      <div className="mt-5 space-y-4">
        {renderGroups.map((group, index) => {
          if (group.kind === "superset") {
            return (
              <div
                key={`superset-${group.groupId}`}
                className="space-y-3 rounded-[16px] border-2 border-chart-2/35 bg-chart-2/5 p-3"
              >
                <div className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-chart-2">
                  Superset
                </div>
                {group.indices.map((entryIndex) =>
                  renderExerciseCard(initialData.exercises[entryIndex], entryIndex, "strength")
                )}
              </div>
            );
          }

          const entry = initialData.exercises[group.index];
          if (!entry) return null;

          return renderExerciseCard(
            entry,
            group.index,
            entry.type === "cardio" ? "cardio" : "strength"
          );
        })}

        {initialData.exercises.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No exercises added yet.</p>
        ) : null}
      </div>
    </div>
  );
}
