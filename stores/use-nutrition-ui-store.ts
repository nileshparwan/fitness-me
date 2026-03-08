import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { currentMealDay } from "@/lib/nutrition/meal-ui";

export type NutritionSubjectType = "self" | "user" | "client";
type NutritionViewMode = "dashboard" | "diary" | "planner" | "groups";
type NutritionNavigationSource = "direct" | "dashboard" | "diary" | "planner" | "groups" | "client-workspace";
type NutritionPlannerDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type NutritionDiaryFilters = {
  meal_type: string | null;
  favorites_meal_type: string | null;
};

type NutritionPlannerFilters = {
  meal_type: string | null;
};

type NutritionRecentDiaryItem = {
  item_name: string;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  notes: string | null;
};

type NutritionUiState = {
  selectedDate: string;
  activeSubjectType: NutritionSubjectType;
  activeSubjectId: string | null;
  selectedMealGroupId: string;
  selectedPlannerDay: NutritionPlannerDay;
  diaryFilters: NutritionDiaryFilters;
  plannerFilters: NutritionPlannerFilters;
  viewMode: NutritionViewMode;
  navigationSource: NutritionNavigationSource;
  recentDiaryItems: NutritionRecentDiaryItem[];
};

type NutritionUiActions = {
  setSelectedDate: (value: string) => void;
  setActiveSubject: (type: NutritionSubjectType, id: string | null) => void;
  setSelectedMealGroupId: (value: string | null | undefined) => void;
  setSelectedPlannerDay: (value: NutritionPlannerDay) => void;
  setDiaryFilters: (value: Partial<NutritionDiaryFilters>) => void;
  setPlannerFilters: (value: Partial<NutritionPlannerFilters>) => void;
  setViewMode: (value: NutritionViewMode) => void;
  setNavigationSource: (value: NutritionNavigationSource) => void;
  pushRecentDiaryItem: (value: NutritionRecentDiaryItem) => void;
  resetNutritionUiState: () => void;
};

type NutritionUiStore = NutritionUiState & NutritionUiActions;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialState(): NutritionUiState {
  return {
    selectedDate: toDateInput(new Date()),
    activeSubjectType: "self",
    activeSubjectId: null,
    selectedMealGroupId: "",
    selectedPlannerDay: currentMealDay(),
    diaryFilters: {
      meal_type: null,
      favorites_meal_type: null,
    },
    plannerFilters: {
      meal_type: null,
    },
    viewMode: "dashboard",
    navigationSource: "direct",
    recentDiaryItems: [],
  };
}

export const useNutritionUiStore = create<NutritionUiStore>()(
  persist(
    (set) => ({
      ...initialState(),
      setSelectedDate: (value) => set({ selectedDate: value }),
      setActiveSubject: (type, id) => set({ activeSubjectType: type, activeSubjectId: id }),
      setSelectedMealGroupId: (value) => set({ selectedMealGroupId: (value || "").trim() }),
      setSelectedPlannerDay: (value) => set({ selectedPlannerDay: value }),
      setDiaryFilters: (value) =>
        set((state) => ({
          diaryFilters: {
            ...state.diaryFilters,
            ...value,
          },
        })),
      setPlannerFilters: (value) =>
        set((state) => ({
          plannerFilters: {
            ...state.plannerFilters,
            ...value,
          },
        })),
      setViewMode: (value) => set({ viewMode: value }),
      setNavigationSource: (value) => set({ navigationSource: value }),
      pushRecentDiaryItem: (value) =>
        set((state) => {
          const keyName = value.item_name.trim().toLowerCase();
          const keyUnit = (value.unit || "").trim().toLowerCase();
          const deduped = state.recentDiaryItems.filter((item) => {
            const itemName = item.item_name.trim().toLowerCase();
            const itemUnit = (item.unit || "").trim().toLowerCase();
            return itemName !== keyName || itemUnit !== keyUnit;
          });
          return {
            recentDiaryItems: [value, ...deduped].slice(0, 10),
          };
        }),
      resetNutritionUiState: () => set(initialState()),
    }),
    {
      name: "nutrition-ui-store",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : localStorage)),
      partialize: (state) => ({
        activeSubjectType: state.activeSubjectType,
        activeSubjectId: state.activeSubjectId,
        selectedMealGroupId: state.selectedMealGroupId,
        selectedDate: state.selectedDate,
        selectedPlannerDay: state.selectedPlannerDay,
        recentDiaryItems: state.recentDiaryItems,
      }),
    }
  )
);

export const useNutritionSelectedDate = () => useNutritionUiStore((state) => state.selectedDate);
export const useSetNutritionSelectedDate = () => useNutritionUiStore((state) => state.setSelectedDate);

export const useNutritionActiveSubject = () => {
  const activeSubjectType = useNutritionUiStore((state) => state.activeSubjectType);
  const activeSubjectId = useNutritionUiStore((state) => state.activeSubjectId);
  return useMemo(
    () => ({
      activeSubjectType,
      activeSubjectId,
    }),
    [activeSubjectId, activeSubjectType]
  );
};
export const useSetNutritionActiveSubject = () => useNutritionUiStore((state) => state.setActiveSubject);

export const useNutritionSelectedMealGroupId = () => useNutritionUiStore((state) => state.selectedMealGroupId);
export const useSetNutritionSelectedMealGroupId = () => useNutritionUiStore((state) => state.setSelectedMealGroupId);

export const useNutritionSelectedPlannerDay = () => useNutritionUiStore((state) => state.selectedPlannerDay);
export const useSetNutritionSelectedPlannerDay = () => useNutritionUiStore((state) => state.setSelectedPlannerDay);

export const useSetNutritionDiaryFilters = () => useNutritionUiStore((state) => state.setDiaryFilters);

export const useSetNutritionViewMode = () => useNutritionUiStore((state) => state.setViewMode);

export const useSetNutritionNavigationSource = () => useNutritionUiStore((state) => state.setNavigationSource);

export const useNutritionRecentDiaryItems = () => useNutritionUiStore((state) => state.recentDiaryItems);
export const usePushNutritionRecentDiaryItem = () => useNutritionUiStore((state) => state.pushRecentDiaryItem);
