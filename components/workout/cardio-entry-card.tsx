"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Control, useFieldArray, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { WorkoutFormValues } from "@/types/workout";
import { useUnitLabels } from "@/stores/use-settings-store";

interface CardioEntryCardProps {
  index: number;
  remove: () => void;
  control: Control<WorkoutFormValues>;
}

export function CardioEntryCard({ index, remove, control }: CardioEntryCardProps) {
  const [showNotes, setShowNotes] = useState(false);
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
    <div className="relative overflow-hidden border-b pb-4">
      <div className="flex flex-row items-center justify-between px-1 py-3">
        <h4 className="max-w-[80%] truncate text-sm font-semibold">
          {cardioName || "Cardio"}
        </h4>
        <Button variant="ghost" size="icon" onClick={remove} className="h-8 w-8 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 px-3 pb-2 sm:grid-cols-2">
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

      <div className="grid grid-cols-10 gap-2 border-b px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <div className="col-span-1">Set</div>
        <div className="col-span-3">Duration</div>
        <div className="col-span-3">Distance ({labels.distance})</div>
        <div className="col-span-2">Reps</div>
        <div className="col-span-1"></div>
      </div>

      <div className="divide-y">
        {fields.map((set, setIndex) => (
          <div key={set.id} className="px-3 py-2.5">
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
                          onChange={(e) => field.onChange(Number(e.target.value || 0))}
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
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                <AccordionTrigger className="py-1.5 text-xs">Advanced Cardio Details</AccordionTrigger>
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                              onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder="Device Source"
                              className="h-9 text-sm"
                            />
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

      <div className="grid grid-cols-2 gap-2 border-t px-3 py-3">
        <Button
          type="button"
          className="h-10 w-full text-sm font-semibold"
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
                    placeholder="Cardio notes: pace strategy, HR targets, and effort cues."
                    className="min-h-[88px] text-sm"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
