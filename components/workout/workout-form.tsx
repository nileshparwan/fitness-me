"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Loader2, Save, Trash2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Shadcn Tabs
import { cn } from "@/utils";
import { ExerciseSelector } from "./exercise-selector";

// Import Hooks & Actions
import { useUser } from "@/hooks/use-user";
import { saveWorkoutFromText } from "@/app/actions/workout-ai"; 
import { ExerciseCard } from "./exercise-card";
import { WorkoutFormValues, workoutFormSchema } from "@/types/workout";
import { useWorkouts } from "@/hooks/use-workout";

interface WorkoutFormProps {
  initialData?: WorkoutFormValues;
  workoutId?: string;
}

export function WorkoutForm({ initialData, workoutId }: WorkoutFormProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { createWorkout, updateWorkout } = useWorkouts();
  
  // State for Tabs
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

  // --- HANDLER: Structured Form Submit ---
  async function onFormSubmit(data: WorkoutFormValues) {
    try {
      if (workoutId) {
        await updateWorkout.mutateAsync({ id: workoutId, data });
        router.push(`/workouts/${workoutId}`);
      } else {
        await createWorkout.mutateAsync(data);
        router.push("/workouts");
      }
    } catch (error) {
      toast.error("Failed to save workout");
    }
  }

  // --- HANDLER: AI Text Submit ---
  async function onTextSubmit() {
    if (!aiText.trim()) return toast.error("Please enter your workout details");
    if (!user) return toast.error("You must be logged in");

    setIsAiProcessing(true);
    try {
      // Use the date from the form picker even in Text Mode
      const selectedDate = form.getValues("date");
      
      const result = await saveWorkoutFromText(user.id, aiText, selectedDate);
      
      toast.success(`Success! Created ${result.count} workout(s)`);
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
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
      
      {/* MODE TOGGLE */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Builder Mode</TabsTrigger>
          <TabsTrigger value="text">
            <Sparkles className="w-3 h-3 mr-2" />
            AI Text Mode
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: FORM BUILDER --- */}
        <TabsContent value="form">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8">
              
              {/* Header Section (Name & Date) */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 space-y-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Workout Name (e.g., Pull Day)" 
                            className="text-2xl font-bold border-none px-0 shadow-none focus-visible:ring-0 h-auto"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                </div>
                
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {workoutId ? "Update Workout" : "Save Workout"}
                </Button>
              </div>

              {/* Exercises List */}
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <ExerciseCard 
                    key={field.id} 
                    index={index} 
                    remove={() => remove(index)} 
                    form={form} 
                  />
                ))}
                
                <ExerciseSelector 
                  onSelect={(ex) => append({ 
                    exercise_id: ex.id, 
                    name: ex.name, 
                    sets: [{ set_number: 1, reps: 0, weight: 0, is_completed: false }]
                  })} 
                />
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* --- TAB 2: AI TEXT MODE --- */}
        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paste Your Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">
                 Paste your full workout below. We'll automatically identify exercises, sets, reps, and weights. 
                 <br />
                 <strong>Tip:</strong> You can paste an entire week's schedule (Day 1... Day 5) and we will create separate workouts for each.
               </p>
               
               <Textarea 
                 placeholder={`Example:\nDay 1: Chest\nBench Press: 3 sets of 10 @ 60kg\nIncline DB Press: 3x12...`}
                 className="min-h-[300px] font-mono text-sm"
                 value={aiText}
                 onChange={(e) => setAiText(e.target.value)}
               />

               <div className="flex justify-end">
                 <Button onClick={onTextSubmit} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing & Saving...
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
    </div>
  );
}