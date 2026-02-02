"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { profileSchema, goalsSchema, ProfileFormValues, GoalsFormValues } from "@/lib/validations/settings";

export async function updateProfile(data: ProfileFormValues) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Validate data server-side before sending to DB
  const parsed = profileSchema.parse(data);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.full_name,
      username: parsed.username,
      bio: parsed.bio,
      website: parsed.website,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
  revalidatePath("/settings/profile");
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