"use client";

import { useEffect, useMemo, useState } from "react";
import { Resolver, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Loader2, Save, Sparkles, Check, Eye, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils";
import { ExerciseSelector } from "./exercise-selector";

import { useUser } from "@/hooks/use-user";
import { ExerciseCard } from "./exercise-card";
import { CardioEntryCard } from "./cardio-entry-card";
import { CardioExerciseSelector } from "./cardio-exercise-selector";
// IMPORT THE MATCHING TYPES
import { WorkoutFormValues, workoutFormSchema } from "@/types/workout";
import { useWorkouts } from "@/hooks/use-workout";
import { usePrograms } from "@/hooks/use-program";
import { linkWorkoutToPrograms } from "@/app/actions/program";
import { Database } from "@/types/database";
import { getWorkoutExerciseLastSessionAction, type WorkoutActionInput } from "@/app/actions/workout";
import { mapEntriesToActionExercises, useWorkoutDraftStore } from "@/stores/use-workout-draft-store";
import { trainingKeys } from "@/lib/query-keys-training";
import { useQuery } from "@tanstack/react-query";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayDistance, displayWeight } from "@/utils/unit-conversion";

type Program = Database['public']['Tables']['training_plans']['Row'];

interface WorkoutFormProps {
  initialData?: WorkoutFormValues;
  workoutId?: string;
}

