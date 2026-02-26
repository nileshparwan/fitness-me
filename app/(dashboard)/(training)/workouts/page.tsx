"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Dumbbell, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkouts } from "@/hooks/use-workout";
import { WorkoutCard } from "@/components/workout/workout-card";
import { WorkoutListItem } from "@/components/workout/workout-list-item";
import { useDebounce } from "@/hooks/use-debounce";

const statusFilters = ["all", "draft", "active", "completed", "archived"] as const;

export default function WorkoutsPage() {
  const { history } = useWorkouts();
  const { data: workouts, isLoading, isFetching } = history;

  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("all");
  const debouncedSearch = useDebounce(search, 300);

  const filteredWorkouts = useMemo(() => {
    const source = workouts || [];
    const query = debouncedSearch.trim().toLowerCase();

    return source.filter((workout) => {
      const matchesStatus = status === "all" ? true : (workout.status || "draft") === status;
      if (!matchesStatus) return false;
      if (!query) return true;

      const name = (workout.name || "").toLowerCase();
      return (
        name.includes(query) ||
        workout.id.toLowerCase().includes(query) ||
        (workout.status || "").toLowerCase().includes(query)
      );
    });
  }, [workouts, debouncedSearch, status]);

  return (
    <div className="page-shell section-gap">
      <div className="native-surface md:desktop-surface surface-pad flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Workouts</h2>
          <p className="text-muted-foreground">Manage your training history</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workouts..."
              className="pl-8"
            />
          </div>

          <Select value={status} onValueChange={(next) => setStatus(next as (typeof statusFilters)[number])}>
            <SelectTrigger className="w-full sm:w-[138px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((value) => (
                <SelectItem key={value} value={value}>
                  {value[0]?.toUpperCase() + value.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")} className="w-auto">
            <TabsList className="grid w-[100px] grid-cols-2 h-9">
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

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="native-surface flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Dumbbell className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{workouts?.length ? "No matching workouts" : "No workouts yet"}</h3>
          <p className="text-muted-foreground mb-4">
            {workouts?.length
              ? "Adjust your filters to see more sessions."
              : "Start your journey by logging your first session."}
          </p>
          <Link href="/workouts/new"><Button>Start Now</Button></Link>
        </div>
      ) : (
        <>
          {isFetching && (
            <p className="text-xs text-muted-foreground">Refreshing workouts...</p>
          )}

          <div className={view === "grid" ? "flex flex-wrap gap-4" : "hidden"}>
            {filteredWorkouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>

          <div className={view === "list" ? "space-y-3" : "hidden"}>
            {filteredWorkouts.map((workout) => (
              <WorkoutListItem key={workout.id} workout={workout} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
