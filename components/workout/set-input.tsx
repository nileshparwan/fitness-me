"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { cn } from "@/utils";
import { Control } from "react-hook-form";
import { WorkoutFormValues } from "@/types/workout";

interface SetInputProps {
  index: number;
  setIndex: number;
  control: Control<WorkoutFormValues>;
  onRemove: () => void;
  isCompleted?: boolean;
}

export function SetInput({ index, setIndex, control, onRemove }: SetInputProps) {
  return (
    <div className={cn("grid grid-cols-10 gap-2 p-2 items-center", setIndex % 2 === 0 ? "bg-background" : "bg-muted/20")}>
      
      {/* Set Number Badge */}
      <div className="col-span-1 flex justify-center">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold border text-muted-foreground">
          {setIndex + 1}
        </div>
      </div>

      {/* Weight Input */}
      <div className="col-span-3">
        <FormField
          control={control}
          name={`exercises.${index}.sets.${setIndex}.weight`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  {...field}
                  // FIX: Handle null/undefined by defaulting to empty string
                  value={field.value ?? ""}
                  type="number" 
                  className="h-8 text-center font-medium focus:bg-accent/20 p-1" 
                  placeholder="0" 
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Reps Input */}
      <div className="col-span-3">
        <FormField
          control={control}
          name={`exercises.${index}.sets.${setIndex}.reps`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  {...field} 
                  // FIX: Handle null/undefined by defaulting to empty string
                  value={field.value ?? ""}
                  type="number" 
                  className="h-8 text-center font-medium focus:bg-accent/20 p-1" 
                  placeholder="0" 
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* RPE Input */}
      <div className="col-span-2">
         <FormField
          control={control}
          name={`exercises.${index}.sets.${setIndex}.rpe`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input 
                  {...field} 
                  // FIX: Handle null/undefined by defaulting to empty string
                  // This fixes the "Type 'null' is not assignable" error
                  value={field.value ?? ""}
                  type="number" 
                  max={10}
                  className="h-8 text-center text-muted-foreground focus:text-foreground p-1" 
                  placeholder="-" 
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Delete Button */}
      <div className="col-span-1 flex justify-center">
         <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={onRemove}
            tabIndex={-1}
         >
           <Trash2 className="h-3.5 w-3.5" />
         </Button>
      </div>
    </div>
  );
}