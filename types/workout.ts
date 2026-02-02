import { z } from "zod";

// Zod Schema for Sets
const setSchema = z.object({
  id: z.string().optional(),
  // coerce.number handles string -> number conversion safely
  set_number: z.coerce.number(),
  reps: z.coerce.number().min(0, "Reps must be 0+"),
  weight: z.coerce.number().min(0, "Weight must be 0+"),
  rpe: z.coerce.number().min(0).max(10).optional().nullable(),
  is_completed: z.boolean().default(false).optional(),
});

// Zod Schema for Exercises
const exerciseSchema = z.object({
  exercise_id: z.string().optional(),
  name: z.string().min(1, "Exercise name is required"),
  notes: z.string().optional(),
  sets: z.array(setSchema),
});

// Main Workout Form Schema
export const workoutFormSchema = z.object({
  name: z.string().min(1, "Workout Name is required"),
  date: z.date(), 
  programIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema),
});

// INFER TYPE
export type WorkoutFormValues = z.infer<typeof workoutFormSchema>;