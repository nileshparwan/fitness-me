"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { getRoleContext } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type DailyBiofeedbackInsert = Database["public"]["Tables"]["daily_biofeedback"]["Insert"];
type DailyActivityInsert = Database["public"]["Tables"]["daily_activity"]["Insert"];
type NutritionLogInsert = Database["public"]["Tables"]["nutrition_logs"]["Insert"];
type NutritionMealInsert = Database["public"]["Tables"]["nutrition_meals"]["Insert"];
type WeeklyCheckinInsert = Database["public"]["Tables"]["weekly_checkins"]["Insert"];
type VitalsInsert = Database["public"]["Tables"]["vitals_log"]["Insert"];
type SleepInsert = Database["public"]["Tables"]["sleep_log"]["Insert"];
type WearableInsert = Database["public"]["Tables"]["wearable_integrations"]["Insert"];

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const biofeedbackSchema = z.object({
  date: isoDateSchema,
  sleep_hours: z.number().min(0).max(24).optional(),
  sleep_quality: z.number().int().min(1).max(5).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  muscle_soreness: z.number().int().min(1).max(5).optional(),
  stress_level: z.number().int().min(1).max(5).optional(),
  motivation: z.number().int().min(1).max(5).optional(),
  perceived_fatigue: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

const dailyActivitySchema = z.object({
  date: isoDateSchema,
  steps: z.number().int().min(0).optional(),
  floors_climbed: z.number().int().min(0).optional(),
  active_minutes: z.number().int().min(0).optional(),
  sedentary_minutes: z.number().int().min(0).optional(),
  active_calories_burned: z.number().min(0).optional(),
  total_calories_burned: z.number().min(0).optional(),
  distance_km: z.number().min(0).optional(),
  source: z.enum(["manual", "apple_health", "google_fit", "garmin", "oura", "fitbit", "whoop", "polar", "strava"]).optional(),
  raw_sync_data: z.record(z.string(), z.unknown()).optional(),
});

const nutritionLogSchema = z.object({
  date: isoDateSchema,
  tracking_mode: z.enum(["macro", "habit", "intuitive"]).default("macro"),
  total_calories: z.number().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  fiber_g: z.number().min(0).optional(),
  sugar_g: z.number().min(0).optional(),
  sodium_mg: z.number().min(0).optional(),
  water_ml: z.number().min(0).optional(),
  adherence_rating: z.number().int().min(1).max(5).optional(),
  supplement_notes: z.string().max(2000).optional(),
  notes: z.string().max(4000).optional(),
});

const nutritionMealSchema = z.object({
  log_id: z.string().uuid(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"]),
  meal_time: z.string().datetime().optional(),
  food_description: z.string().min(1).max(4000),
  calories: z.number().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  photo_url: z.string().url().optional(),
});

const weeklyCheckinSchema = z.object({
  week_start_date: isoDateSchema,
  waist_cm: z.number().min(0).optional(),
  photo_front_url: z.string().url().optional(),
  photo_side_url: z.string().url().optional(),
  photo_back_url: z.string().url().optional(),
  nutrition_adherence_days: z.number().int().min(0).max(7).optional(),
  user_notes: z.string().max(4000).optional(),
});

const vitalsSchema = z.object({
  recorded_at: z.string().datetime(),
  resting_heart_rate: z.number().int().min(20).max(250).optional(),
  hrv_ms: z.number().min(0).optional(),
  spo2_percent: z.number().min(50).max(100).optional(),
  systolic_bp: z.number().int().min(50).max(260).optional(),
  diastolic_bp: z.number().int().min(30).max(180).optional(),
  body_temperature_c: z.number().min(30).max(45).optional(),
  respiratory_rate: z.number().min(0).max(80).optional(),
  source: z.enum(["manual", "apple_health", "google_fit", "garmin", "oura", "fitbit", "whoop", "polar", "strava"]).optional(),
  raw_sync_data: z.record(z.string(), z.unknown()).optional(),
});

const sleepSchema = z.object({
  date: isoDateSchema,
  sleep_start: z.string().datetime().optional(),
  sleep_end: z.string().datetime().optional(),
  total_duration_minutes: z.number().int().min(0).optional(),
  deep_sleep_minutes: z.number().int().min(0).optional(),
  rem_sleep_minutes: z.number().int().min(0).optional(),
  light_sleep_minutes: z.number().int().min(0).optional(),
  awake_minutes: z.number().int().min(0).optional(),
  sleep_score: z.number().int().min(0).max(100).optional(),
  source: z.enum(["manual", "apple_health", "google_fit", "garmin", "oura", "fitbit", "whoop", "polar", "strava"]).optional(),
  raw_sync_data: z.record(z.string(), z.unknown()).optional(),
});

const wearableSchema = z.object({
  provider: z.enum(["garmin", "apple_health", "google_fit", "oura", "whoop", "polar", "strava", "fitbit", "manual"]),
  access_token_ref: z.string().max(512).optional(),
  refresh_token_ref: z.string().max(512).optional(),
  token_expires_at: z.string().datetime().optional(),
  sync_scope: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

async function requireAuthenticatedUser() {
  const context = await getRoleContext();
  if (!context) throw new Error("Unauthorized");
  return context;
}

export async function upsertDailyBiofeedbackAction(input: z.input<typeof biofeedbackSchema>) {
  const payload = biofeedbackSchema.parse(input);
  return runTrackedAction({
    eventName: "biofeedback.save",
    payload: { date: payload.date },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const data: DailyBiofeedbackInsert = {
        user_id: context.userId,
        date: payload.date,
        sleep_hours: payload.sleep_hours ?? null,
        sleep_quality: payload.sleep_quality ?? null,
        energy_level: payload.energy_level ?? null,
        mood: payload.mood ?? null,
        muscle_soreness: payload.muscle_soreness ?? null,
        stress_level: payload.stress_level ?? null,
        motivation: payload.motivation ?? null,
        perceived_fatigue: payload.perceived_fatigue ?? null,
        notes: payload.notes ?? null,
      };

      const { error } = await supabase
        .from("daily_biofeedback")
        .upsert(data, { onConflict: "user_id,date" });
      if (error) throw new Error(error.message);

      revalidatePath("/dashboard");
      revalidatePath("/progress");
      return { success: true };
    },
  });
}

export async function upsertDailyActivityAction(input: z.input<typeof dailyActivitySchema>) {
  const payload = dailyActivitySchema.parse(input);
  return runTrackedAction({
    eventName: "activity.save",
    payload: { date: payload.date, source: payload.source ?? "manual" },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: DailyActivityInsert = {
        user_id: context.userId,
        date: payload.date,
        source: payload.source ?? "manual",
        steps: payload.steps ?? null,
        floors_climbed: payload.floors_climbed ?? null,
        active_minutes: payload.active_minutes ?? null,
        sedentary_minutes: payload.sedentary_minutes ?? null,
        active_calories_burned: payload.active_calories_burned ?? null,
        total_calories_burned: payload.total_calories_burned ?? null,
        distance_km: payload.distance_km ?? null,
        raw_sync_data: (payload.raw_sync_data ?? null) as Database["public"]["Tables"]["daily_activity"]["Insert"]["raw_sync_data"],
      };

      const { error } = await supabase
        .from("daily_activity")
        .upsert(row, { onConflict: "user_id,date,source" });
      if (error) throw new Error(error.message);

      revalidatePath("/dashboard");
      return { success: true };
    },
  });
}

export async function upsertNutritionLogAction(input: z.input<typeof nutritionLogSchema>) {
  const payload = nutritionLogSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.log.save",
    payload: { date: payload.date, tracking_mode: payload.tracking_mode },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: NutritionLogInsert = {
        user_id: context.userId,
        date: payload.date,
        tracking_mode: payload.tracking_mode,
        total_calories: payload.total_calories ?? null,
        protein_g: payload.protein_g ?? null,
        carbs_g: payload.carbs_g ?? null,
        fat_g: payload.fat_g ?? null,
        fiber_g: payload.fiber_g ?? null,
        sugar_g: payload.sugar_g ?? null,
        sodium_mg: payload.sodium_mg ?? null,
        water_ml: payload.water_ml ?? null,
        adherence_rating: payload.adherence_rating ?? null,
        supplement_notes: payload.supplement_notes ?? null,
        notes: payload.notes ?? null,
      };

      const { data, error } = await supabase
        .from("nutrition_logs")
        .upsert(row, { onConflict: "user_id,date" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      revalidatePath("/nutrition");
      revalidatePath("/progress/nutrition");
      return { success: true, log_id: data.id };
    },
  });
}

export async function addNutritionMealAction(input: z.input<typeof nutritionMealSchema>) {
  const payload = nutritionMealSchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.meal.log.create",
    payload: { log_id: payload.log_id, meal_type: payload.meal_type },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: NutritionMealInsert = {
        user_id: context.userId,
        log_id: payload.log_id,
        meal_type: payload.meal_type,
        meal_time: payload.meal_time ?? null,
        food_description: payload.food_description,
        calories: payload.calories ?? null,
        protein_g: payload.protein_g ?? null,
        carbs_g: payload.carbs_g ?? null,
        fat_g: payload.fat_g ?? null,
        photo_url: payload.photo_url ?? null,
      };

      const { error } = await supabase.from("nutrition_meals").insert(row);
      if (error) throw new Error(error.message);

      revalidatePath("/nutrition");
      return { success: true };
    },
  });
}

