"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { profileSchema, goalsSchema, ProfileFormValues, GoalsFormValues } from "@/lib/validations/settings";

export async function updateProfile(data: ProfileFormValues) {
  const supabase = await createClient();
  
  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Validate Data (Crucial now that DB constraints are gone)
  const parsed = profileSchema.parse(data);

  // 3. Update User Metadata
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: parsed.full_name,
      username: parsed.username,
      bio: parsed.bio,
      website: parsed.website,
      avatar_url: parsed.avatar_url,
      
      // Fitness Data
      height: parsed.height,
      birth_date: parsed.birth_date,
      gender: parsed.gender,
      activity_level: parsed.activity_level,
      preferred_units: parsed.preferred_units,
      timezone: parsed.timezone,
      
      updatedAt: new Date().toISOString(),
    }
  });

  if (error) throw error;
  
  revalidatePath("/settings/profile");
  return { success: true };
}
export async function updateGoals(data: GoalsFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const parsed = goalsSchema.parse(data);

  const { error } = await supabase
    .from("goals")
    .upsert({
      user_id: user.id,
      goal_type: "weight_loss", // Defaulting to this as it's required
      target_weight: parsed.target_weight,
      current_weight: parsed.current_weight,
      weekly_workouts: parsed.weekly_workouts,
      daily_calories: parsed.daily_calories,
      protein_target: parsed.protein_target,
      carbs_target: parsed.carbs_target,
      fat_target: parsed.fat_target,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
  revalidatePath("/settings/goals");
}