import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WorkoutPicker } from "@/components/workout/workout-picker";
import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder } from "@/components/program/program-builder";
// Import the new component
import { ProgramProgressChart } from "@/components/program/program-progress-chart";

interface ProgramPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const resolvedParams = await params;
  const programId = resolvedParams.id;

  const supabase = await createClient();

  // 1. Fetch Program & Items
  const { data: program, error } = await supabase
    .from("programs")
    .select(`
      *, 
      program_items (
        id,
        order_index,
        day_label,
        workout_id,
        workouts (
          id,
          name,
          duration_minutes,
          status,
          workout_logs (count)
        )
      )
    `)
    .eq("id", programId)
    .single();

  if (error || !program) {
    notFound();
  }

  // 2. Fetch Library (For Builder Sidebar)
  const { data: allWorkouts } = await supabase
    .from("workouts")
    .select("*")
    .order("date", { ascending: false });

  // 3. FETCH LOGS FOR ANALYTICS
  // We extract the workout IDs associated with this program
  const workoutIds = program.program_items
    .map((item: any) => item.workout_id)
    .filter(Boolean);

  // Query your specific flat table schema
  const { data: logs } = await supabase
    .from("workout_logs")
    .select(`
      id,
      created_at,
      workout_id,
      set_number,
      reps,
      weight,
      rpe,
      is_warmup,
      calculated_1rm,
      workouts ( name )
    `)
    .in("workout_id", workoutIds)
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 p-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/programs" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>

            <div className="leading-tight">
              <h1 className="text-xl md:text-2xl font-bold">{program.name}</h1>
              <p className="text-sm text-muted-foreground">
                {program.description || "Program Dashboard"}
              </p>
            </div>
          </div>
          <div><WorkoutPicker programId={programId} /></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <ProgramBuilder
          program={program}
          allWorkouts={allWorkouts || []}
        />

        <div className="mt-12 border-t pt-8 text-center space-y-2 pb-24">
          <p className="text-sm text-muted-foreground">Need a new workout specifically for this program?</p>
          <Button variant="outline" asChild>
            <Link href={`/workouts/new?programId=${programId}`}>
              Create & Link New Workout
            </Link>
          </Button>
        </div>

        {/* NEW CHART COMPONENT */}
        {logs && logs.length > 0 ? (
          <ProgramProgressChart logs={logs} />
        ) : (
          /* Empty State for Chart */
          <div className="mb-8 p-6 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/10">
            <p>Start logging workouts to see your analytics here.</p>
          </div>
        )}
      </div>
    </div>
  );
}