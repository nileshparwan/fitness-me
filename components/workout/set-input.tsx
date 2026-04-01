"use client";

import { Trash2 } from "lucide-react";
import { Control } from "react-hook-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { WorkoutFormValues } from "@/types/workout";
import { cn } from "@/utils";

interface SetInputProps {
  index: number;
  setIndex: number;
  control: Control<WorkoutFormValues>;
  onRemove: () => void;
  isCompleted?: boolean;
}

export function SetInput({ index, setIndex, control, onRemove }: SetInputProps) {
  return (
    <div className={cn("px-0 py-0", setIndex % 2 === 0 ? "bg-background/30" : "bg-muted/10")}>
      <div className="grid grid-cols-10 items-center gap-1.5 px-4 py-2.5">
        <div className="col-span-1 flex justify-center">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
            {setIndex + 1}
          </span>
        </div>

        <div className="col-span-3">
          <FormField
            control={control}
            name={`exercises.${index}.sets.${setIndex}.weight`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} type="number" className="h-9 text-center text-sm font-medium" placeholder="0" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-3">
          <FormField
            control={control}
            name={`exercises.${index}.sets.${setIndex}.reps`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} type="number" className="h-9 text-center text-sm font-medium" placeholder="0" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-2">
          <FormField
            control={control}
            name={`exercises.${index}.sets.${setIndex}.rest_seconds`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                    type="number"
                    className="h-9 text-center text-sm text-muted-foreground"
                    placeholder="rest"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="col-span-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
            tabIndex={-1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-2">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={`set-advanced-${index}-${setIndex}`} className="border-b-0">
            <AccordionTrigger className="py-1 text-xs text-muted-foreground">Advanced</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-6">
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.tempo`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input value={field.value ?? ""} onChange={field.onChange} className="h-9 text-xs sm:h-8" placeholder="Tempo (e.g. 3-1-1)" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.rpe`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                          type="number"
                          min={1}
                          max={10}
                          className="h-9 text-xs sm:h-8"
                          placeholder="RPE"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`exercises.${index}.sets.${setIndex}.rir`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                          type="number"
                          min={0}
                          max={10}
                          className="h-9 text-xs sm:h-8"
                          placeholder="RIR"
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
                        <Checkbox checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked === true)} />
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
                        <Checkbox checked={Boolean(field.value)} onCheckedChange={(checked) => field.onChange(checked === true)} />
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
