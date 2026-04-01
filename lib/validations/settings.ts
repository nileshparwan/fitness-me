import { z } from "zod";

const genderSchema = z.enum(["male", "female", "non_binary", "prefer_not_to_say"]);
const fitnessLevelSchema = z.enum(["beginner", "intermediate", "advanced", "athlete"]);
const coachSpecialtySchema = z.enum([
  "general_fitness",
  "strength_and_conditioning",
  "weight_management",
  "womens_health",
  "prenatal_and_postnatal",
  "yoga_and_pilates",
  "endurance_and_running",
  "sport_specific",
  "rehabilitation",
]);

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  date_of_birth: z.string().date().nullable().optional(),
  avatar_url: z.string().trim().nullable().optional(),
  gender: genderSchema.nullable().optional(),
  fitness_level: fitnessLevelSchema.nullable().optional(),
  coach_specialty: coachSpecialtySchema.nullable().optional(),
  is_pregnant: z.boolean().optional(),
  due_date: z.string().date().nullable().optional(),
  is_postpartum: z.boolean().optional(),
  postpartum_since: z.string().date().nullable().optional(),
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
