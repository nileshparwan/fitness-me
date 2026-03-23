"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, Clock3, Dumbbell, LayoutGrid, List, Loader2, Plus, Search } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useWorkouts } from "@/hooks/use-workout";
import { WorkoutStatusSelect } from "@/components/workout/workout-status-select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/utils";

const statusFilters = ["all", "draft", "active", "archived"] as const;
const PAGE_SIZE = 12;
type WorkoutStatusFilter = (typeof statusFilters)[number];
type WorkoutStatus = Exclude<WorkoutStatusFilter, "all">;

type WorkoutRow = {
  id: string;
  name: string | null;
  status: string | null;
  date: string | Date;
  duration_minutes: number | null;
  strength_sets: Array<{ id: string }>;
};

function normalizeWorkoutStatus(status: string | null | undefined): WorkoutStatus {
  if (status === "active" || status === "archived") return status;
  if (status === "completed") return "active";
  return "draft";
}

function statusLabel(status: WorkoutStatusFilter) {
  if (status === "all") return "All";
  if (status === "active") return "Active";
  if (status === "archived") return "Archived";
  return "Draft";
}

function formatWorkoutDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return format(date, "MMM d, yyyy");
}

function statusPillClass(status: WorkoutStatus) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/15 text-chart-2";
  if (status === "archived") return "border-border/70 bg-muted/35 text-muted-foreground";
  return "border-chart-4/40 bg-chart-4/15 text-chart-4";
}

function WorkoutSessionRow({ workout }: { workout: WorkoutRow }) {
  const [status, setStatus] = useState<WorkoutStatus>(normalizeWorkoutStatus(workout.status));

  useEffect(() => {
    setStatus(normalizeWorkoutStatus(workout.status));
  }, [workout.status]);

  const setCount = workout.strength_sets?.length || 0;
  const duration = workout.duration_minutes && workout.duration_minutes > 0 ? `${workout.duration_minutes} min` : null;

  return (
    <article className="glass-surface !rounded-[10px] border-border/50 px-3 py-3 md:px-4">
      <div className="flex items-center gap-3">
        <Link href={`/workouts/${workout.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chart-1/20 text-chart-1">
            <ClipboardList className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold md:text-base">{workout.name || "Untitled workout"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatWorkoutDate(workout.date)}</span>
              <span className="inline-flex items-center gap-1">
                <Dumbbell className="h-3 w-3" />
                {setCount}
              </span>
              {duration ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {duration}
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        <span className="hidden text-xs uppercase tracking-[0.12em] text-muted-foreground md:inline-flex">
          {status}
        </span>

        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          <WorkoutStatusSelect
            workoutId={workout.id}
            status={status}
            onStatusChange={(value) => setStatus(normalizeWorkoutStatus(value))}
            className={cn("min-w-[116px] rounded-full border px-3", statusPillClass(status))}
          />
        </div>

        <Link href={`/workouts/${workout.id}`} className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function WorkoutGridCard({ workout }: { workout: WorkoutRow }) {
  const [status, setStatus] = useState<WorkoutStatus>(normalizeWorkoutStatus(workout.status));

  useEffect(() => {
    setStatus(normalizeWorkoutStatus(workout.status));
  }, [workout.status]);

  const setCount = workout.strength_sets?.length || 0;
  const duration = workout.duration_minutes && workout.duration_minutes > 0 ? `${workout.duration_minutes} min` : null;

  return (
    <article className="glass-surface !rounded-[10px] border-border/50 p-4">
      <Link href={`/workouts/${workout.id}`} className="block space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/20 text-chart-1">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{status}</span>
        </div>
        <div>
          <p className="truncate text-base font-semibold">{workout.name || "Untitled workout"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatWorkoutDate(workout.date)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {setCount}
            </span>
            {duration ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {duration}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
        <WorkoutStatusSelect
          workoutId={workout.id}
          status={status}
          onStatusChange={(value) => setStatus(normalizeWorkoutStatus(value))}
          className={cn("w-full rounded-full border px-3", statusPillClass(status))}
        />
      </div>
    </article>
  );
}

export default function WorkoutsPage() {
  const { history } = useWorkouts();
  const { data: workouts, isLoading, isFetching } = history;

  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkoutStatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE); // Reset pagination on filter changes.
  }, [debouncedSearch, status]);

  const filteredWorkouts = useMemo(() => {
    const source = (workouts || []) as WorkoutRow[];
    const query = debouncedSearch.trim().toLowerCase();

    return source.filter((workout) => {
      const normalizedStatus = normalizeWorkoutStatus(workout.status);
      const matchesStatus = status === "all" ? true : normalizedStatus === status;
      if (!matchesStatus) return false;
      if (!query) return true;

      const name = (workout.name || "").trim().toLowerCase();
      return (
        name.includes(query) ||
        workout.id.toLowerCase().includes(query) ||
        normalizedStatus.includes(query)
      );
    });
  }, [workouts, debouncedSearch, status]);

  const visibleWorkouts = useMemo(
    () => filteredWorkouts.slice(0, visibleCount),
    [filteredWorkouts, visibleCount]
  );
  const hasMore = filteredWorkouts.length > visibleCount;
  const remainingCount = Math.max(filteredWorkouts.length - visibleCount, 0);

  return (
    <div className="page-shell section-gap pb-24 md:pb-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Workout Sessions</h1>
            <p className="text-sm text-muted-foreground">{filteredWorkouts.length} workouts total</p>
          </div>

          <Button asChild className="accent-strong rounded-[12px] text-black">
            <Link href="/workouts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Workout
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-10 rounded-[12px] border-border/60 bg-muted/20 pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workouts..."
            />
          </div>

          <div className="inline-flex rounded-[12px] border border-border/60 bg-muted/20 p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 rounded-[10px]", view === "list" ? "bg-chart-5/15 text-chart-5" : "text-muted-foreground")}
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn("h-8 w-8 rounded-[10px]", view === "grid" ? "bg-chart-5/15 text-chart-5" : "text-muted-foreground")}
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusFilters.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "rounded-[10px] border px-3 py-1.5 text-xs font-medium transition-colors",
                status === item
                  ? "border-chart-5/60 bg-chart-5/20 text-chart-5"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatus(item)}
            >
              {statusLabel(item)}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[78px] w-full rounded-[10px]" />
          ))}
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="glass-surface !rounded-[10px] border border-dashed border-border/60 p-12 text-center">
          <Dumbbell className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{workouts?.length ? "No matching workouts" : "No workouts yet"}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {workouts?.length
              ? "Adjust your filters to see more sessions."
              : "Start your journey by logging your first session."}
          </p>
          <Button asChild className="accent-strong text-black">
            <Link href="/workouts/new">Start now</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredWorkouts.length} {filteredWorkouts.length === 1 ? "workout" : "workouts"}
            </p>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Refreshing
              </span>
            ) : null}
          </div>

          <div className={view === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
            {visibleWorkouts.map((workout) => (
              <WorkoutGridCard key={workout.id} workout={workout} />
            ))}
          </div>

          <div className={view === "list" ? "space-y-3" : "hidden"}>
            {visibleWorkouts.map((workout) => (
              <WorkoutSessionRow key={workout.id} workout={workout} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="rounded-[12px] border-border/60 bg-muted/20"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Load more ({remainingCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
