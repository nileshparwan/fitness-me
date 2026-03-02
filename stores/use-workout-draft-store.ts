import { create } from "zustand";

import { WorkoutFormValues } from "@/types/workout";

type WorkoutEntry = WorkoutFormValues["exercises"][number];
type ActionExercise =
  | {
      type: "cardio";
      name: string;
      notes?: string;
      cardio_sets?: {
        set_number: number;
        duration: number;
        distance?: number;
        reps?: number;
        calories?: number;
        heartRate?: number;
      }[];
      reps?: number;
      duration?: number;
      distance?: number;
      calories?: number;
      heartRate?: number;
    }
  | {
      type: "strength";
      exercise_id?: string;
      name: string;
      notes?: string;
      sets: {
        set_number: number;
        reps: number;
        weight: number;
        rest_seconds?: number;
        tempo?: string;
        is_warmup?: boolean;
        is_dropset?: boolean;
      }[];
    };

interface WorkoutDraftStore {
  entries: WorkoutEntry[];
  strengthEntries: Extract<WorkoutEntry, { type: "strength" }>[];
  cardioEntries: Extract<WorkoutEntry, { type: "cardio" }>[];
  setEntries: (entries: WorkoutEntry[]) => void;
  clear: () => void;
}

function splitEntries(entries: WorkoutEntry[]) {
  return {
    strengthEntries: entries.filter(
      (entry): entry is Extract<WorkoutEntry, { type: "strength" }> => entry.type === "strength"
    ),
    cardioEntries: entries.filter(
      (entry): entry is Extract<WorkoutEntry, { type: "cardio" }> => entry.type === "cardio"
    ),
  };
}

export function mapEntriesToActionExercises(
  entries: WorkoutEntry[]
): ActionExercise[] {
  return entries.map((entry) =>
    entry.type === "cardio"
      ? {
          type: "cardio",
          name: entry.name,
          notes: entry.notes,
          cardio_sets: entry.cardio_sets,
          reps: entry.reps,
          duration: entry.duration,
          distance: entry.distance,
          calories: entry.calories,
          heartRate: entry.heartRate,
        }
      : {
          type: "strength",
          exercise_id: entry.exercise_id,
          name: entry.name,
          notes: entry.notes,
          sets: entry.sets.map((set) => ({
            set_number: set.set_number,
            reps: set.reps,
            weight: set.weight,
            rest_seconds: set.rest_seconds,
            tempo: set.tempo,
            is_warmup: set.is_warmup,
            is_dropset: set.is_dropset,
          })),
        }
  );
}

export const useWorkoutDraftStore = create<WorkoutDraftStore>((set) => ({
  entries: [],
  strengthEntries: [],
  cardioEntries: [],
  setEntries: (entries) =>
    set(() => ({
      entries,
      ...splitEntries(entries),
    })),
  clear: () =>
    set(() => ({
      entries: [],
      strengthEntries: [],
      cardioEntries: [],
    })),
}));
