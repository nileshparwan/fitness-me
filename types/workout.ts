import { z } from "zod";

export const setSchema = z.object({
  id: z.string().optional(),
  set_number: z.number(),
  // z.coerce.number() handles "10" -> 10 conversion automatically
  reps: z.coerce.number().min(0, "Reps required"), 
  weight: z.coerce.number().min(0, "Weight required"),
  rpe: z.coerce.number().min(0).max(10).optional(),
  is_completed: z.boolean().default(false),
});

export const exerciseSchema = z.object({
  exercise_id: z.string(),
  name: z.string(),
  sets: z.array(setSchema),
  notes: z.string().optional(),
});

export const workoutFormSchema = z.object({
  name: z.string().min(1, "Workout name is required"),
  notes: z.string().optional(),
  date: z.date().default(() => new Date()),
  exercises: z.array(exerciseSchema),
  programIds: z.array(z.string()).optional(),
});

export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;