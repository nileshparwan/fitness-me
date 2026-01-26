import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WorkoutPicker } from "@/components/workout/workout-picker";
import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder } from "@/components/program/program-builder";

// 1. Define Props Type as a Promise
interface ProgramPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const resolvedParams = await params;
  const programId = resolvedParams.id;

  const supabase = await createClient();

  // 3. Fetch Program with "Safe" Joining
  // We perform a specific join to ensure we get the linked workout data
  const { data: program, error } = await supabase
    .from("programs")
    .select(`
      *, 
      program_items (
        *,
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
    console.error("Program Fetch Error:", error);
    notFound();
  }

  // 4. Fetch Library (All User Workouts)
  const { data: allWorkouts } = await supabase
    .from("workouts")
    .select("*")
    .order("date", { ascending: false });


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
                <h1 className="text-xl md:text-2xl font-bold">
                  {program.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {program.description || "Drag workouts to build your schedule."}
                </p>
              </div>
            </div>
    
            {/* Desktop Action */}
            <div>
              <WorkoutPicker programId={programId} />
            </div>
          </div>
        </header>
    
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <ProgramBuilder
            program={program}
            allWorkouts={allWorkouts || []}
          />
    
          {/* Create New Workout Shortcut */}
          <div className="mt-12 border-t pt-8 text-center space-y-2 pb-24">
            <p className="text-sm text-muted-foreground">
              Need a new workout specifically for this program?
            </p>
    
            <Button variant="outline" asChild>
              <Link href={`/workouts/new?programId=${programId}`}>
                Create & Link New Workout
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
    
}
