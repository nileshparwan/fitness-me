import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkoutPrintView } from "@/components/workout/workout-print-view";
import { WorkoutActions } from "@/components/workout/workout-actions";

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
        .from("workout_logs")
        .select("*")
        .eq("workout_id", id)
        .order("set_number");

    const { data: cardioLogs } = await supabase
        .from("cardio_logs")
        .select("*")
        .eq("workout_id", id);

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            {/* Floating Header for Actions */}
            <div className="max-w-3xl mx-auto flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-2">
                    <Link href="/" className="font-bold text-lg tracking-tight">FitTrack</Link>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">Public Viewer</span>
                </div>

                {/* Actions Bar (Only PDF on public page) */}
                {/* FIX: Cast workout to 'any' to bypass the TS relation error */}
                <WorkoutActions
                    workout={workout as any}
                    strengthLogs={strengthLogs || []}
                    cardioLogs={cardioLogs || []}
                    isPublicPage={true}
                />
            </div>

            {/* The Actual Reader View */}
            <div className="shadow-xl">
                {/* FIX: Cast workout to 'any' here as well */}
                <WorkoutPrintView
                    workout={workout as any}
                    strengthLogs={strengthLogs || []}
                    cardioLogs={cardioLogs || []}
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