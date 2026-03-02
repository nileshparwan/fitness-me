"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { revalidatePath } from "next/cache";
import { profileSchema, goalsSchema, ProfileFormValues, GoalsFormValues } from "@/lib/validations/settings";
import { Database } from "@/types/database";

type GoalsInsert = Database["public"]["Tables"]["fitness_goals"]["Insert"];

const inferGoalType = (currentWeight: number, targetWeight: number) => {
  if (targetWeight < currentWeight) return "weight_loss";
  if (targetWeight > currentWeight) return "weight_gain";
  return "maintenance";
};

export async function updateProfile(data: ProfileFormValues) {
  return runTrackedAction({
    eventName: "settings.profile.update",
    action: async () => {
      const supabase = await createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const parsed = profileSchema.parse(data);

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: parsed.full_name,
          username: parsed.username,
          bio: parsed.bio,
          website: parsed.website,
          avatar_url: parsed.avatar_url,
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
    },
  });
}
export async function updateGoals(data: GoalsFormValues) {
  return runTrackedAction({
    eventName: "settings.goals.update",
    action: async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Unauthorized");

      const parsed = goalsSchema.parse(data);
      const { data: existingGoal } = await supabase
        .from("fitness_goals")
        .select("goal_type")
        .eq("user_id", user.id)
        .maybeSingle();

      const goal_type = existingGoal?.goal_type || inferGoalType(parsed.current_weight, parsed.target_weight);

      const payload: GoalsInsert = {
        user_id: user.id,
        goal_type,
        target_weight: parsed.target_weight,
        current_weight: parsed.current_weight,
        target_body_fat_percent: parsed.target_body_fat_percent ?? null,
        target_date: parsed.target_date ?? null,
        custom_description: parsed.custom_description ?? null,
        status: parsed.status ?? "active",
        weekly_workouts: parsed.weekly_workouts,
        daily_calories: parsed.daily_calories,
        protein_target: parsed.protein_target,
        carbs_target: parsed.carbs_target,
        fat_target: parsed.fat_target,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("fitness_goals")
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      revalidatePath("/settings/goals");
      return { success: true };
    },
  });
}