export async function getNutritionLogForDateAction(date: string) {
  const safeDate = isoDateSchema.parse(date);
  return runTrackedAction({
    eventName: "nutrition.log.read",
    payload: { date: safeDate },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const { data: log, error: logError } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", context.userId)
        .eq("date", safeDate)
        .maybeSingle();
      if (logError) throw new Error(logError.message);

      if (!log) return { log: null, meals: [] };

      const { data: meals, error: mealsError } = await supabase
        .from("nutrition_meals")
        .select("*")
        .eq("log_id", log.id)
        .order("created_at", { ascending: true });
      if (mealsError) throw new Error(mealsError.message);

      return { log, meals: meals || [] };
    },
  });
}

export async function upsertWeeklyCheckinAction(input: z.input<typeof weeklyCheckinSchema>) {
  const payload = weeklyCheckinSchema.parse(input);
  return runTrackedAction({
    eventName: "weekly.checkin.save",
    payload: { week_start_date: payload.week_start_date },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: WeeklyCheckinInsert = {
        user_id: context.userId,
        week_start_date: payload.week_start_date,
        waist_cm: payload.waist_cm ?? null,
        photo_front_url: payload.photo_front_url ?? null,
        photo_side_url: payload.photo_side_url ?? null,
        photo_back_url: payload.photo_back_url ?? null,
        nutrition_adherence_days: payload.nutrition_adherence_days ?? null,
        user_notes: payload.user_notes ?? null,
      };

      const { error } = await supabase
        .from("weekly_checkins")
        .upsert(row, { onConflict: "user_id,week_start_date" });
      if (error) throw new Error(error.message);

      revalidatePath("/progress");
      return { success: true };
    },
  });
}

