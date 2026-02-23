"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Dumbbell, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkouts } from "@/hooks/use-workout";
import { WorkoutCard } from "@/components/workout/workout-card";
import { WorkoutListItem } from "@/components/workout/workout-list-item"; // Import the new component

export default function WorkoutsPage() {
  const { history } = useWorkouts();
  const { data: workouts, isLoading } = history;

  // Default view state
  const [view, setView] = useState<"grid" | "list">("list");

  return (
    <div className="page-shell section-gap">
      {/* Header & Controls */}
      <div className="native-surface md:desktop-surface surface-pad flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Workouts</h2>
          <p className="text-muted-foreground">Manage your training history</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Switcher */}
          <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")} className="w-auto">
            <TabsList className="grid w-[100px] grid-cols-2">
              <TabsTrigger value="grid" title="Grid View"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="list" title="List View"><List className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>

          <Link href="/workouts/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Log Workout
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !workouts || workouts.length === 0 ? (
        <div className="native-surface flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Dumbbell className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No workouts yet</h3>
          <p className="text-muted-foreground mb-4">Start your journey by logging your first session.</p>
          <Link href="/workouts/new"><Button>Start Now</Button></Link>
        </div>
      ) : (
        <>
          {/* GRID VIEW */}
          <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "hidden"}>
            {workouts.map((workout: any) => (
              <div key={workout.id} className="w-full">
                <WorkoutCard workout={workout} />
              </div>
            ))}
          </div>

          {/* LIST VIEW */}
          <div className={view === "list" ? "space-y-3" : "hidden"}>
            {workouts.map((workout: any) => (
              <WorkoutListItem key={workout.id} workout={workout} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
