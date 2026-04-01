"use client";

import { Layers, Plus, Trash2, X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/app-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkoutFormValues } from "@/types/workout";

type StrengthEntry = Extract<WorkoutFormValues["exercises"][number], { type: "strength" }>;

const GROUP_LABELS = ["A", "B", "C", "D", "E", "F"];

interface SupersetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<WorkoutFormValues>;
}

function isStrength(
  entry: WorkoutFormValues["exercises"][number]
): entry is StrengthEntry {
  return entry.type === "strength";
}

export function SupersetManagerDialog({
  open,
  onOpenChange,
  form,
}: SupersetManagerDialogProps) {
  const entries = form.watch("exercises");

  function updateExercises(
    updater: (current: WorkoutFormValues["exercises"]) => WorkoutFormValues["exercises"]
  ) {
    const current = form.getValues("exercises") || [];
    const next = updater(current);
    form.setValue("exercises", next, { shouldDirty: true });
  }

  const supersetGroups = (() => {
    const seen = new Set<string>();
    const groups: Array<{ groupId: string; label: string; indices: number[] }> = [];
    let labelIndex = 0;

    entries.forEach((entry, index) => {
      if (!isStrength(entry) || !entry.superset_group_id) return;
      if (seen.has(entry.superset_group_id)) return;
      seen.add(entry.superset_group_id);

      const indices = entries.flatMap((candidate, candidateIndex) =>
        isStrength(candidate) && candidate.superset_group_id === entry.superset_group_id
          ? [candidateIndex]
          : []
      );

      groups.push({
        groupId: entry.superset_group_id,
        label: GROUP_LABELS[labelIndex] ?? String(labelIndex + 1),
        indices,
      });
      labelIndex += 1;
    });

    return groups;
  })();

  const unlinkedStrengthExercises = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => isStrength(entry) && !entry.superset_group_id)
    .map(({ entry, index }) => ({
      index,
      name: entry.name || `Exercise ${index + 1}`,
    }));

  function createSuperset() {
    if (unlinkedStrengthExercises.length < 2) return;
    const groupId = crypto.randomUUID();
    const [first, second] = unlinkedStrengthExercises;
    updateExercises((current) =>
      current.map((entry, index) =>
        index === first.index || index === second.index
          ? { ...(entry as StrengthEntry), superset_group_id: groupId }
          : entry
      )
    );
  }

  function addExerciseToGroup(groupId: string, exerciseIndex: number) {
    updateExercises((current) =>
      current.map((entry, index) =>
        index === exerciseIndex ? { ...(entry as StrengthEntry), superset_group_id: groupId } : entry
      )
    );
  }

  function removeExerciseFromGroup(exerciseIndex: number, groupIndices: number[]) {
    const remaining = groupIndices.filter((index) => index !== exerciseIndex);

    updateExercises((current) =>
      current.map((entry, index) => {
        if (!isStrength(entry)) return entry;
        if (index === exerciseIndex) return { ...entry, superset_group_id: undefined };
        if (remaining.length <= 1 && remaining.includes(index)) {
          return { ...entry, superset_group_id: undefined };
        }
        return entry;
      })
    );
  }

  function deleteGroup(indices: number[]) {
    updateExercises((current) =>
      current.map((entry, index) =>
        isStrength(entry) && indices.includes(index)
          ? { ...entry, superset_group_id: undefined }
          : entry
      )
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Manage Supersets
          </DialogTitle>
          <DialogDescription>
            Group exercises together to perform back-to-back without rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {supersetGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No supersets yet. Create one to group exercises together.
            </div>
          ) : (
            supersetGroups.map((group) => (
              <div key={group.groupId} className="rounded-[12px] border-2 border-chart-2/40 bg-chart-2/5 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/20 text-xs font-bold text-chart-2">
                      {group.label}
                    </span>
                    <span className="text-sm font-semibold">Superset {group.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.indices.length} exercise{group.indices.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteGroup(group.indices)}
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  {group.indices.map((exerciseIndex) => {
                    const exercise = entries[exerciseIndex];
                    return (
                      <div
                        key={exerciseIndex}
                        className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium">
                          {exercise?.name || `Exercise ${exerciseIndex + 1}`}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeExerciseFromGroup(exerciseIndex, group.indices)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {unlinkedStrengthExercises.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 w-full rounded-lg border border-dashed border-chart-2/40 text-xs text-chart-2 hover:bg-chart-2/10"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add exercise to group
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {unlinkedStrengthExercises.map((exercise) => (
                        <DropdownMenuItem
                          key={exercise.index}
                          onClick={() => addExerciseToGroup(group.groupId, exercise.index)}
                        >
                          {exercise.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            ))
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            disabled={unlinkedStrengthExercises.length < 2}
            onClick={createSuperset}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Superset
          </Button>

          {unlinkedStrengthExercises.length < 2 ? (
            <p className="text-center text-xs text-muted-foreground">
              Add at least 2 strength exercises to the workout to create a superset.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