export async function upsertVitalsLogAction(input: z.input<typeof vitalsSchema>) {
  const payload = vitalsSchema.parse(input);
  return runTrackedAction({
    eventName: "vitals.save",
    payload: { recorded_at: payload.recorded_at },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: VitalsInsert = {
        user_id: context.userId,
        recorded_at: payload.recorded_at,
        resting_heart_rate: payload.resting_heart_rate ?? null,
        hrv_ms: payload.hrv_ms ?? null,
        spo2_percent: payload.spo2_percent ?? null,
        systolic_bp: payload.systolic_bp ?? null,
        diastolic_bp: payload.diastolic_bp ?? null,
        body_temperature_c: payload.body_temperature_c ?? null,
        respiratory_rate: payload.respiratory_rate ?? null,
        source: payload.source ?? "manual",
        raw_sync_data: (payload.raw_sync_data ?? null) as Database["public"]["Tables"]["vitals_log"]["Insert"]["raw_sync_data"],
      };

      const { error } = await supabase.from("vitals_log").insert(row);
      if (error) throw new Error(error.message);

      revalidatePath("/progress");
      return { success: true };
    },
  });
}

export async function upsertSleepLogAction(input: z.input<typeof sleepSchema>) {
  const payload = sleepSchema.parse(input);
  return runTrackedAction({
    eventName: "sleep.log.save",
    payload: { date: payload.date },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: SleepInsert = {
        user_id: context.userId,
        date: payload.date,
        sleep_start: payload.sleep_start ?? null,
        sleep_end: payload.sleep_end ?? null,
        total_duration_minutes: payload.total_duration_minutes ?? null,
        deep_sleep_minutes: payload.deep_sleep_minutes ?? null,
        rem_sleep_minutes: payload.rem_sleep_minutes ?? null,
        light_sleep_minutes: payload.light_sleep_minutes ?? null,
        awake_minutes: payload.awake_minutes ?? null,
        sleep_score: payload.sleep_score ?? null,
        source: payload.source ?? "manual",
        raw_sync_data: (payload.raw_sync_data ?? null) as Database["public"]["Tables"]["sleep_log"]["Insert"]["raw_sync_data"],
      };

      const { error } = await supabase
        .from("sleep_log")
        .upsert(row, { onConflict: "user_id,date,source" });
      if (error) throw new Error(error.message);

      revalidatePath("/progress");
      return { success: true };
    },
  });
}

export async function listWearableIntegrationsAction() {
  return runTrackedAction({
    eventName: "wearables.list.read",
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("wearable_integrations")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      return data || [];
    },
  });
}

export async function upsertWearableIntegrationAction(input: z.input<typeof wearableSchema>) {
  const payload = wearableSchema.parse(input);
  return runTrackedAction({
    eventName: "wearables.upsert",
    payload: { provider: payload.provider },
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const row: WearableInsert = {
        user_id: context.userId,
        provider: payload.provider,
        access_token_ref: payload.access_token_ref ?? null,
        refresh_token_ref: payload.refresh_token_ref ?? null,
        token_expires_at: payload.token_expires_at ?? null,
        is_active: payload.is_active ?? true,
        sync_scope: payload.sync_scope ?? null,
        metadata: (payload.metadata ?? null) as Database["public"]["Tables"]["wearable_integrations"]["Insert"]["metadata"],
      };

      const { error } = await supabase
        .from("wearable_integrations")
        .upsert(row, { onConflict: "user_id,provider" });
      if (error) throw new Error(error.message);

      revalidatePath("/settings/wearables");
      return { success: true };
    },
  });
}

export async function getMyAssignedProgramsAction() {
  return runTrackedAction({
    eventName: "programs.assigned.read",
    action: async () => {
      const context = await requireAuthenticatedUser();
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("assigned_programs")
        .select(`
          *,
          training_plans(id, name, description, is_active),
          meal_plans(id, name, description, status)
        `)
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
  });
}
