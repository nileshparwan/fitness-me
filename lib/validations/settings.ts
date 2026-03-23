import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  avatar_url: z.url().nullable().optional(),
});

export const coachingDefaultsSchema = z.object({
  preferred_units: z.enum(["metric", "imperial"]),
  default_calories: z.number().int().min(0).max(10000).nullable().optional(),
  default_protein: z.number().int().min(0).max(1000).nullable().optional(),
  default_carbs: z.number().int().min(0).max(1000).nullable().optional(),
  default_fat: z.number().int().min(0).max(1000).nullable().optional(),
});

export const displayPreferencesSchema = z.object({
  compact_mode: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type CoachingDefaultsPayload = z.infer<typeof coachingDefaultsSchema>;
export type DisplayPreferencesPayload = z.infer<typeof displayPreferencesSchema>;
