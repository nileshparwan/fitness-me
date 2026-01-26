import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { SetInput } from "./set-input";

export function ExerciseCard({ index, remove, form }: { index: number; remove: () => void; form: any }) {
  const { fields, append, remove: removeSet } = useFieldArray({
    control: form.control,
    name: `exercises.${index}.sets`,
  });

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/30">
        <CardTitle className="text-base font-semibold">
          {form.watch(`exercises.${index}.name`)}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={remove} className="text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-10 gap-2 p-3 text-xs font-medium text-muted-foreground text-center border-b">
          <div className="col-span-1">Set</div>
          <div className="col-span-3">kg</div>
          <div className="col-span-3">Reps</div>
          <div className="col-span-2">RPE</div>
          <div className="col-span-1"></div>
        </div>

        <div className="space-y-0 divide-y">
          {fields.map((set, setIndex) => (
            <SetInput
              key={set.id}
              index={index}
              setIndex={setIndex}
              control={form.control}
              onRemove={() => removeSet(setIndex)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-none border-t h-10 text-xs uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
          onClick={() => append({ set_number: fields.length + 1, reps: 0, weight: 0, is_completed: false })}
        >
          + Add Set
        </Button>
      </CardContent>
    </Card>
  );
}