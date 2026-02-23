"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { subMonths, subYears } from "date-fns";
import { calculatePaceMinutesPerKm, estimateOneRepMax } from "@/utils/fitness-logic";
import { z } from "zod";

type StrengthLogRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type CardioLogRow = Database["public"]["Tables"]["cardio_sessions"]["Row"];
type BodyMetricRow = Pick<
  Database["public"]["Tables"]["body_measurements"]["Row"],
  "date" | "weight" | "body_fat_percent" | "muscle_mass_kg" | "waist_cm"
>;

export type StrengthChartPoint = {
  date: string;
  estimated_1rm: number;
  volume: number;
  bodyWeight: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  waistCm: number | null;
  totalRest: number;
};

export type CardioChartPoint = {
  date: string;
  pace: number;
  heart_rate: number;
  distance: number;
};

type ExerciseMetricsResult =
  | {
      type: "cardio";
      logs: CardioLogRow[];
      chartData: CardioChartPoint[];
    }
  | {
      type: "strength";
      logs: StrengthLogRow[];
      chartData: StrengthChartPoint[];
    };

const rangeSchema = z.enum(["1M", "6M", "1Y", "ALL"]);
const exerciseSchema = z.string().trim().min(1).max(120);

export async function getAvailableExercises() {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: workouts } = await supabase.from("training_sessions").select("id").eq("user_id", user.id);
    const workoutIds = (workouts || []).map((workout) => workout.id);

    const strengthPromise = workoutIds.length
      ? supabase
          .from("strength_sets")
          .select("exercise_name")
          .in("workout_id", workoutIds)
          .not("exercise_name", "is", null)
      : Promise.resolve({ data: [] as { exercise_name: string }[] });

    const cardioPromise = supabase
      .from("cardio_sessions")
      .select("activity_type")
      .eq("user_id", user.id)
      .not("activity_type", "is", null);

    const [{ data: strength }, { data: cardio }] = await Promise.all([strengthPromise, cardioPromise]);

    const names = new Set([
        ...(strength?.map(d => d.exercise_name) || []),
        ...(cardio?.map(d => d.activity_type) || []),
    ]);

    return Array.from(names).sort();
}

export async function getMuscleBalance() {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: workouts } = await supabase.from("training_sessions").select("id").eq("user_id", user.id);
    const workoutIds = (workouts || []).map((workout) => workout.id);
    if (workoutIds.length === 0) return [];
    type WorkoutLogWithLibrary = Pick<
      Database["public"]["Tables"]["strength_sets"]["Row"],
      "exercise_name" | "exercise_id"
    > & {
      exercise_catalog: {
        category: string | null;
        muscle_groups: string[] | null;
      } | null;
    };

    const { data, error } = await supabase
        .from("strength_sets")
        .select(`
        exercise_name,
        exercise_id,
        exercise_catalog (
          category,
          muscle_groups
        )
      `)
        .in("workout_id", workoutIds)
        .gte("created_at", subMonths(new Date(), 1).toISOString());

    if (error || !data) {
        console.error("Balance Error:", error);
        return [];
    }

    const scores: Record<"Push" | "Pull" | "Legs" | "Core", number> = {
      Push: 0,
      Pull: 0,
      Legs: 0,
      Core: 0,
    };

    (data as WorkoutLogWithLibrary[]).forEach((log) => {
        let category: "Push" | "Pull" | "Legs" | "Core" = "Core";

        // Strategy 1: Database Category
        if (log.exercise_catalog?.category) {
            const dbCat = log.exercise_catalog.category.toLowerCase();
            if (dbCat === 'strength') {
                const muscles = log.exercise_catalog.muscle_groups || [];
                if (muscles.some((m: string) => m.match(/chest|tricep|shoulder|push/i))) category = "Push";
                else if (muscles.some((m: string) => m.match(/back|bicep|lat|trap|pull/i))) category = "Pull";
                else if (muscles.some((m: string) => m.match(/leg|quad|hamstring|glute|calf/i))) category = "Legs";
            } else {
                if (dbCat.match(/chest|shoulder|tricep|push/)) category = "Push";
                else if (dbCat.match(/back|bicep|pull/)) category = "Pull";
                else if (dbCat.match(/leg|olympic/)) category = "Legs";
            }
        }
        // Strategy 2: Regex Fallback
        else {
            const n = log.exercise_name.toLowerCase();
            if (n.match(/bench|press|push|dip|extension|fly/)) category = "Push";
            else if (n.match(/pull|row|curl|deadlift|chin|lat/)) category = "Pull";
            else if (n.match(/squat|leg|lung|calf|raise|thrust/)) category = "Legs";
        }

        scores[category] += 1;
    });

    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

    return [
        { muscle: "Push", score: Math.round((scores.Push / total) * 100) },
        { muscle: "Pull", score: Math.round((scores.Pull / total) * 100) },
        { muscle: "Legs", score: Math.round((scores.Legs / total) * 100) },
        { muscle: "Core", score: Math.round((scores.Core / total) * 100) },
    ];
}

