"use server";

import { createClient } from "@/lib/supabase/server";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { revalidatePath } from "next/cache";

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
  

export async function getExerciseHistory(exerciseName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) return [];
  
    const { data, error } = await supabase
      .from("exercise_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("exercise_name", exerciseName)
      .order("date", { ascending: false });
  
    if (error) {
      console.error("Error fetching history:", error);
      return [];
    }
  
    // FIX: Cast to unknown first to bypass the mismatch error
    return data as unknown as HistoryEntry[];
  }

export async function getExercises({
    pageParam = 0,
    search = ""
}: {
    pageParam?: number;
    search?: string
}) {
    const supabase = await createClient();

    let query = supabase
        .from("exercise_library")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (search) {
        query = query.ilike("name", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    const safeData = data || [];

    return {
        data: safeData,
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        total: count,
    };
}

export async function createExercise(values: ExerciseFormValues) {
    const supabase = await createClient();

    const { error } = await supabase.from("exercise_library").insert({
        name: values.name,
        category: values.category,
        muscle_groups: values.muscle_groups,
        equipment: values.equipment,
        description: values.description,
        video_url: values.video_url || null,
        aliases: values.aliases,
    });

    if (error) throw new Error(error.message);
    revalidatePath("/exercises");
    return { success: true };
}

export async function deleteExercise(id: string) {
    const supabase = await createClient();

    // FIX: Add select() or count explicitly to verify execution
    const { error, count } = await supabase
        .from("exercise_library")
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
}

export async function updateExercise(id: string, values: ExerciseFormValues) {
    const supabase = await createClient();

    const { error, count } = await supabase
        .from("exercise_library")
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
}
