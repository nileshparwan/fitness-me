import * as z from "zod"

export const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  equipment: z.string().optional(),
  description: z.string().optional(),
  video_url: z.string().optional().or(z.literal("")),
  // FIX: Remove .default([]) to ensure strict string[] type
  muscle_groups: z.array(z.string()),
  aliases: z.array(z.string()),
})

export type ExerciseFormValues = z.infer<typeof exerciseSchema>