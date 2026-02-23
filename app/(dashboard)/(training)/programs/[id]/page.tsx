import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WorkoutPicker } from "@/components/workout/workout-picker";
import { createClient } from "@/lib/supabase/server";
import { ProgramBuilder } from "@/components/program/program-builder";
import { EditableText } from "@/components/shared/editable-text";
import { updateProgram } from "@/app/actions/program";
import { Database } from "@/types/database";

type Workout = Database['public']['Tables']['training_sessions']['Row'];
type Program = Database['public']['Tables']['training_plans']['Row'];
type ProgramItem = Database['public']['Tables']['training_plan_items']['Row'] & {
  workouts: Workout | null;
};

type ProgramWithDetails = Program & {
  training_plan_items: ProgramItem[];
};

interface ProgramPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const resolvedParams = await params;
  const programId = resolvedParams.id;
  const supabase = await createClient();

  // 1. Fetch Program & Items
  const { data: rawProgram, error } = await supabase
    .from("training_plans")
    .select(`
      *, 
      training_plan_items (
        id,
        program_id,
        order_index,
        day_label,
        workout_id,
        item_type,
        workouts:training_sessions (
          *
        )
      )
    `)
    .eq("id", programId)
    // FIX: Add server-side sorting with correct syntax
    .order("order_index", { referencedTable: "training_plan_items", ascending: true })
    .single();

  if (error || !rawProgram) {
    notFound();
  }

  const program = rawProgram as unknown as ProgramWithDetails;

  // 2. Fetch Library
  const { data: allWorkouts } = await supabase
    .from("training_sessions")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="page-shell mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
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
      <div className="page-shell section-gap mx-auto flex w-full max-w-7xl flex-1 overflow-y-auto">
        <ProgramBuilder
          program={program}
          allWorkouts={(allWorkouts as Workout[]) || []}
        />

        <div className="mt-12 border-t pt-8 text-center space-y-2 pb-24">
          <p className="text-sm text-muted-foreground">Need a new workout specifically for this program?</p>
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
