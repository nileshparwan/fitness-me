"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

type ProgramInsert = Database['public']['Tables']['programs']['Insert'];
type ProgramItemInsert = Database['public']['Tables']['program_items']['Insert'];

export async function createProgram(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const payload: ProgramInsert = {
        user_id: user.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        // Add other defaults if your DB requires them (e.g. is_public: false)
    };

    const { error } = await supabase.from("programs").insert(payload);

    if (error) throw new Error(error.message);
    revalidatePath("/programs");
}

export async function updateProgram(id: string, data: Database['public']['Tables']['programs']['Update']) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("programs")
        .update(data)
        .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
}

export async function deletePrograms(ids: string[]) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("programs")
        .delete()
        .in("id", ids);

    if (error) throw new Error(error.message);
    revalidatePath("/programs");
}

// 1. Bulk Add Workouts
export async function addWorkoutsToProgram(programId: string, workoutIds: string[]) {
    const supabase = await createClient();
    const uniqueWorkoutIds = Array.from(new Set(workoutIds));

    if (uniqueWorkoutIds.length === 0) return;

    const { data: existingItems } = await supabase
        .from("program_items")
        .select("workout_id")
        .eq("program_id", programId)
        .in("workout_id", uniqueWorkoutIds);

    const existingWorkoutIds = new Set(
        (existingItems || [])
            .map((item) => item.workout_id)
            .filter((id): id is string => Boolean(id))
    );

    const workoutIdsToInsert = uniqueWorkoutIds.filter((id) => !existingWorkoutIds.has(id));
    if (workoutIdsToInsert.length === 0) return;

    // Get current count to append at the end
    const { count } = await supabase
        .from("program_items")
        .select("*", { count: 'exact', head: true })
        .eq("program_id", programId);

    const startOrder = count || 0;

    const items: ProgramItemInsert[] = workoutIdsToInsert.map((wid, index) => ({
        program_id: programId,
        workout_id: wid,
        item_type: "workout",
        order_index: startOrder + index,
        day_label: "Unscheduled"
    }));

    const { error } = await supabase.from("program_items").insert(items);
    if (error) throw new Error(error.message);

    revalidatePath(`/programs/${programId}`);
}

// 2. Remove Items
export async function removeItemsFromProgram(itemIds: string[], programId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("program_items")
        .delete()
        .in("id", itemIds);

    if (error) throw new Error(error.message);
    revalidatePath(`/programs/${programId}`);
}

// 3. Reorder Items
// FIX 2: Updated to accept strictly typed inputs and cast to ProgramItemInsert[]
export async function updateProgramItemOrder(items: { id: string; order_index: number; day_label?: string; item_type: string }[], programId: string) {
    const supabase = await createClient();

    const updates = items.map((item) => ({
        id: item.id,
        program_id: programId,
        item_type: item.item_type, // Required field
        order_index: item.order_index,
        day_label: item.day_label || "Unscheduled"
    }));

    // We cast to ProgramItemInsert[] because upsert validates against the Insert schema
    // which requires non-null fields (like item_type), even though we are updating.
    const { error } = await supabase
        .from("program_items")
        .upsert(updates as ProgramItemInsert[], { onConflict: 'id' });

    if (error) throw new Error(error.message);

    revalidatePath(`/programs/${programId}`);
}

// 4. Reverse Link
export async function linkWorkoutToPrograms(workoutId: string, programIds: string[]) {
    const supabase = await createClient();
    const uniqueProgramIds = Array.from(new Set(programIds));
    if (uniqueProgramIds.length === 0) return;

    const { data: existingItems } = await supabase
        .from("program_items")
        .select("program_id")
        .in("program_id", uniqueProgramIds)
        .eq("workout_id", workoutId);

    const existingProgramIds = new Set(
        (existingItems || [])
            .map((item) => item.program_id)
            .filter((id): id is string => Boolean(id))
    );

    const programIdsToInsert = uniqueProgramIds.filter((id) => !existingProgramIds.has(id));
    if (programIdsToInsert.length === 0) return;

    const items: ProgramItemInsert[] = programIdsToInsert.map(pid => ({
        program_id: pid,
        workout_id: workoutId,
        item_type: "workout",
        day_label: "Imported",
        order_index: 999 // Append to end
    }));

    const { error } = await supabase.from("program_items").insert(items);
    if (error) throw new Error("Failed to link programs");
}
