import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import {
  circumferenceUnit,
  distanceUnit,
  heightUnit,
  speedUnit,
  weightUnit,
  type UnitSystem,
} from "@/utils/unit-conversion";
import type { CoachSpecialty, FitnessLevel, GenderType } from "@/types/health";
import { useShallow } from "zustand/react/shallow";

export type PreferredUnits = UnitSystem;

type SettingsState = {
  preferred_units: PreferredUnits;
  default_macros: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  compact_mode: boolean;
  hydrated: boolean;
  last_synced_at: number | null;
  gender: GenderType | null;
  fitness_level: FitnessLevel | null;
  coach_specialty: CoachSpecialty | null;
  is_pregnant: boolean;
  due_date: string | null;
  is_postpartum: boolean;
  postpartum_since: string | null;
};

type SettingsActions = {
  hydrate: (data: Partial<SettingsState>) => void;
  setUnits: (units: PreferredUnits) => void;
  setDefaultMacros: (macros: SettingsState["default_macros"]) => void;
  setCompactMode: (enabled: boolean) => void;
  markStale: () => void;
};

type SettingsStore = SettingsState & SettingsActions;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const initialState: SettingsState = {
  preferred_units: "metric",
  default_macros: {
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
  },
  compact_mode: false,
  hydrated: false,
  last_synced_at: null,
  gender: null,
  fitness_level: null,
  coach_specialty: null,
  is_pregnant: false,
  due_date: null,
  is_postpartum: false,
  postpartum_since: null,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      hydrate: (data) =>
        set((state) => ({
          ...state,
          ...data,
          default_macros: {
            ...state.default_macros,
            ...(data.default_macros || {}),
          },
          hydrated: true,
          last_synced_at: Date.now(),
        })),
      setUnits: (units) => set({ preferred_units: units }),
      setDefaultMacros: (macros) => set({ default_macros: macros }),
      setCompactMode: (enabled) => set({ compact_mode: enabled }),
      markStale: () => set({ hydrated: false }),
    }),
    {
      name: "fittrack-settings",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : localStorage)),
      partialize: (state) => ({
        preferred_units: state.preferred_units,
        default_macros: state.default_macros,
        compact_mode: state.compact_mode,
        hydrated: state.hydrated,
        last_synced_at: state.last_synced_at,
        gender: state.gender,
        fitness_level: state.fitness_level,
        coach_specialty: state.coach_specialty,
        is_pregnant: state.is_pregnant,
        due_date: state.due_date,
        is_postpartum: state.is_postpartum,
        postpartum_since: state.postpartum_since,
      }),
    }
  )
);

export function useUnitLabels() {
  const units = useSettingsStore((state) => state.preferred_units);
  return {
    weight: weightUnit(units),
    height: heightUnit(units),
    circumference: circumferenceUnit(units),
    distance: distanceUnit(units),
    speed: speedUnit(units),
    volume: units === "imperial" ? "fl oz" : "ml",
    macro: "g",
    energy: "kcal",
  } as const;
}

export function useUnitSystem(): PreferredUnits {
  return useSettingsStore((state) => state.preferred_units);
}

export function useProfileMetadata() {
  return useSettingsStore(
    useShallow((state) => ({
      gender: state.gender,
      fitness_level: state.fitness_level,
      coach_specialty: state.coach_specialty,
      is_pregnant: state.is_pregnant,
      due_date: state.due_date,
      is_postpartum: state.is_postpartum,
      postpartum_since: state.postpartum_since,
    }))
  );
}