export async function getUserProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
  
    return {
      birth_date: user.user_metadata.birth_date
    };
  }


export async function getExerciseDetails(exerciseName: string) {
    const supabase = await createClient();
    const safeExerciseName = exerciseSchema.parse(exerciseName);

    // Fetch detailed metadata from Exercise Library
    const { data } = await supabase
        .from("exercise_catalog")
        .select("*")
        .eq("name", safeExerciseName)
        .single();

    return data;
}

export async function getExerciseMetrics(exerciseName: string, range: string): Promise<ExerciseMetricsResult> {
    const supabase = await createClient();
    const safeExerciseName = exerciseSchema.parse(exerciseName);
    const safeRange = rangeSchema.parse(range);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        type: "strength",
        logs: [],
        chartData: [],
      };
    }
    const now = new Date();
    const { data: workouts } = await supabase.from("training_sessions").select("id").eq("user_id", user.id);
    const workoutIds = (workouts || []).map((workout) => workout.id);
    let startDate = subMonths(now, 6);

    if (safeRange === "1M") startDate = subMonths(now, 1);
    if (safeRange === "1Y") startDate = subYears(now, 1);
    if (safeRange === "ALL") startDate = new Date(0);

    // =========================================================
    // 1. TRY FETCHING CARDIO LOGS FIRST (Restored Logic)
    // =========================================================
    const { data: cardioLogs } = await supabase
        .from("cardio_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("activity_type", safeExerciseName) // e.g., "Running"
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true });

    // If we found cardio data, return immediately as type: "cardio"
    if (cardioLogs && cardioLogs.length > 0) {
        return {
            type: "cardio",
            // Clone before sorting to avoid mutating chart order
            logs: [...cardioLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            chartData: cardioLogs.map(l => ({
                date: l.date,
                pace: calculatePaceMinutesPerKm(l.distance_km || 0, l.duration_minutes || 0),
                heart_rate: l.average_heart_rate || 0,
                distance: l.distance_km || 0,
            }))
        };
    }

    // =========================================================
    // 2. FALLBACK TO STRENGTH LOGIC (Your existing code)
    // =========================================================
    if (workoutIds.length === 0) {
      return {
        type: "strength",
        logs: [],
        chartData: [],
      };
    }

    const { data: strengthLogs, error } = await supabase
        .from("strength_sets")
        .select("*")
        .in("workout_id", workoutIds)
        .eq("exercise_name", safeExerciseName)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // FETCH BODY METRICS (For correlation chart)
    const { data: bodyMetrics } = await supabase
        .from("body_measurements")
        .select("date, weight, body_fat_percent, muscle_mass_kg, waist_cm")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true });

    // AGGREGATE DATA
    const aggregatedMap = new Map<string, StrengthChartPoint>();
    const bodyMetricMap = new Map<string, BodyMetricRow>(
      ((bodyMetrics as BodyMetricRow[] | null) || []).map((metric) => [metric.date, metric]),
    );

    strengthLogs?.forEach((log: StrengthLogRow) => {
        const dateKey = log.created_at ? log.created_at.split("T")[0] : "unknown";
        const weight = log.weight || 0;
        const reps = log.reps || 0;

        // 1RM Calc
        const set1RM = log.calculated_1rm || estimateOneRepMax(weight, reps);

        const setVolume = weight * reps;

        if (aggregatedMap.has(dateKey)) {
            const existing = aggregatedMap.get(dateKey)!;
            aggregatedMap.set(dateKey, {
                ...existing,
                estimated_1rm: Math.max(existing.estimated_1rm, set1RM),
                volume: existing.volume + setVolume,
                totalRest: existing.totalRest + (log.rest_seconds || 0),
            });
        } else {
            const metric = bodyMetricMap.get(dateKey);

            aggregatedMap.set(dateKey, {
                date: log.created_at!,
                estimated_1rm: set1RM,
                volume: setVolume,
                bodyWeight: metric?.weight || null,
                bodyFatPercent: metric?.body_fat_percent || null,
                muscleMassKg: metric?.muscle_mass_kg || null,
                waistCm: metric?.waist_cm || null,
                totalRest: log.rest_seconds || 0,
            });
        }
    });

    return {
        type: "strength",
        logs: (strengthLogs ? [...strengthLogs] : []).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()),
        chartData: Array.from(aggregatedMap.values())
    };
}
