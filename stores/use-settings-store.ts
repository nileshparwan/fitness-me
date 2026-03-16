import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type PreferredUnits = "metric" | "imperial";

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
      }),
    }
  )
);

export function useUnitLabels() {
  const units = useSettingsStore((state) => state.preferred_units);
  return {
    weight: units === "imperial" ? "lbs" : "kg",
    volume: units === "imperial" ? "fl oz" : "ml",
    distance: units === "imperial" ? "mi" : "km",
    macro: "g",
    energy: "kcal",
  } as const;
}
