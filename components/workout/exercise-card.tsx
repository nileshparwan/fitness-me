"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
      <CardHeader className="flex flex-row items-center justify-between bg-muted/20 px-3 py-3 sm:px-4">
        <CardTitle className="text-sm font-semibold truncate max-w-[80%]">
          {exerciseName}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={remove} className="text-destructive hover:bg-destructive/10 h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 gap-2 border-b bg-muted/10 p-3 sm:grid-cols-2">
          <FormField
            control={control}
            name={`exercises.${index}.group_id`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Exercise Group ID (Optional)"
                    className="h-8 text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`exercises.${index}.notes`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Exercise Notes (e.g. keep elbows tucked)"
                    className="min-h-[32px] text-xs"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

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

        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full rounded-none border-t text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-primary sm:h-10"
          onClick={() =>
            append({
              set_number: fields.length + 1,
              reps: 0,
              weight: 0,
              rest_seconds: 90,
              tempo: "",
              is_warmup: false,
              is_dropset: false,
              form_video_url: "",
              is_completed: false,
            })
          }
        >
          + Add Set
        </Button>
      </CardContent>
    </Card>
  );
}
