"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { revalidatePath } from "next/cache";
import { profileSchema, goalsSchema, ProfileFormValues, GoalsFormValues } from "@/lib/validations/settings";
import { Database } from "@/types/database";

type GoalsInsert = Database["public"]["Tables"]["fitness_goals"]["Insert"];
type GoalsUpdate = Database["public"]["Tables"]["fitness_goals"]["Update"];

const ALLOWED_GOAL_TYPES = ["weight_loss", "muscle_gain", "strength", "endurance"] as const;
const ALLOWED_GOAL_STATUSES = ["active", "completed"] as const;
type AllowedGoalType = (typeof ALLOWED_GOAL_TYPES)[number];
type AllowedGoalStatus = (typeof ALLOWED_GOAL_STATUSES)[number];

const inferGoalType = (currentWeight: number, targetWeight: number): AllowedGoalType => {
  if (targetWeight < currentWeight) return "weight_loss";
  if (targetWeight > currentWeight) return "muscle_gain";
  return "strength";
};

const normalizeGoalType = (value: string | null | undefined, fallback: AllowedGoalType): AllowedGoalType =>
  ALLOWED_GOAL_TYPES.includes((value || "") as AllowedGoalType) ? (value as AllowedGoalType) : fallback;

const normalizeGoalStatus = (value: string | null | undefined): AllowedGoalStatus =>
  ALLOWED_GOAL_STATUSES.includes((value || "") as AllowedGoalStatus) ? (value as AllowedGoalStatus) : "active";

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
      const { data: existingGoalRows, error: existingGoalError } = await supabase
        .from("fitness_goals")
        .select("id, goal_type")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (existingGoalError) throw existingGoalError;
      const existingGoal = existingGoalRows?.[0] ?? null;

      const inferredGoalType = inferGoalType(parsed.current_weight, parsed.target_weight);
      const goal_type = normalizeGoalType(existingGoal?.goal_type, inferredGoalType);
      const status = normalizeGoalStatus(parsed.status);

      const payload: GoalsUpdate = {
        goal_type,
        target_weight: parsed.target_weight,
        current_weight: parsed.current_weight,
        target_body_fat_percent: parsed.target_body_fat_percent ?? null,
        target_date: parsed.target_date ?? null,
        custom_description: parsed.custom_description ?? null,
        status,
        weekly_workouts: parsed.weekly_workouts,
        daily_calories: parsed.daily_calories,
        protein_target: parsed.protein_target,
        carbs_target: parsed.carbs_target,
        fat_target: parsed.fat_target,
        updated_at: new Date().toISOString(),
      };

      let error: Error | null = null;
      if (existingGoal?.id) {
        const updateRes = await supabase.from("fitness_goals").update(payload).eq("id", existingGoal.id);
        error = updateRes.error;
      } else {
        const insertPayload: GoalsInsert = {
          ...payload,
          user_id: user.id,
          goal_type,
          status,
        };
        const insertRes = await supabase.from("fitness_goals").insert(insertPayload);
        error = insertRes.error;
      }

      if (error) throw error;
      revalidatePath("/settings/goals");
      return { success: true };
    },
  });
}
