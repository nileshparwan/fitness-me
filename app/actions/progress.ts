"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";
import { subMonths, subYears } from "date-fns";

export type ExerciseProgressRow = Database['public']['Views']['exercise_progress']['Row'];
export type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];
export type CardioLogRow = Database['public']['Tables']['cardio_logs']['Row'];

export async function getAvailableExercises() {
    const supabase = await createClient();

    // 1. Strength Logs
    const { data: strength } = await supabase
        .from("workout_logs")
        .select("exercise_name")
        .not("exercise_name", "is", null);

    // 2. Cardio Logs
    const { data: cardio } = await supabase
        .from("cardio_logs")
        .select("activity_type")
        .not("activity_type", "is", null);

    console.log(cardio)

    const names = new Set([
        ...(strength?.map(d => d.exercise_name) || []),
        ...(cardio?.map(d => d.activity_type) || []),
    ]);

    return Array.from(names).sort();
}

export async function getMuscleBalance() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("workout_logs")
        .select(`
        exercise_name,
        exercise_id,
        exercise_library (
          category,
          muscle_groups
        )
      `)
        .gte("created_at", subMonths(new Date(), 1).toISOString());

    if (error || !data) {
        console.error("Balance Error:", error);
        return [];
    }

    const scores = { Push: 0, Pull: 0, Legs: 0, Core: 0 };

    data.forEach((log: any) => {
        let category = "Core";

        // Strategy 1: Database Category
        if (log.exercise_library?.category) {
            const dbCat = log.exercise_library.category.toLowerCase();
            if (dbCat === 'strength') {
                const muscles = log.exercise_library.muscle_groups || [];
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

        // @ts-ignore
        if (scores[category] !== undefined) scores[category] += 1;
        else scores.Core += 1;
    });

    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;

    return [
        { muscle: "Push", score: Math.round((scores.Push / total) * 100) },
        { muscle: "Pull", score: Math.round((scores.Pull / total) * 100) },
        { muscle: "Legs", score: Math.round((scores.Legs / total) * 100) },
        { muscle: "Core", score: Math.round((scores.Core / total) * 100) },
    ];
}

export async function getConsistencyData() {
    const supabase = await createClient();
    const startDate = subMonths(new Date(), 1);

    const { data } = await supabase
        .from("workouts")
        .select("date, duration_minutes, overall_rating")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true });

    return data || [];
}

export async function getUserProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from("profiles").select("birth_date").eq("id", user.id).single();
    return data;
}


export async function getExerciseDetails(exerciseName: string) {
    const supabase = await createClient();

    // Fetch detailed metadata from Exercise Library
    const { data } = await supabase
        .from("exercise_library")
        .select("*")
        .eq("name", exerciseName)
        .single();

    return data;
}

export async function getPhysioCorrelation(startDate: Date) {
    const supabase = await createClient();

    // Fetch Body Metrics (Weight, Body Fat)
    const { data: body } = await supabase
        .from("body_metrics")
        .select("date, weight, body_fat_percent, muscle_mass_kg")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true });

    return body || [];
}

export async function getExerciseMetrics(exerciseName: string, range: string) {
    const supabase = await createClient();
    const now = new Date();
    let startDate = subMonths(now, 6);

    if (range === "1M") startDate = subMonths(now, 1);
    if (range === "1Y") startDate = subYears(now, 1);
    if (range === "ALL") startDate = new Date(0);

    // =========================================================
    // 1. TRY FETCHING CARDIO LOGS FIRST (Restored Logic)
    // =========================================================
    const { data: cardioLogs } = await supabase
        .from("cardio_logs")
        .select("*")
        .eq("activity_type", exerciseName) // e.g., "Running"
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
                pace: l.distance_km && l.duration_minutes ? (l.duration_minutes / l.distance_km) : 0,
                heart_rate: l.average_heart_rate || 0,
                distance: l.distance_km || 0,
            }))
        };
    }

    // =========================================================
    // 2. FALLBACK TO STRENGTH LOGIC (Your existing code)
    // =========================================================
    const { data: strengthLogs, error } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("exercise_name", exerciseName)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // FETCH BODY METRICS (For correlation chart)
    const { data: bodyMetrics } = await supabase
        .from("body_metrics")
        .select("date, weight")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true });

    // AGGREGATE DATA
    const aggregatedMap = new Map<string, any>();

    strengthLogs?.forEach((log) => {
        const dateKey = log.created_at ? log.created_at.split("T")[0] : "unknown";
        const weight = log.weight || 0;
        const reps = log.reps || 0;

        // 1RM Calc
        let set1RM = log.calculated_1rm || 0;
        if (!set1RM && weight > 0) {
            if (reps > 20) set1RM = weight;
            else if (reps > 10) set1RM = Math.round(weight * (1 + (reps / 30)));
            else set1RM = Math.round(weight * (36 / (37 - reps)));
        }

        const setVolume = weight * reps;

        if (aggregatedMap.has(dateKey)) {
            const existing = aggregatedMap.get(dateKey)!;
            aggregatedMap.set(dateKey, {
                ...existing,
                estimated_1rm: Math.max(existing.estimated_1rm, set1RM),
                volume: existing.volume + setVolume,
                totalRest: existing.totalRest + (log.rest_seconds || 0),
                avgRpe: (existing.avgRpe + (log.rpe || 0)) / 2,
            });
        } else {
            const bodyWeight = bodyMetrics?.find(b => b.date === dateKey)?.weight || null;

            aggregatedMap.set(dateKey, {
                date: log.created_at!,
                estimated_1rm: set1RM,
                volume: setVolume,
                bodyWeight: bodyWeight,
                totalRest: log.rest_seconds || 0,
                avgRpe: log.rpe || 0,
            });
        }
    });

    return {
        type: "strength",
        logs: (strengthLogs ? [...strengthLogs] : []).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()),
        chartData: Array.from(aggregatedMap.values())
    };
}