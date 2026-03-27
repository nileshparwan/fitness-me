"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInfiniteQueryExercises } from "@/hooks/use-exercise";
import { useDebounce } from "@/hooks/use-debounce";
import { Database } from "@/types/database";

type Exercise = Database["public"]["Tables"]["exercise_catalog"]["Row"];

interface CardioExerciseSelectorProps {
  onSelect: (exercise: { id: string; name: string }) => void;
}

export function CardioExerciseSelector({ onSelect }: CardioExerciseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQueryExercises(debouncedSearch, "cardio");
  const exerciseList = data?.pages.flatMap((page) => page.data) || [];

  const handleSelect = (exercise: Exercise) => {
    onSelect({ id: exercise.id, name: exercise.name });
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Add Cardio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Cardio Exercise</DialogTitle>
        </DialogHeader>
        <div className="p-2">
          <div className="relative mb-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cardio exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : exerciseList.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No cardio exercises found.</div>
            ) : (
              <div className="space-y-1">
                {exerciseList.map((exercise) => (
                  <Button
                    key={exercise.id}
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => handleSelect(exercise)}
                  >
                    <div className="flex flex-col items-start">
                      <span>{exercise.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {exercise.category || "cardio"}
                      </span>
                    </div>
                  </Button>
                ))}

                {hasNextPage ? (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? "Loading..." : "Load more cardio exercises"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