export function WorkoutForm({ initialData, workoutId }: WorkoutFormProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const system = useUnitSystem();
  const labels = useUnitLabels();
  const { createWorkout, updateWorkout } = useWorkouts();
  const { programs } = usePrograms();
  const searchParams = useSearchParams();
  const autoLinkProgramId = searchParams.get("programId");

  const [mode, setMode] = useState<"form" | "text">("form");
  const [viewerMode, setViewerMode] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const setDraftEntries = useWorkoutDraftStore((state) => state.setEntries);
  const clearDraft = useWorkoutDraftStore((state) => state.clear);
  const strengthCount = useWorkoutDraftStore((state) => state.strengthEntries.length);
  const cardioCount = useWorkoutDraftStore((state) => state.cardioEntries.length);

  const toWorkoutActionInput = (data: WorkoutFormValues): WorkoutActionInput => ({
    name: data.name,
    date: data.date,
    sport_type: data.sport_type,
    location: data.location,
    perceived_exertion: data.perceived_exertion,
    notes: data.notes || null,
    overall_rating: data.overall_rating,
    template_id: data.template_id,
    exercises: mapEntriesToActionExercises(data.exercises),
  });

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema) as Resolver<WorkoutFormValues>,
    defaultValues: initialData || {
      name: "",
      notes: "",
      date: new Date(),
      sport_type: "",
      location: "",
      perceived_exertion: undefined,
      overall_rating: undefined,
      template_id: "",
      exercises: [],
      programIds: []
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });
  const watchedEntries = form.watch("exercises");
  const entries = useMemo(() => watchedEntries ?? [], [watchedEntries]);
  const strengthExerciseNames = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .filter((entry) => entry.type !== "cardio")
            .map((entry) => entry.name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      ),
    [entries]
  );
  const lastSessionQuery = useQuery({
    queryKey: [
      ...trainingKeys.sessions(),
      "last-session",
      workoutId || null,
      [...strengthExerciseNames].sort(),
    ],
    queryFn: () =>
      getWorkoutExerciseLastSessionAction({
        exercise_names: strengthExerciseNames,
        current_workout_id: workoutId,
      }),
    enabled: Boolean(user?.id) && strengthExerciseNames.length > 0,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const lastSessionByExercise = useMemo(
    () =>
      new Map(
        (lastSessionQuery.data || []).map((item) => [
          item.exercise_name.trim().toLowerCase(),
          item,
        ] as const)
      ),
    [lastSessionQuery.data]
  );

  useEffect(() => {
    setDraftEntries(watchedEntries ?? []);
  }, [watchedEntries, setDraftEntries]);

  const programOptions = (programs.data as Program[])?.map((p) => ({
    label: p.name,
    value: p.id
  })) || [];
  const selectedProgramId = form.watch("programIds")?.[0];
  const selectedProgramLabel =
    programOptions.find((program) => program.value === selectedProgramId)?.label || "No Program";

  async function onFormSubmit(data: WorkoutFormValues) {
    let savedId: string | undefined;
    try {
      const actionInput = toWorkoutActionInput(data);

      if (workoutId) {
        await updateWorkout.mutateAsync({ id: workoutId, data: actionInput });
        savedId = workoutId;
      } else {
        const result = await createWorkout.mutateAsync(actionInput);
        savedId = result?.id; 
      }

      if (savedId) {
        const uniqueProgramIds = Array.from(
          new Set([
            ...(autoLinkProgramId ? [autoLinkProgramId] : []),
            ...(data.programIds || []),
          ])
        );

        if (uniqueProgramIds.length > 0) {
          await linkWorkoutToPrograms(savedId, uniqueProgramIds);
          if (autoLinkProgramId) {
            toast.success("Linked to Program!");
          }
        }
      }

      if (autoLinkProgramId) {
        router.push(`/programs/${autoLinkProgramId}`);
      } else {
        router.push("/workouts");
      }
      clearDraft();
    } catch {
      if (savedId) {
        toast.error("Workout saved, but program linking failed.");
      }
    }
  }

  async function onTextSubmit() {
    if (!aiText.trim()) return toast.error("Please enter your workout details");
    if (!user) return toast.error("You must be logged in");

    setIsAiProcessing(true);
    try {
      toast.error("AI text workout parsing is not available yet.");
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to parse workout";
      toast.error(message);
    } finally {
      setIsAiProcessing(false);
    }
  }

  const isSaving = createWorkout.isPending || updateWorkout.isPending || isAiProcessing;

  const formatStrengthAdvancedDetails = (set: {
    rest_seconds?: number;
    rpe?: number;
    rir?: number;
    tempo?: string;
    is_warmup?: boolean;
    is_dropset?: boolean;
    paused?: boolean;
    touch_and_go?: boolean;
  }) =>
    [
      set.rest_seconds ? `Rest ${set.rest_seconds}s` : null,
      set.rpe ? `RPE ${set.rpe}` : null,
      set.rir !== undefined ? `RIR ${set.rir}` : null,
      set.tempo ? `Tempo ${set.tempo}` : null,
      set.is_warmup ? "Warm-up" : null,
      set.is_dropset ? "Drop set" : null,
      set.paused ? "Paused" : null,
      set.touch_and_go ? "Touch & Go" : null,
    ]
      .filter(Boolean)
      .join(" • ");
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="stack-gap">
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if (value === "form" || value === "text") setMode(value);
            }}
            className="w-full"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              {!viewerMode ? (
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                  <TabsTrigger value="form">Builder</TabsTrigger>
                  <TabsTrigger value="text"><Sparkles className="w-3 h-3 mr-2 text-purple-500" />AI Text</TabsTrigger>
                </TabsList>
              ) : (
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Viewer Mode
                </div>
              )}
              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewerMode((prev) => !prev)}
                >
                  {viewerMode ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  {viewerMode ? "Edit Mode" : "Viewer Mode"}
                </Button>
                {!viewerMode ? (
                  <Button type="submit" disabled={isSaving} size="lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {workoutId ? "Update" : "Save"}
                  </Button>
                ) : null}
              </div>
            </div>

            <TabsContent value="form" className="stack-gap">
              <div className="stack-gap border-b pb-4">
                {viewerMode ? (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">{form.watch("name") || "Workout"}</h3>
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <p className="text-muted-foreground">
                        Date: <span className="text-foreground">{format(form.watch("date"), "PPP")}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Program: <span className="text-foreground">{selectedProgramLabel}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Sport: <span className="text-foreground">{form.watch("sport_type") || "General"}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Session RPE: <span className="text-foreground">{form.watch("perceived_exertion") ?? "-"}</span>
                      </p>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="viewer-general-notes">
                        <AccordionTrigger>General Notes</AccordionTrigger>
                        <AccordionContent>
                          <p className="whitespace-pre-wrap text-sm text-foreground">
                            {form.watch("notes")?.trim() || "No notes provided."}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Workout Name (e.g. Pull Day)" className="text-xl font-bold" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="programIds"
                        render={({ field }) => {
                          const selected = field.value?.[0] ?? "";
                          return (
                            <FormItem>
                              <FormLabel>Program</FormLabel>
                              <Select
                                value={selected}
                                onValueChange={(value) => field.onChange(value ? [value] : [])}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Program" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {programOptions.map((program) => (
                                    <SelectItem key={program.value} value={program.value}>
                                      {program.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="sport_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sport Type</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Strength, Running, Hyrox" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="Gym / Home / Track" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="perceived_exertion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session RPE (1-10)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10}
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.value === "" ? undefined : Number(event.target.value)
                                  )
                                }
                                placeholder="8"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="general-notes">
                        <AccordionTrigger>General Notes</AccordionTrigger>
                        <AccordionContent>
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    placeholder="General notes: strategy, cues, and progression guidance"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </>
                )}
              </div>

              {viewerMode ? (
                <div className="stack-gap pb-24">
                  <div className="space-y-3 border-t pt-3">
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No exercises added yet.</p>
                    ) : (
                      entries.map((entry, idx) => (
                        <div key={`viewer-entry-${idx}`} className="space-y-2 border-b pb-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {entry.type}
                            </span>
                            <p className="text-sm font-semibold">
                              {entry.name || (entry.type === "cardio" ? `Cardio ${idx + 1}` : `Exercise ${idx + 1}`)}
                            </p>
                          </div>

                          {entry.type === "strength" ? (
                            <div className="space-y-1">
                              {entry.sets.map((set) => (
                                <div key={`viewer-strength-set-${idx}-${set.set_number}`} className="space-y-1">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <span>Set {set.set_number}</span>
                                    <span>{displayWeight(set.weight, system)?.toFixed(1)} {labels.weight}</span>
                                    <span>{set.reps} reps</span>
                                  </div>
                                  {formatStrengthAdvancedDetails(set) ? (
                                    <p className="text-[11px] text-muted-foreground">
                                      {formatStrengthAdvancedDetails(set)}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                              {entry.notes?.trim() ? (
                                <Accordion type="single" collapsible className="w-full pt-1">
                                  <AccordionItem value={`viewer-strength-notes-${idx}`} className="border-b-0">
                                    <AccordionTrigger className="py-1 text-xs">Notes</AccordionTrigger>
                                    <AccordionContent>
                                      <p className="whitespace-pre-wrap text-xs text-muted-foreground">{entry.notes}</p>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {(entry.cardio_sets || []).map((set) => (
                                <div key={`viewer-cardio-set-${idx}-${set.set_number}`} className="space-y-1">
                                  <div className="grid grid-cols-4 gap-2 text-xs">
                                    <span>Set {set.set_number}</span>
                                    <span>{set.duration} min</span>
                                    <span>{displayDistance(set.distance ?? 0, system)?.toFixed(1)} {labels.distance}</span>
                                    <span>{set.reps ?? 0} reps</span>
                                  </div>
                                  {(set.calories !== undefined || set.heartRate !== undefined) ? (
                                    <p className="text-[11px] text-muted-foreground">
                                      {[
                                        set.calories !== undefined ? `Calories ${set.calories}` : null,
                                        set.heartRate !== undefined ? `Avg HR ${set.heartRate} bpm` : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                              {entry.notes?.trim() ? (
                                <Accordion type="single" collapsible className="w-full pt-1">
                                  <AccordionItem value={`viewer-cardio-notes-${idx}`} className="border-b-0">
                                    <AccordionTrigger className="py-1 text-xs">Notes</AccordionTrigger>
                                    <AccordionContent>
                                      <p className="whitespace-pre-wrap text-xs text-muted-foreground">{entry.notes}</p>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="stack-gap">
                  {fields.map((field, index) => (
                    (entries?.[index]?.type ?? "strength") === "cardio" ? (
                      <CardioEntryCard key={field.id} index={index} remove={() => remove(index)} control={form.control} />
                    ) : (
                      <ExerciseCard
                        key={field.id}
                        index={index}
                        remove={() => remove(index)}
                        control={form.control}
                        lastSession={
                          lastSessionByExercise.get(
                            (entries?.[index]?.name || "").trim().toLowerCase()
                          ) || null
                        }
                      />
                    )
                  ))}
                  <div className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-2">
                    <ExerciseSelector
                      onSelect={(ex) =>
                        append({
                          type: "strength",
                          exercise_id: ex.id,
                          name: ex.name,
                          notes: "",
                          sets: [
                            {
                              set_number: 1,
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
                              equipment_type: "",
                              side: undefined,
                              is_completed: false,
                            },
                          ],
                        })
                      }
                    />
                    <CardioExerciseSelector
                      onSelect={(exercise) =>
                        append({
                          type: "cardio",
                          exercise_id: exercise.id,
                          name: exercise.name,
                          cardio_sets: [
                            {
                              set_number: 1,
                              duration: 0,
                              distance: undefined,
                              reps: undefined,
                              calories: undefined,
                              heartRate: undefined,
                            },
                          ],
                          reps: undefined,
                          duration: 0,
                          distance: undefined,
                          calories: undefined,
                          heartRate: undefined,
                          sport_type: "",
                          indoor_outdoor: undefined,
                          weather_conditions: "",
                          device_source: "",
                          avg_cadence_rpm: undefined,
                          avg_power_watts: undefined,
                          avg_speed: undefined,
                          max_speed_kmh: undefined,
                          vo2max_estimate: undefined,
                          training_load_score: undefined,
                          notes: "",
                          sets: [],
                        })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Entries: {strengthCount} strength, {cardioCount} cardio
                  </p>

                  <div className="pb-24" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="text">
               <div className="space-y-4 py-1">
                 <Textarea 
                   value={aiText} 
                   onChange={e => setAiText(e.target.value)} 
                   placeholder="Paste your workout..." 
                   className="min-h-[300px] font-mono" 
                  />
                 <div className="flex justify-end">
                   <Button onClick={onTextSubmit} disabled={isSaving}>
                      {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                      Generate
                   </Button>
                 </div>
               </div>
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t z-50 sm:hidden">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-[42%]"
                onClick={() => setViewerMode((prev) => !prev)}
              >
                {viewerMode ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {viewerMode ? "Edit" : "View"}
              </Button>
              {!viewerMode ? (
                <Button type="submit" disabled={isSaving} className="h-12 w-[58%] shadow-lg">
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                  {workoutId ? "Update" : "Save"}
                </Button>
              ) : (
                <Button type="button" disabled className="h-12 w-[58%] shadow-lg">
                  Preview Active
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
