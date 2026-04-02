import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkoutPrintView } from "@/components/workout/workout-print-view";
import { WorkoutActions } from "@/components/workout/workout-actions";
import { Database } from "@/types/database";

type Workout = Database["public"]["Tables"]["workouts"]["Row"];
type WorkoutLog = Database["public"]["Tables"]["workout_sets"]["Row"];
type CardioLog = Database["public"]["Tables"]["workout_cardio"]["Row"];

export const dynamic = "force-dynamic";

export default async function PublicWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Workout Data
    // We removed "user:users(email)" from the select to prevent runtime errors 
    // if you don't have a public profiles table setup.
    const { data: workout, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !workout) notFound();

    // 2. Fetch Logs
    const { data: strengthLogs } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("workout_id", id)
        .order("entry_sequence", { ascending: true })
        .order("set_number");

    const { data: cardioLogs } = await supabase
        .from("workout_cardio")
        .select("*")
        .eq("workout_id", id)
        .order("entry_sequence", { ascending: true });

    const typedWorkout = workout as Workout;
    const typedStrengthLogs = (strengthLogs || []) as WorkoutLog[];
    const typedCardioLogs = (cardioLogs || []) as CardioLog[];

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            {/* Floating Header for Actions */}
            <div className="max-w-3xl mx-auto flex justify-between items-center mb-6 bg-card p-4 rounded-lg shadow-sm border border-border">
                <div className="flex items-center gap-2">
                    <Link href="/" className="font-bold text-lg tracking-tight">FitTrack</Link>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm text-muted-foreground">Public Viewer</span>
                </div>

                <WorkoutActions
                    workout={typedWorkout}
                    strengthLogs={typedStrengthLogs}
                    cardioLogs={typedCardioLogs}
                    isPublicPage={true}
                />
            </div>

            {/* The Actual Reader View */}
            <div className="shadow-xl">
                <WorkoutPrintView
                    workout={typedWorkout}
                    strengthLogs={typedStrengthLogs}
                    cardioLogs={typedCardioLogs}
                />
            </div>

            <div className="text-center mt-8">
                <Button asChild variant="link">
                    <Link href="/signup">Create your own workouts on FitTrack</Link>
                </Button>
            </div>
        </div>
    );
}
