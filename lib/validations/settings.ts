import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(2).max(30),
  bio: z.string().max(160).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const goalsSchema = z.object({
  current_weight: z.number().min(0),
  target_weight: z.number().min(0),
  weekly_workouts: z.number().min(0).max(21),
  daily_calories: z.number().min(500),
  protein_target: z.number().min(0),
  carbs_target: z.number().min(0),
  fat_target: z.number().min(0),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type GoalsFormValues = z.infer<typeof goalsSchema>;