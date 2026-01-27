"use client";

import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkouts } from "@/hooks/use-workout";
import { WorkoutCard } from "@/components/workout/workout-card";

export default function WorkoutsPage() {
  // 1. Get the query object from the hook
  const { history } = useWorkouts();
  
  // 2. Destructure data and loading state FROM the query object
  const { data: workouts, isLoading } = history;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workouts</h2>
          <p className="text-muted-foreground">Manage your training history</p>
        </div>
        <Link href="/workouts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Workout
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] w-full rounded-xl" />
          ))
        ) : !workouts || workouts.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
             <Dumbbell className="h-10 w-10 text-muted-foreground mb-4" />
             <h3 className="text-lg font-semibold">No workouts yet</h3>
             <p className="text-muted-foreground mb-4">Start your journey by logging your first session.</p>
             <Link href="/workouts/new"><Button>Start Now</Button></Link>
          </div>
        ) : (
          // 3. Map over 'workouts' (the data array), not 'history' (the query object)
          workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))
        )}
      </div>
    </div>
  );
}