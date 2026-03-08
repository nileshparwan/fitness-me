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
      sport_type?: string;
      indoor_outdoor?: "indoor" | "outdoor";
      weather_conditions?: string;
      device_source?: string;
      avg_cadence_rpm?: number;
      avg_power_watts?: number;
      avg_speed_kmh?: number;
      max_speed_kmh?: number;
      vo2max_estimate?: number;
      training_load_score?: number;
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
        rpe?: number;
        rir?: number;
        tempo?: string;
        is_warmup?: boolean;
        is_dropset?: boolean;
        paused?: boolean;
        touch_and_go?: boolean;
        equipment_type?: string;
        side?: "bilateral" | "left" | "right";
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
          sport_type: entry.sport_type,
          indoor_outdoor: entry.indoor_outdoor,
          weather_conditions: entry.weather_conditions,
          device_source: entry.device_source,
          avg_cadence_rpm: entry.avg_cadence_rpm,
          avg_power_watts: entry.avg_power_watts,
          avg_speed_kmh: entry.avg_speed_kmh,
          max_speed_kmh: entry.max_speed_kmh,
          vo2max_estimate: entry.vo2max_estimate,
          training_load_score: entry.training_load_score,
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
            rpe: set.rpe,
            rir: set.rir,
            tempo: set.tempo,
            is_warmup: set.is_warmup,
            is_dropset: set.is_dropset,
            paused: set.paused,
            touch_and_go: set.touch_and_go,
            equipment_type: set.equipment_type,
            side: set.side,
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
