"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";
import { useFieldArray, Control, useWatch } from "react-hook-form";
import { SetInput } from "./set-input";
import { WorkoutFormValues } from "@/types/workout";
import { FormControl, FormField, FormItem } from "../ui/form";

interface ExerciseCardProps {
  index: number;
  remove: () => void;
  control: Control<WorkoutFormValues>;
}

export function ExerciseCard({ index, remove, control }: ExerciseCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const { fields, append, remove: removeSet } = useFieldArray({
    control,
    name: `exercises.${index}.sets`,
  });

  const exerciseName = useWatch({
    control,
    name: `exercises.${index}.name`,
  });

  return (
    <div className="relative overflow-hidden border-b pb-4">
      <div className="flex flex-row items-center justify-between px-1 py-3">
        <h4 className="max-w-[80%] truncate text-sm font-semibold">
          {exerciseName}
        </h4>
        <Button variant="ghost" size="icon" onClick={remove} className="text-destructive hover:bg-destructive/10 h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-0">
        <div className="grid grid-cols-8 gap-2 border-b px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1">Set</div>
          <div className="col-span-3">kg</div>
          <div className="col-span-3">Reps</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y">
          {fields.map((set, setIndex) => (
            <SetInput
              key={set.id}
              index={index}
              setIndex={setIndex}
              control={control}
              onRemove={() => removeSet(setIndex)}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t px-3 py-3">
          <Button
            type="button"
            className="h-10 w-full text-sm font-semibold"
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
                paused: false,
                touch_and_go: false,
                is_completed: false,
              })
            }
          >
            + Add Set
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-sm"
            onClick={() => setShowNotes((prev) => !prev)}
          >
            {showNotes ? "Hide Notes" : "Add Notes"}
          </Button>
        </div>

        {showNotes && (
          <div className="border-t bg-muted/10 px-3 py-3">
            <FormField
              control={control}
              name={`exercises.${index}.notes`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="General notes (AI populated): strategy, cues, and progression guidance."
                      className="min-h-[88px] text-sm"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
