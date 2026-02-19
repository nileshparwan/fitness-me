"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { useFieldArray, Control, useWatch } from "react-hook-form";
import { SetInput } from "./set-input";
import { WorkoutFormValues } from "@/types/workout";

interface ExerciseCardProps {
  index: number;
  remove: () => void;
  control: Control<WorkoutFormValues>;
}

export function ExerciseCard({ index, remove, control }: ExerciseCardProps) {
  const { fields, append, remove: removeSet } = useFieldArray({
    control,
    name: `exercises.${index}.sets`,
  });

  const exerciseName = useWatch({
    control,
    name: `exercises.${index}.name`,
  });

  return (
    <Card className="relative overflow-hidden shadow-sm border-l-4 border-l-primary/20">
      <CardHeader className="flex flex-row items-center justify-between py-3 bg-muted/20">
        <CardTitle className="text-sm font-semibold truncate max-w-[80%]">
          {exerciseName}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={remove} className="text-destructive hover:bg-destructive/10 h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-8 gap-2 p-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground text-center border-b">
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

        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-none border-t h-10 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-primary"
          onClick={() => append({ set_number: fields.length + 1, reps: 0, weight: 0, is_completed: false })}
        >
          + Add Set
        </Button>
      </CardContent>
    </Card>
  );
}
