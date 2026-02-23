"use client";

import { useState } from "react";
import { Resolver, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Loader2, Save, Sparkles, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils";
import { ExerciseSelector } from "./exercise-selector";

import { useUser } from "@/hooks/use-user";
import { ExerciseCard } from "./exercise-card";
// IMPORT THE MATCHING TYPES
import { WorkoutFormValues, workoutFormSchema } from "@/types/workout";
import { useWorkouts } from "@/hooks/use-workout";
import { usePrograms } from "@/hooks/use-program";
import { MultiSelect } from "@/components/program/multiple-select";
import { linkWorkoutToPrograms } from "@/app/actions/program";
import { Database } from "@/types/database";
import type { WorkoutActionInput } from "@/app/actions/workout";

type Program = Database['public']['Tables']['training_plans']['Row'];

interface WorkoutFormProps {
  initialData?: WorkoutFormValues;
  workoutId?: string;
}

export function WorkoutForm({ initialData, workoutId }: WorkoutFormProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { createWorkout, updateWorkout } = useWorkouts();
  const { programs } = usePrograms();
  const searchParams = useSearchParams();
  const autoLinkProgramId = searchParams.get("programId");

  const [mode, setMode] = useState<"form" | "text">("form");
  const [aiText, setAiText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const toWorkoutActionInput = (data: WorkoutFormValues): WorkoutActionInput => ({
    name: data.name,
    date: data.date,
    notes: data.notes || null,
    overall_rating: data.overall_rating,
    ai_feedback: data.ai_feedback,
    template_id: data.template_id,
    exercises: data.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      group_id: exercise.group_id,
      name: exercise.name,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rest_seconds: set.rest_seconds,
        tempo: set.tempo,
        is_warmup: set.is_warmup,
        is_dropset: set.is_dropset,
        form_video_url: set.form_video_url,
      })),
    })),
  });

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema) as Resolver<WorkoutFormValues>,
    defaultValues: initialData || {
      name: "",
      notes: "",
      date: new Date(),
      overall_rating: undefined,
      ai_feedback: "",
      template_id: "",
      exercises: [],
      programIds: []
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const programOptions = (programs.data as Program[])?.map((p) => ({
    label: p.name,
    value: p.id
  })) || [];

  async function onFormSubmit(data: WorkoutFormValues) {
    try {
      let savedId: string | undefined;
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
    } catch (error) {
      toast.error("Failed to save workout");
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

  return (
    <div className="max-w-3xl mx-auto px-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs
            value={mode}
            onValueChange={(value) => {
              if (value === "form" || value === "text") setMode(value);
            }}
            className="w-full"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                <TabsTrigger value="form">Builder</TabsTrigger>
                <TabsTrigger value="text"><Sparkles className="w-3 h-3 mr-2 text-purple-500" />AI Text</TabsTrigger>
              </TabsList>
              <Button type="submit" disabled={isSaving} className="hidden sm:flex" size="lg">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {workoutId ? "Update" : "Save"}
              </Button>
            </div>

            <TabsContent value="form" className="space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6 space-y-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
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
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <MultiSelect selected={field.value || []} options={programOptions} onChange={field.onChange} placeholder="Attach to Program..." />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="overall_rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Rating (1-10)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            placeholder="How hard/effective was this session?"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="template_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template ID (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="Link this workout to a template id"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ai_feedback"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>AI Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="Coach notes, observations, and next-session guidance"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <ExerciseCard key={field.id} index={index} remove={() => remove(index)} control={form.control} />
                ))}
                <div className="pt-2 pb-24">
                  {/* Default new exercise structure matches Zod schema */}
                  <ExerciseSelector
                    onSelect={(ex) =>
                      append({
                        exercise_id: ex.id,
                        name: ex.name,
                        notes: "",
                        group_id: "",
                        sets: [
                          {
                            set_number: 1,
                            reps: 0,
                            weight: 0,
                            rest_seconds: 90,
                            tempo: "",
                            is_warmup: false,
                            is_dropset: false,
                            form_video_url: "",
                            is_completed: false,
                          },
                        ],
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text">
               <Card>
                <CardContent className="p-4">
                   <Textarea 
                     value={aiText} 
                     onChange={e => setAiText(e.target.value)} 
                     placeholder="Paste your workout..." 
                     className="min-h-[300px] font-mono" 
                    />
                   <div className="flex justify-end mt-4">
                     <Button onClick={onTextSubmit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                        Generate
                     </Button>
                   </div>
                </CardContent>
               </Card>
            </TabsContent>
          </Tabs>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t z-50 sm:hidden">
            <Button type="submit" disabled={isSaving} className="w-full h-12 shadow-lg">
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
              {workoutId ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
