"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Dumbbell, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { ExerciseActions } from "./exercises-actions";
import { ExerciseSheet } from "./exercises-sheet";
import { useInfiniteQueryExercises } from "@/hooks/use-exercise";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";
import { formatCategoryWithMuscleFocus } from "@/lib/exercises/muscle-groups";

const muscleFilters = ["all", "chest", "back", "legs", "shoulders", "arms", "core", "glutes", "cardio"] as const;
type MuscleFilter = (typeof muscleFilters)[number];

type ExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  muscle_groups: string[] | null;
};

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function filterLabel(filter: MuscleFilter) {
  return filter === "all" ? "All" : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`;
}

function matchesMuscleFilter(exercise: ExerciseRow, filter: MuscleFilter) {
  if (filter === "all") return true;
  const target = normalizeText(filter);
  const category = normalizeText(exercise.category);
  const muscles = (exercise.muscle_groups || []).map((entry) => normalizeText(entry));

  if (target === "cardio") {
    return category.includes("cardio") || muscles.some((entry) => entry.includes("cardio"));
  }

  return category.includes(target) || muscles.some((entry) => entry.includes(target));
}

export function ExercisesList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleFilter>("all");
  const debouncedSearch = useDebounce(search, 350);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isFetching } = useInfiniteQueryExercises(debouncedSearch);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<ExerciseRow | null>(null);

  const exercises = useMemo(
    () => ((data?.pages.flatMap((page) => page.data) || []) as ExerciseRow[]),
    [data]
  );
  const totalLibraryCount = data?.pages?.[0]?.total ?? exercises.length;

  const filteredExercises = useMemo(
    () => exercises.filter((exercise) => matchesMuscleFilter(exercise, selectedMuscle)),
    [exercises, selectedMuscle]
  );

  const handleEdit = useCallback((exercise: ExerciseRow) => {
    setEditingExercise(exercise);
    setIsSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingExercise(null);
    setIsSheetOpen(true);
  }, []);

  return (
    <div className="section-gap flex h-full flex-1 flex-col">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Exercise Library</h1>
            <p className="text-sm text-muted-foreground">{totalLibraryCount} exercises in your library</p>
          </div>
          <Button type="button" className="accent-strong px-5 text-black" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search exercises, muscles, aliases..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 border-border/60 bg-muted/20 pl-11 text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {muscleFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={cn(
                "rounded-[10px] border px-4 py-2 text-sm font-medium transition-colors",
                selectedMuscle === filter
                  ? "border-chart-1/60 bg-chart-1/18 text-chart-1"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSelectedMuscle(filter)}
            >
              {filterLabel(filter)}
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filteredExercises.length} exercises found</p>
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refreshing
          </span>
        ) : null}
      </div>

      <section className="glass-surface !rounded-[10px] flex flex-1 flex-col overflow-hidden border-border/60">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] w-full rounded-[10px]" />
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center px-4 text-center text-muted-foreground">
            <Dumbbell className="mb-3 h-11 w-11 opacity-25" />
            <p className="text-base font-medium">No exercises found.</p>
            <p className="mt-1 text-sm">Try a different search term or muscle filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredExercises.map((exercise) => {
              const muscles = exercise.muscle_groups || [];
              const categoryLabel = formatCategoryWithMuscleFocus({
                category: exercise.category,
                muscleGroups: muscles,
              });
              return (
                <div key={exercise.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => router.push(`/exercises/${exercise.id}`)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-chart-1/18 text-chart-1">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold md:text-base">{exercise.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="uppercase tracking-[0.1em]">{categoryLabel}</span>
                        {muscles.slice(0, 3).map((muscle) => (
                          <span key={muscle} className="rounded-[10px] border border-border/55 bg-muted/30 px-2 py-0.5">
                            {muscle}
                          </span>
                        ))}
                        {muscles.length > 3 ? <span>+{muscles.length - 3}</span> : null}
                      </div>
                    </div>
                  </button>
                  <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
                    <ExerciseActions exercise={exercise} onEdit={handleEdit} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {hasNextPage ? (
        <div className="flex justify-center pt-2 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full border-border/60 bg-muted/20 sm:w-auto"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      ) : null}

      <ExerciseSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} exerciseToEdit={editingExercise} />
    </div>
  );
}
