"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
    <div className={cn("px-3 py-2.5 sm:px-2.5", setIndex % 2 === 0 ? "bg-background" : "bg-muted/20")}>
      <div className="grid grid-cols-8 items-center gap-2 sm:gap-2.5">
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
                    value={field.value ?? ""}
                    type="number"
                    className="h-9 p-2 text-center font-medium focus:bg-accent/20 sm:h-8 sm:p-1"
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
                    value={field.value ?? ""}
                    type="number"
                    className="h-9 p-2 text-center font-medium focus:bg-accent/20 sm:h-8 sm:p-1"
                    placeholder="0"
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
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-7 sm:w-7"
            onClick={onRemove}
            tabIndex={-1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-6">
        <Accordion type="single" collapsible className="w-full md:col-span-6">
          <AccordionItem value={`set-advanced-${index}-${setIndex}`} className="border-b-0">
            <AccordionTrigger className="py-1.5 text-xs">Advanced Set Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.rest_seconds`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          type="number"
                          className="h-9 text-xs sm:h-8"
                          placeholder="Rest (sec)"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.tempo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          className="h-9 text-xs sm:h-8"
                          placeholder="Tempo (e.g. 3-1-1)"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.is_warmup`}
                  render={({ field }) => (
                    <FormItem className="flex h-9 flex-row items-center gap-2 rounded-md border px-2 sm:h-8">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <span className="text-xs text-muted-foreground">Warmup</span>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.is_dropset`}
                  render={({ field }) => (
                    <FormItem className="flex h-9 flex-row items-center gap-2 rounded-md border px-2 sm:h-8">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      </FormControl>
                      <span className="text-xs text-muted-foreground">Drop Set</span>
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
