import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type SubjectRef = {
  subject_user_id: string | null;
  subject_client_id: string | null;
};

export type ResolvedNutritionTarget = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: "fitness_goal" | "profile_default" | "none";
};

async function resolveHistorySubjectUserId(
  supabase: SupabaseClient<Database>,
  subject: SubjectRef
) {
  if (subject.subject_user_id) return subject.subject_user_id;
  if (!subject.subject_client_id) return null;

  const { data: client, error } = await supabase
    .from("clients")
    .select("linked_user_id")
    .eq("id", subject.subject_client_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return client?.linked_user_id ?? null;
}

export async function resolveGoalTargetForDate(
  supabase: SupabaseClient<Database>,
  subject: SubjectRef,
  performedOn: string
): Promise<ResolvedNutritionTarget> {
  const targetUserId = await resolveHistorySubjectUserId(supabase, subject);
  if (!targetUserId) {
    return { calories: null, protein_g: null, carbs_g: null, fat_g: null, source: "none" };
  }

  const { data: historyRow, error } = await supabase
    .from("nutrition_target_history")
    .select("calories, protein_g, carbs_g, fat_g")
    .eq("subject_user_id", targetUserId)
    .lte("effective_from", performedOn)
    .or(`effective_to.is.null,effective_to.gt.${performedOn}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!historyRow) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("default_calories, default_protein, default_carbs, default_fat")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    const hasProfileDefaults =
      profile &&
      [profile.default_calories, profile.default_protein, profile.default_carbs, profile.default_fat].some(
        (value) => typeof value === "number" && Number.isFinite(value) && value > 0
      );

    if (!hasProfileDefaults) {
      return { calories: null, protein_g: null, carbs_g: null, fat_g: null, source: "none" };
    }

    return {
      calories: profile.default_calories,
      protein_g: profile.default_protein,
      carbs_g: profile.default_carbs,
      fat_g: profile.default_fat,
      source: "profile_default",
    };
  }

  return {
    calories: historyRow.calories,
    protein_g: historyRow.protein_g,
    carbs_g: historyRow.carbs_g,
    fat_g: historyRow.fat_g,
    source: "fitness_goal",
  };
}
