import { z } from "zod";

// Zod Schema for Sets
const setSchema = z.object({
  id: z.string().optional(),
  // coerce.number handles string -> number conversion safely
  set_number: z.coerce.number(),
  reps: z.coerce.number().min(0, "Reps must be 0+"),
  weight: z.coerce.number().min(0, "Weight must be 0+"),
  rest_seconds: z.coerce.number().min(0).optional(),
  tempo: z.string().max(20).optional(),
  is_warmup: z.boolean().default(false).optional(),
  is_dropset: z.boolean().default(false).optional(),
  is_completed: z.boolean().default(false).optional(),
});

const strengthExerciseSchema = z.object({
  type: z.literal("strength"),
  exercise_id: z.string().optional(),
  name: z.string().min(1, "Exercise name is required"),
  notes: z.string().optional(),
  sets: z.array(setSchema),
});

const cardioExerciseSchema = z.object({
  type: z.literal("cardio"),
  name: z.string().min(1, "Cardio activity is required"),
  exercise_id: z.string().optional(),
  sets: z.array(setSchema).optional(),
  cardio_sets: z.array(
    z.object({
      set_number: z.coerce.number().min(1),
      duration: z.coerce.number().min(0, "Duration must be 0+"),
      distance: z.coerce.number().min(0).optional(),
      reps: z.coerce.number().min(0).optional(),
      calories: z.coerce.number().min(0).optional(),
      heartRate: z.coerce.number().min(0).optional(),
    })
  ).optional(),
  reps: z.coerce.number().min(0).optional(),
  duration: z.coerce.number().min(0, "Duration must be 0+"),
  distance: z.coerce.number().min(0).optional(),
  calories: z.coerce.number().min(0).optional(),
  heartRate: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const exerciseSchema = z.discriminatedUnion("type", [strengthExerciseSchema, cardioExerciseSchema]);

// Main Workout Form Schema
export const workoutFormSchema = z.object({
  name: z.string().min(1, "Workout Name is required"),
  date: z.date(), 
  programIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  overall_rating: z.coerce.number().min(1).max(10).optional(),
  ai_feedback: z.string().optional(),
  template_id: z.string().optional(),
  exercises: z.array(exerciseSchema),
});

// INFER TYPE
export type WorkoutFormValues = z.output<typeof workoutFormSchema>;
