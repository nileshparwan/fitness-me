"use client";

import { useTransition } from "react";
import { WheelEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Activity, Utensils, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { goalsSchema, GoalsFormValues } from "@/lib/validations/settings";
import { updateGoals } from "@/app/actions/settings";

interface GoalsFormProps {
  initialData: GoalsFormValues;
}

export function GoalsForm({ initialData }: GoalsFormProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: initialData,
  });

  function onSubmit(data: GoalsFormValues) {
    startTransition(async () => {
      try {
        await updateGoals(data);
        toast.success("Goals updated successfully");
      } catch (error) {
        toast.error("Failed to update goals");
      }
    });
  }

  // Prevent scroll changing number values
  const numberProps = {
    type: "number",
    onWheel: (e: WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        {/* SECTION 1: PHYSICAL STATS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle>Body Metrics</CardTitle>
            </div>
            <CardDescription>
              Track your weight and workout frequency to adjust your plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="current_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Weight (kg)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">kg</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Weight (kg)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">kg</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weekly_workouts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly Workouts</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      <Activity className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormDescription>Days you plan to train per week.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* SECTION 2: NUTRITION */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <CardTitle>Nutrition Targets</CardTitle>
            </div>
            <CardDescription>
              Set your daily calorie and macronutrient goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <FormField
                control={form.control}
                name="daily_calories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Calorie Goal</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <Input {...numberProps} {...field} className="pl-10" onChange={e => field.onChange(Number(e.target.value))} />
                            <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">🔥</span>
                            <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">kcal</span>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="grid gap-4 md:grid-cols-3">
                <FormField
                    control={form.control}
                    name="protein_target"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Protein</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">g</span>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="carbs_target"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Carbs</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">g</span>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="fat_target"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fats</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input {...numberProps} {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">g</span>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="lg">
            {isPending ? "Saving Changes..." : "Save Changes"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
