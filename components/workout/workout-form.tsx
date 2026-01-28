"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2, Save, Sparkles, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utils";
import { ExerciseSelector } from "./exercise-selector";

// Import Hooks & Actions
import { useUser } from "@/hooks/use-user";
import { saveWorkoutFromText } from "@/app/actions/workout-ai";
import { ExerciseCard } from "./exercise-card";
import { WorkoutFormValues, workoutFormSchema } from "@/types/workout";
import { useWorkouts } from "@/hooks/use-workout";
import { usePrograms } from "@/hooks/use-program";
import { MultiSelect } from "@/components/program/multiple-select";
import { useSearchParams } from "next/navigation";
import { linkWorkoutToPrograms } from "@/app/actions/program";

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

  // Form Setup
  const form = useForm({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: initialData || {
      name: "",
      notes: "",
      date: new Date(),
      exercises: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const programOptions = programs.data?.map((p: any) => ({
    label: p.name,
    value: p.id
  })) || [];

  async function onFormSubmit(data: WorkoutFormValues) {
    try {
      let savedWorkout;

      if (workoutId) {
        await updateWorkout.mutateAsync({ id: workoutId, data });
        savedWorkout = { id: workoutId };
      } else {
        savedWorkout = await createWorkout.mutateAsync(data);
      }

      if (autoLinkProgramId && savedWorkout?.id) {
        await linkWorkoutToPrograms(savedWorkout.id, [autoLinkProgramId]);
        toast.success("Linked to Program!");
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
      console.log("Submitting AI Text:", aiText, "for date:", selectedDate);
      const result = await saveWorkoutFromText(user.id, aiText, selectedDate);
      console.log("AI Workout Result:", result);
      toast.success(`Success! Created ${result.queueId} workout(s)`);
      // router.push("/workouts");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to parse workout");
    } finally {
      setIsAiProcessing(false);
    }
  }

  const isSaving = createWorkout.isPending || updateWorkout.isPending || isAiProcessing;

  return (
    <div className="max-w-3xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">

          {/* 1. WRAP EVERYTHING IN TABS */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                <TabsTrigger value="form">Builder</TabsTrigger>
                <TabsTrigger value="text">
                  <Sparkles className="w-3 h-3 mr-2 text-purple-500" />
                  AI Text
                </TabsTrigger>
              </TabsList>

              {/* Desktop Save Button */}
              <Button type="submit" disabled={isSaving} className="hidden sm:flex" size="lg">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isSaving && <Save className="mr-2 h-4 w-4" />}
                {workoutId ? "Update" : "Save"}
              </Button>
            </div>

            {/* --- TAB CONTENT 1: FORM --- */}
            <TabsContent value="form" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              
              {/* Header Inputs */}
              <Card className="border-none shadow-none bg-transparent md:border md:shadow-sm md:bg-card">
                <CardContent className="p-0 md:p-6 space-y-4">
                  <div className="flex flex-col gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="md:hidden text-muted-foreground">Workout Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Pull Day - Hypertrophy"
                              className="text-lg md:text-2xl font-bold md:border-none md:px-0 md:shadow-none focus-visible:ring-0 h-12 md:h-auto bg-background md:bg-transparent"
                              {...field}
                            />
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
                            <FormLabel className="md:hidden text-muted-foreground">Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full md:w-[240px] pl-3 text-left font-normal h-12", !field.value && "text-muted-foreground")}>
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
                            <FormLabel className="md:hidden text-muted-foreground">Program</FormLabel>
                            <FormControl>
                              <MultiSelect
                                selected={field.value || []}
                                options={programOptions}
                                onChange={field.onChange}
                                placeholder="Attach to Program..."
                                className="h-12"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exercises List */}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="scroll-mt-20">
                    <ExerciseCard
                      index={index}
                      remove={() => remove(index)}
                      form={form}
                    />
                  </div>
                ))}

                <div className="pt-4 pb-32 md:pb-0">
                  <ExerciseSelector
                    onSelect={(ex) => append({
                      exercise_id: ex.id,
                      name: ex.name,
                      sets: [{ set_number: 1, reps: 0, weight: 0, is_completed: false }]
                    })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* --- TAB CONTENT 2: AI TEXT --- */}
            <TabsContent value="text" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Paste Your Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder={`Example:\nDay 1: Chest\nBench Press: 3 sets of 10 @ 60kg\nIncline DB Press: 3x12...`}
                    className="min-h-[300px] font-mono text-sm leading-relaxed p-4"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                  />

                  <div className="flex justify-end">
                    <Button onClick={onTextSubmit} disabled={isSaving} className="w-full md:w-auto">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Process with AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {/* --- MOBILE STICKY FOOTER --- */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50 sm:hidden">
            <Button type="submit" disabled={isSaving} className="w-full h-12 text-lg shadow-lg" size="lg">
              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
              {workoutId ? "Update Session" : "Save Session"}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}