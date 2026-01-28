import { z } from "zod";

export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  muscle_groups: z.array(z.string()).min(1, "Select at least one muscle group"),
  equipment: z.string().optional(),
  description: z.string().optional(),
  video_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  // Aliases handled as comma-separated string in UI, converted to array for DB
  aliases: z.string().optional(), 
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;