import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WorkoutPicker } from "@/components/workout/workout-picker";
import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder } from "@/components/program/program-builder";
import { ProgramProgressChart } from "@/components/program/program-progress-chart";
import { EditableText } from "@/components/shared/editable-text";
import { updateProgram } from "@/app/actions/program";

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
  const workoutIds = program.program_items
    ?.map((item: any) => item.workout_id)
    .filter(Boolean) || [];

  let logs: any[] = [];
  let cardioLogs: any[] = [];

  if (workoutIds.length > 0) {
    // A. Fetch Strength Logs
    const { data: strengthData } = await supabase
      .from("workout_logs")
      .select(`
        id,
        created_at,
        updated_at,
        workout_id,
        set_number,
        reps,
        weight,
        rpe,
        is_warmup,
        calculated_1rm,
        workouts ( name, date )  
      `) // Added 'date' to workouts relation for better grouping
      .in("workout_id", workoutIds)
      .order("created_at", { ascending: true });

    // B. Fetch Cardio Logs
    const { data: cardioData } = await supabase
      .from("cardio_logs")
      .select("*")
      .in("workout_id", workoutIds)
      .order("date", { ascending: true });

    logs = strengthData || [];
    cardioLogs = cardioData || [];
  }

  // Check if we have ANY data to show
  const hasData = logs.length > 0 || cardioLogs.length > 0;

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

            <div className="leading-tight min-w-0">
              <EditableText
                initialValue={program.name}
                onSave={async (newName) => {
                  "use server";
                  await updateProgram(programId, { name: newName });
                }}
                className="text-xl md:text-2xl font-bold"
              />
              <p className="text-sm text-muted-foreground">
                {program.description || "Program Detail"}
              </p>
            </div>
          </div>
          <div><WorkoutPicker programId={programId} /></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">

        {/* Builder Component */}
        <ProgramBuilder
          program={program}
          allWorkouts={allWorkouts || []}
        />

        {/* Footer Actions */}
        <div className="mt-12 border-t pt-8 text-center space-y-2 pb-24">
          <p className="text-sm text-muted-foreground">Need a new workout specifically for this program?</p>
          <Button variant="outline" asChild>
            <Link href={`/workouts/new?programId=${programId}`}>
              Create & Link New Workout
            </Link>
          </Button>
        </div>

        {/* Analytics Section */}
        {hasData ? (
          <ProgramProgressChart logs={logs} cardioLogs={cardioLogs} />
        ) : workoutIds.length > 0 ? (
          /* Show placeholder only if workouts exist but no logs yet */
          <div className="mb-8 p-6 border border-dashed rounded-xl text-center text-muted-foreground bg-muted/10">
            <p className="flex items-center justify-center gap-2">
              <span className="text-xl">📊</span>
              Start logging these workouts to see your progress chart here.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}