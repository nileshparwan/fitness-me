"use server";

import { createClient } from "@/lib/supabase/server";
import { runTrackedAction } from "@/lib/events/dispatcher";
import { escapeLikePattern } from "@/lib/utils/search";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

const PAGE_SIZE = 10;

export type HistoryEntry = {
    date: string;
    type: 'strength' | 'cardio';
    weight: number | null;
    reps: number | null;
    estimated_1rm: number | null;
    distance_km: number | null;
    duration_minutes: number | null;
  };

type WorkoutLogRow = Database["public"]["Tables"]["strength_sets"]["Row"];
type CardioLogRow = Database["public"]["Tables"]["cardio_sessions"]["Row"];
type WorkoutRow = Database["public"]["Tables"]["training_sessions"]["Row"];

export async function getExerciseHistory(exerciseName: string) {
  return runTrackedAction({
    eventName: "exercise.history.read",
    payload: { exercise_name: exerciseName },
    action: async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) return [];

    const { data: userWorkouts, error: workoutError } = await supabase
      .from("training_sessions")
      .select("id")
      .eq("user_id", user.id);

    if (workoutError) {
      console.error("Error fetching workouts:", workoutError);
      return [];
    }

    const workoutIds = (userWorkouts || []).map((w: Pick<WorkoutRow, "id">) => w.id);

    let strengthLogs: Pick<WorkoutLogRow, "created_at" | "weight" | "reps" | "calculated_1rm">[] = [];
    if (workoutIds.length > 0) {
      const { data: strengthData, error: strengthError } = await supabase
        .from("strength_sets")
        .select("created_at, weight, reps, calculated_1rm")
        .eq("exercise_name", exerciseName)
        .in("workout_id", workoutIds)
        .order("created_at", { ascending: false });

      if (strengthError) {
        console.error("Error fetching strength history:", strengthError);
        return [];
      }
      strengthLogs = strengthData || [];
    }

    const { data: cardioData, error: cardioError } = await supabase
      .from("cardio_sessions")
      .select("date, distance_km, duration_minutes")
      .eq("user_id", user.id)
      .eq("activity_type", exerciseName)
      .order("date", { ascending: false });

    if (cardioError) {
      console.error("Error fetching cardio history:", cardioError);
      return [];
    }

    const cardioLogs = (cardioData || []) as Pick<CardioLogRow, "date" | "distance_km" | "duration_minutes">[];

    const strengthEntries: HistoryEntry[] = strengthLogs.map((log) => ({
      date: log.created_at || new Date(0).toISOString(),
      type: "strength",
      weight: log.weight,
      reps: log.reps,
      estimated_1rm: log.calculated_1rm,
      distance_km: null,
      duration_minutes: null,
    }));

    const cardioEntries: HistoryEntry[] = cardioLogs.map((log) => ({
      date: log.date,
      type: "cardio",
      weight: null,
      reps: null,
      estimated_1rm: null,
      distance_km: log.distance_km,
      duration_minutes: log.duration_minutes,
    }));

    return [...strengthEntries, ...cardioEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    },
  });
}

export async function getExercises({
    pageParam = 0,
    search = "",
    category,
}: {
    pageParam?: number;
    search?: string;
    category?: string;
}) {
    return runTrackedAction({
        eventName: "exercise.list.read",
        payload: { page: pageParam, search: search || null, category: category || null },
        action: async () => {
    const supabase = await createClient();

    let query = supabase
        .from("exercise_catalog")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (search) {
        query = query.ilike("name", `%${escapeLikePattern(search)}%`);
    }
    if (category) {
        query = query.ilike("category", `%${escapeLikePattern(category)}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const safeData = data || [];

    return {
        data: safeData,
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        total: count,
    };
        },
    });
}

export async function createExercise(values: ExerciseFormValues) {
    return runTrackedAction({
        eventName: "exercise.create",
        payload: { name: values.name, category: values.category },
        action: async () => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase.from("exercise_catalog").insert({
        name: values.name,
        category: values.category,
        muscle_groups: values.muscle_groups,
        equipment: values.equipment,
        description: values.description,
        video_url: values.video_url || null,
        aliases: values.aliases,
        created_by: user.id,
    });

    if (error) throw new Error(error.message);
    revalidatePath("/exercises");
    return { success: true };
        },
    });
}

export async function deleteExercise(id: string) {
    return runTrackedAction({
        eventName: "exercise.delete",
        payload: { exercise_id: id },
        action: async () => {
    const supabase = await createClient();

    // FIX: Add select() or count explicitly to verify execution
    const { error, count } = await supabase
        .from("exercise_catalog")
        .delete({ count: "exact" }) // Request the count of deleted rows
        .eq("id", id);

    if (error) {
        throw new Error(error.message);
    }

    // If count is 0, it means RLS blocked it or ID wasn't found
    if (count === 0) {
        throw new Error("Could not delete exercise. You may not have permission.");
    }

    revalidatePath("/exercises");
    return { success: true };
        },
    });
}

export async function updateExercise(id: string, values: ExerciseFormValues) {
    return runTrackedAction({
        eventName: "exercise.update",
        payload: { exercise_id: id, name: values.name, category: values.category },
        action: async () => {
    const supabase = await createClient();

    const { error, count } = await supabase
        .from("exercise_catalog")
        .update({
            name: values.name,
            category: values.category,
            muscle_groups: values.muscle_groups,
            equipment: values.equipment,
            description: values.description,
            video_url: values.video_url || null,
            aliases: values.aliases,
        }, { count: "exact" }) // Request the count
        .eq("id", id);

    if (error) throw new Error(error.message);

    if (count === 0) {
        throw new Error("Update failed. No changes applied (Check RLS policies).");
    }

    revalidatePath("/exercises");
    return { success: true };
        },
    });
}
