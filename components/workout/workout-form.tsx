"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Loader2, Save, Sparkles, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils";
import { ExerciseSelector } from "./exercise-selector";

import { useUser } from "@/hooks/use-user";
import { saveWorkoutFromText } from "@/app/actions/workout-ai";
import { ExerciseCard } from "./exercise-card";
// IMPORT THE MATCHING TYPES
import { WorkoutFormValues, workoutFormSchema } from "@/types/workout";
import { useWorkouts } from "@/hooks/use-workout";
import { usePrograms } from "@/hooks/use-program";
import { MultiSelect } from "@/components/program/multiple-select";
import { linkWorkoutToPrograms } from "@/app/actions/program";
import { Database } from "@/types/database";

type Program = Database['public']['Tables']['programs']['Row'];

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

  // 1. USE THE SCHEMA IN USEFORM
  const form = useForm<WorkoutFormValues>({
    // FIX: Cast resolver to any to bypass strict deep-type mismatch with nested arrays
    resolver: zodResolver(workoutFormSchema) as any,
    // Safe Default Values
    defaultValues: initialData || {
      name: "",
      notes: "",
      date: new Date(),
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

      if (workoutId) {
        // @ts-ignore: Action handles partials fine, schema is strict
        await updateWorkout.mutateAsync({ id: workoutId, data });
        savedId = workoutId;
      } else {
        // @ts-ignore: Action handles form data structure
        const result = await createWorkout.mutateAsync(data);
        savedId = result?.id; 
      }

      if (autoLinkProgramId && savedId) {
        await linkWorkoutToPrograms(savedId, [autoLinkProgramId]);
        toast.success("Linked to Program!");
      }
      
      if (data.programIds && data.programIds.length > 0 && savedId) {
         await linkWorkoutToPrograms(savedId, data.programIds);
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
      const selectedDate = form.getValues("date");
      await saveWorkoutFromText(user.id, aiText, selectedDate);
      toast.success(`Success! Created workout`);
      router.push("/workouts");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to parse workout");
    } finally {
      setIsAiProcessing(false);
    }
  }

  const isSaving = createWorkout.isPending || updateWorkout.isPending || isAiProcessing;

  return (
    <div className="max-w-3xl mx-auto px-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
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

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <ExerciseCard key={field.id} index={index} remove={() => remove(index)} control={form.control} />
                ))}
                <div className="pt-2 pb-24">
                  {/* Default new exercise structure matches Zod schema */}
                  <ExerciseSelector onSelect={(ex) => append({ exercise_id: ex.id, name: ex.name, sets: [{ set_number: 1, reps: 0, weight: 0, is_completed: false }] })} />
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