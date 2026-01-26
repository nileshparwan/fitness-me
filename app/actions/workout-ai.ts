"use server";

import { createClient } from "@/lib/supabase/server";
import { analyzeWorkoutText } from "@/lib/ai/analyzers/workout-analyzer";
import { revalidatePath } from "next/cache";

export async function saveWorkoutFromText(userId: string, rawText: string, date: Date = new Date()) {
  const supabase = await createClient();

  // 1. Parse Text via AI
  const parsedWorkouts = await analyzeWorkoutText(rawText);

  if (!parsedWorkouts || parsedWorkouts.length === 0) {
    throw new Error("No workouts detected in text");
  }

  // Loop through each parsed workout (handles the "Week plan" case)
  for (const [index, pWorkout] of parsedWorkouts.entries()) {
    
    // Calculate date (If bulk import, increment date by 1 day per workout)
    const workoutDate = new Date(date);
    workoutDate.setDate(workoutDate.getDate() + index);

    // 2. Create Workout Header
    const { data: workout, error: wError } = await supabase
      .from("workouts")
      .insert({
        user_id: userId,
        name: pWorkout.name,
        date: workoutDate.toISOString(),
        status: "completed",
        notes: pWorkout.notes
      })
      .select()
      .single();

    if (wError) throw wError;

    // 3. Process Exercises (Find or Create)
    const logsToInsert = [];

    for (const ex of pWorkout.exercises) {
      let exerciseId = null;

      // A. Try to find existing exercise
      // We check name OR aliases (using Postgres array operator)
      const { data: existing } = await supabase
        .from("exercise_library")
        .select("id")
        .or(`name.ilike."${ex.name}",aliases.cs.{"${ex.name.toLowerCase()}"}`) 
        .limit(1)
        .single();

      if (existing) {
        exerciseId = existing.id;
      } else {
        // B. CREATE NEW EXERCISE (Dynamic DB Update)
        const { data: newExercise, error: newExError } = await supabase
          .from("exercise_library")
          .insert({
            name: ex.name, // AI normalized name
            category: "other", // Default
            difficulty: "intermediate", // Default
            muscle_groups: [], // Empty default
            aliases: [ex.name.toLowerCase()] // Add itself as alias
          })
          .select()
          .single();
        
        if (newExError) {
          console.error(`Failed to auto-create exercise: ${ex.name}`, newExError);
          // Fallback: If creation fails (e.g. race condition), skip or log without ID
        } else {
          exerciseId = newExercise.id;
        }
      }

      // Prepare Logs
      for (const [setIndex, set] of ex.sets.entries()) {
        logsToInsert.push({
          workout_id: workout.id,
          exercise_id: exerciseId,
          exercise_name: ex.name, // Always store the name even if ID is null
          set_number: setIndex + 1,
          reps: set.reps,
          weight: set.weight || 0,
          rpe: set.rpe || 0
        });
      }
    }

    // 4. Batch Insert Logs
    if (logsToInsert.length > 0) {
      await supabase.from("workout_logs").insert(logsToInsert);
    }
  }

  revalidatePath("/workouts");
  return { success: true, count: parsedWorkouts.length };
}