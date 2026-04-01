"use client";

import { Dumbbell, Trash2 } from "lucide-react";
import { Control, useFieldArray, useWatch } from "react-hook-form";

import type { WorkoutExerciseLastSession } from "@/app/actions/workout";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import type { WorkoutFormValues } from "@/types/workout";
import { displayWeight } from "@/utils/unit-conversion";
import { SetInput } from "./set-input";

interface ExerciseCardProps {
  index: number;
  remove: () => void;
  control: Control<WorkoutFormValues>;
  lastSession?: WorkoutExerciseLastSession | null;
}

function formatWeight(weight: number | null) {
  if (weight === null || weight === undefined) return "-";
  const rounded = Number(weight.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function ExerciseCard({
  index,
  remove,
  control,
  lastSession,
}: ExerciseCardProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const { fields, append, remove: removeSet } = useFieldArray({
    control,
    name: `exercises.${index}.sets`,
  });
  const exerciseName = useWatch({
    control,
    name: `exercises.${index}.name`,
  });

  return (
    <div className="glass-surface !rounded-[14px] border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chart-1/15 text-chart-1">
          <Dumbbell className="h-3.5 w-3.5" />
        </div>
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">{exerciseName || "Exercise"}</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={remove}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {lastSession ? (
        <div className="border-b border-border/40 bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
          Last session ({lastSession.exercise_name}): {formatWeight(displayWeight(lastSession.weight, system))} {labels.weight} ×{" "}
          {lastSession.reps ?? "-"} ({lastSession.relative_label})
        </div>
      ) : null}

      <div className="grid grid-cols-10 gap-2 border-b border-border/40 bg-muted/20 px-4 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <div className="col-span-1">Set</div>
        <div className="col-span-3">{labels.weight}</div>
        <div className="col-span-3">Reps</div>
        <div className="col-span-2">Rest</div>
        <div className="col-span-1"></div>
      </div>

      <div className="divide-y divide-border/30">
        {fields.map((set, setIndex) => (
          <SetInput key={set.id} index={index} setIndex={setIndex} control={control} onRemove={() => removeSet(setIndex)} />
        ))}
      </div>

      <div className="border-t border-border/40 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-border/50 text-sm"
          onClick={() =>
            append({
              set_number: fields.length + 1,
              reps: 0,
              weight: 0,
              rest_seconds: 90,
              rpe: undefined,
              rir: undefined,
              tempo: "",
              is_warmup: false,
              is_dropset: false,
              is_completed: false,
            })
          }
        >
          + Add Set
        </Button>
      </div>

      <div className="border-t border-border/40 px-4 py-3">
        <FormField
          control={control}
          name={`exercises.${index}.notes`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Exercise notes..."
                  className="min-h-[60px] resize-none text-sm"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
