"use client";

import { HeartPulse, Trash2 } from "lucide-react";
import { Control, useFieldArray, useWatch } from "react-hook-form";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUnitLabels } from "@/stores/use-settings-store";
import type { WorkoutFormValues } from "@/types/workout";

interface CardioEntryCardProps {
  index: number;
  remove: () => void;
  control: Control<WorkoutFormValues>;
}

export function CardioEntryCard({ index, remove, control }: CardioEntryCardProps) {
  const labels = useUnitLabels();
  const cardioName = useWatch({
    control,
    name: `exercises.${index}.name`,
  });
  const { fields, append, remove: removeSet } = useFieldArray({
    control,
    name: `exercises.${index}.cardio_sets`,
  });

  return (
    <div className="glass-surface !rounded-[14px] border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chart-5/15 text-chart-5">
          <HeartPulse className="h-3.5 w-3.5" />
        </div>
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold">{cardioName || "Cardio"}</h4>
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

      <div className="grid grid-cols-1 gap-2 px-4 pt-3 sm:grid-cols-2">
        <FormField
          control={control}
          name={`exercises.${index}.sport_type`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Sport Type (running, rowing)"
                  className="h-9 text-sm"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`exercises.${index}.indoor_outdoor`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Indoor / Outdoor"
                  className="h-9 text-sm"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-10 gap-2 border-b border-border/40 px-4 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <div className="col-span-1">Set</div>
        <div className="col-span-3">Duration</div>
        <div className="col-span-3">Distance ({labels.distance})</div>
        <div className="col-span-2">Reps</div>
        <div className="col-span-1"></div>
      </div>

      <div className="divide-y divide-border/30">
        {fields.map((set, setIndex) => (
          <div key={set.id} className="px-4 py-2.5">
            <div className="grid grid-cols-10 items-center gap-2">
              <div className="col-span-1 flex justify-center">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border bg-muted text-[10px] font-bold text-muted-foreground">
                  {setIndex + 1}
                </div>
              </div>
              <div className="col-span-3">
                <FormField
                  control={control}
                  name={`exercises.${index}.cardio_sets.${setIndex}.duration`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? 0}
                          onChange={(event) => field.onChange(Number(event.target.value || 0))}
                          placeholder="Duration (min)"
                          className="h-9 text-center text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={control}
                  name={`exercises.${index}.cardio_sets.${setIndex}.distance`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                          placeholder={`Distance (${labels.distance})`}
                          className="h-9 text-center text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-2">
                <FormField
                  control={control}
                  name={`exercises.${index}.cardio_sets.${setIndex}.reps`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                          placeholder="Reps"
                          className="h-9 text-center text-sm"
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
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeSet(setIndex)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <Accordion type="single" collapsible className="mt-2 w-full">
              <AccordionItem value={`cardio-set-advanced-${index}-${setIndex}`} className="border-b-0">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground">Advanced</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name={`exercises.${index}.cardio_sets.${setIndex}.calories`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="Calories"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.cardio_sets.${setIndex}.heartRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="Avg HR"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name={`exercises.${index}.avg_cadence_rpm`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="Avg Cadence (rpm)"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.avg_power_watts`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="Avg Power (watts)"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.avg_speed`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder={`Avg Speed (${labels.speed})`}
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.max_speed_kmh`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder={`Max Speed (${labels.speed})`}
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.training_load_score`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="Training Load Score"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.vo2max_estimate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                              placeholder="VO2max Estimate"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.device_source`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input value={field.value ?? ""} onChange={field.onChange} placeholder="Device Source" className="h-9 text-sm" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name={`exercises.${index}.weather_conditions`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="Weather Conditions"
                              className="h-9 text-sm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
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
              duration: 0,
              distance: undefined,
              reps: undefined,
              calories: undefined,
              heartRate: undefined,
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
                  placeholder="Cardio notes..."
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
