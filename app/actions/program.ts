"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ReorderItem = {
    id: string;
    order_index: number;
    item_type: string; // <--- Added this
    day_label?: string; // Optional but good to preserve
};

export async function createProgram(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const { error } = await supabase.from("programs").insert({
        user_id: user.id,
        name,
        description,
    });

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

    // Verify ownership logic handled by RLS, but explicit check is good practice
    const payload: any = {
        program_id: programId,
        item_type: type,
        day_label: label,
    };

    if (type === "workout") payload.workout_id = itemId;
    if (type === "nutrition") payload.nutrition_log_id = itemId;

    const { error } = await supabase.from("program_items").insert(payload);

    if (error) throw new Error(error.message);
    revalidatePath(`/programs/${programId}`);
}

export async function deleteProgram(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/programs");
}

// 1. Bulk Add Workouts (Drag or Select)
export async function addWorkoutsToProgram(programId: string, workoutIds: string[]) {
    const supabase = await createClient();

    // Get current count to append at the end
    const { count } = await supabase
        .from("program_items")
        .select("*", { count: 'exact', head: true })
        .eq("program_id", programId);

    const startOrder = count || 0;

    const items = workoutIds.map((wid, index) => ({
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
        .in("id", itemIds); // Note: Deleting the Link, not the Workout itself

    if (error) throw new Error(error.message);
    revalidatePath(`/programs/${programId}`);
}

// 3. Reorder Items (Drag & Drop Persistence)
export async function updateProgramItemOrder(items: ReorderItem[], programId: string) {
    const supabase = await createClient();

    // We map the incoming items to a payload that satisfies the DB constraints
    const payload = items.map((item) => ({
        id: item.id,
        program_id: programId, // Required for RLS
        item_type: item.item_type, // Required for NOT NULL constraint
        order_index: item.order_index,
        day_label: item.day_label || "Unscheduled" // Preserve or default
    }));

    const { error } = await supabase
        .from("program_items")
        .upsert(payload, { onConflict: 'id' });

    if (error) {
        console.error("Reorder Error:", error.message);
        throw new Error(error.message);
    }

    revalidatePath(`/programs/${programId}`);
}

// 4. Reverse Link (Used in Workout Form)
export async function linkWorkoutToPrograms(workoutId: string, programIds: string[]) {
    const supabase = await createClient();

    // 1. Clear existing links for this workout if needed? 
    // Usually better to just add new ones or handle a full sync. 
    // For safety, let's just insert new ones and ignore conflicts or duplicates if your DB allows.

    const items = programIds.map(pid => ({
        program_id: pid,
        workout_id: workoutId,
        item_type: "workout",
        day_label: "Imported"
    }));

    const { error } = await supabase.from("program_items").insert(items);
    if (error) throw new Error("Failed to link programs");
}