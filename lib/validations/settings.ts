import { z } from "zod";

export const profileSchema = z.object({
  // Basic
  full_name: z.string().min(2).optional(),
  username: z.string().min(3).max(20).optional(),
  bio: z.string().max(160).optional(),
  avatar_url: z.string().url().optional(),

  height: z.number().min(0).max(300).optional(), // cm
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(), // YYYY-MM-DD
  
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  
  activity_level: z.enum([
    'sedentary', 
    'lightly_active', 
    'moderately_active', 
    'very_active', 
    'extremely_active'
  ]).default('moderately_active'),

  preferred_units: z.enum(['metric', 'imperial']).default('metric'),
});


export const goalsSchema = z.object({
  current_weight: z.number().min(0),
  target_weight: z.number().min(0),
  target_body_fat_percent: z.number().min(0).max(100).optional().nullable(),
  target_date: z.string().optional().nullable(),
  custom_description: z.string().max(500).optional().nullable(),
  // Keep aligned with DB check constraint (goals_status_check)
  status: z.enum(["active", "completed"]).optional().nullable(),
  weekly_workouts: z.number().min(0).max(21),
  daily_calories: z.number().min(500),
  protein_target: z.number().min(0),
  carbs_target: z.number().min(0),
  fat_target: z.number().min(0),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type GoalsFormValues = z.infer<typeof goalsSchema>;
