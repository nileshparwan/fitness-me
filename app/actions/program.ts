"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Database } from "@/types/database";

type ProgramInsert = Database['public']['Tables']['programs']['Insert'];
type ProgramItemInsert = Database['public']['Tables']['program_items']['Insert'];
type ProgramItemUpdate = Database['public']['Tables']['program_items']['Update'];

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

export async function attachItemToProgram(
    programId: string,
    itemId: string,
    type: "workout" | "nutrition",
    label: string
) {
    const supabase = await createClient();

    const payload: ProgramItemInsert = {
        program_id: programId,
        item_type: type,
        day_label: label,
        order_index: 999, // Will be fixed by reorder or DB default
    };

    if (type === "workout") payload.workout_id = itemId;
    if (type === "nutrition") payload.nutrition_log_id = itemId;

    const { error } = await supabase.from("program_items").insert(payload);

    if (error) throw new Error(error.message);
    revalidatePath(`/programs/${programId}`);
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

    // Get current count to append at the end
    const { count } = await supabase
        .from("program_items")
        .select("*", { count: 'exact', head: true })
        .eq("program_id", programId);

    const startOrder = count || 0;

    const items: ProgramItemInsert[] = workoutIds.map((wid, index) => ({
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

    const items: ProgramItemInsert[] = programIds.map(pid => ({
        program_id: pid,
        workout_id: workoutId,
        item_type: "workout",
        day_label: "Imported",
        order_index: 999 // Append to end
    }));

    const { error } = await supabase.from("program_items").insert(items);
    if (error) throw new Error("Failed to link programs");
}