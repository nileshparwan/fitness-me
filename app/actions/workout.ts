"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================
// We define these types to match the Supabase table structure exactly.
// This prevents errors where we might forget a required field like 'user_id'.

type WorkoutLogInsert = {
  workout_id: string;
  user_id: string;       // Required: Links log to specific user for RLS (Row Level Security)
  exercise_id?: string;  // Optional: Link to the specific exercise in your library
  exercise_name: string; // Snapshot of the name (in case the library item is deleted later)
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number | null;
};

type CardioLogInsert = {
  workout_id: string;
  user_id: string;       // Required
  date: string;          // ISO String for database storage
  activity_type: string; // e.g. "Running", "Cycling"
  duration_minutes: number;
  distance_km?: number | null;
  calories_burned?: number | null;
  average_heart_rate?: number | null;
};

// The shape of the data coming from your Frontend Form
type WorkoutInput = {
  name: string;
  date: Date;
  notes?: string;
  status?: 'active' | 'draft' | 'archived' | 'completed';
  exercises?: any[]; // Array containing both Strength sets and Cardio sessions
};

// ============================================================================
// 2. CREATE WORKOUT ACTION
// ============================================================================
export async function createWorkoutAction(data: WorkoutInput) {
  const supabase = await createClient();
  
  // SECURITY: Always get the user from the server session. 
  // Never trust a user_id sent from the client.
  const { data: { user } } = await supabase.auth.getUser();
  
  // Type Guard: This ensures 'user' is not null for the rest of the function
  if (!user) throw new Error("Not authenticated");

  // --- Step A: Insert the Parent Workout Record ---
  // We insert the header info first to generate the 'workout.id'
  const { data: workout, error: wError } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: data.name,
      date: data.date.toISOString(),
      status: data.status || "active",
      notes: data.notes
    })
    .select()
    .single(); // Returns the single object created

  if (wError) throw new Error(wError.message);

  // --- Step B: Insert Child Logs (Cardio & Strength) ---
  if (data.exercises && data.exercises.length > 0) {
    
    // Initialize typed arrays to hold our rows
    const strengthLogs: WorkoutLogInsert[] = [];
    const cardioLogs: CardioLogInsert[] = [];

    // Loop through the mixed array from the form
    for (const ex of data.exercises) {
      
      // LOGIC SPLIT: Determine where to save based on type
      if (ex.type === 'cardio') {
        // Map Form Data -> Cardio Table Column Structure
        cardioLogs.push({
          workout_id: workout.id,
          user_id: user.id, // We use the validated user.id here
          date: data.date.toISOString(),
          activity_type: ex.name,
          duration_minutes: Number(ex.duration || 0),
          distance_km: ex.distance ? Number(ex.distance) : null,
          calories_burned: ex.calories ? Number(ex.calories) : null,
          average_heart_rate: ex.heartRate ? Number(ex.heartRate) : null,
        });
      } else {
        // Map Form Data -> Strength Table Column Structure
        // Flatten sets: 1 Exercise with 3 sets = 3 Database Rows
        if (ex.sets) {
          ex.sets.forEach((set: any) => {
            strengthLogs.push({
              workout_id: workout.id,
              user_id: user.id,
              exercise_id: ex.exercise_id,
              exercise_name: ex.name,
              set_number: set.set_number,
              reps: Number(set.reps || 0),
              weight: Number(set.weight || 0),
              rpe: set.rpe ? Number(set.rpe) : null,
            });
          });
        }
      }
    }

    // PERFORMANCE: Batch Insert
    // We send all cardio logs in one request, and all strength logs in another.
    if (strengthLogs.length > 0) {
      await supabase.from("workout_logs").insert(strengthLogs);
    }
    if (cardioLogs.length > 0) {
      await supabase.from("cardio_logs").insert(cardioLogs);
    }
  }

  // Refresh the workouts list page to show the new entry
  revalidatePath("/workouts");
  return workout;
}

// ============================================================================
// 3. UPDATE WORKOUT ACTION
// ============================================================================
export async function updateWorkoutAction(id: string, data: Partial<WorkoutInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // --- Step A: Update Header Fields ---
  // We construct an object with ONLY the fields that were changed
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.date) updateData.date = data.date.toISOString();
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status) updateData.status = data.status;

  if (Object.keys(updateData).length > 0) {
    const { error: wError } = await supabase
      .from("workouts")
      .update(updateData)
      .eq("id", id);
    if (wError) throw new Error(wError.message);
  }

  // --- Step B: Update Logs (The "Wipe & Rewrite" Strategy) ---
  if (data.exercises) {
    
    // 1. DELETE OLD DATA
    // We delete all logs associated with this workout ID.
    // This handles deleted exercises automatically (if it's not in the new array, it stays deleted).
    await supabase.from("workout_logs").delete().eq("workout_id", id);
    await supabase.from("cardio_logs").delete().eq("workout_id", id);

    // 2. PREPARE NEW DATA
    const strengthLogs: WorkoutLogInsert[] = [];
    const cardioLogs: CardioLogInsert[] = [];

    for (const ex of data.exercises) {
      if (ex.type === 'cardio') {
         cardioLogs.push({
          workout_id: id,
          user_id: user.id, // Using non-null user.id
          date: data.date ? data.date.toISOString() : new Date().toISOString(),
          activity_type: ex.name,
          duration_minutes: Number(ex.duration || 0),
          distance_km: ex.distance ? Number(ex.distance) : null,
          calories_burned: ex.calories ? Number(ex.calories) : null,
          average_heart_rate: ex.heartRate ? Number(ex.heartRate) : null,
         });
      } else {
         if (ex.sets) {
            ex.sets.forEach((set: any) => {
              strengthLogs.push({
                workout_id: id,
                user_id: user.id,
                exercise_id: ex.exercise_id,
                exercise_name: ex.name,
                set_number: set.set_number,
                reps: Number(set.reps || 0),
                weight: Number(set.weight || 0),
                rpe: set.rpe ? Number(set.rpe) : null,
              });
            });
         }
      }
    }

    // 3. INSERT NEW DATA
    if (strengthLogs.length > 0) {
      await supabase.from("workout_logs").insert(strengthLogs);
    }
    if (cardioLogs.length > 0) {
      await supabase.from("cardio_logs").insert(cardioLogs);
    }
  }

  // --- Step C: Revalidation ---
  // 1. Update the list view
  revalidatePath("/workouts");
  // 2. Update the detail view for this specific workout
  revalidatePath(`/workouts/${id}`);
  // 3. Update the 'exercise_progress' SQL View so charts update immediately
  revalidatePath("/progress"); 
}

// ============================================================================
// 4. DELETE WORKOUT ACTION
// ============================================================================
export async function deleteWorkoutAction(ids: string | string[]) {
  const supabase = await createClient();
  const idArray = Array.isArray(ids) ? ids : [ids];

  // Note: If you have "ON DELETE CASCADE" set up in your Postgres foreign keys,
  // this will automatically delete the related workout_logs and cardio_logs.
  const { error } = await supabase
    .from("workouts")
    .delete()
    .in("id", idArray);

  if (error) throw new Error(error.message);
  revalidatePath("/workouts");
}