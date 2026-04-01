import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { currentMealDay } from "@/lib/nutrition/meal-ui";
import { toDateInput } from "@/lib/utils/date";

export type NutritionSubjectType = "self" | "user" | "client";
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

type MealTypeOrderUpdater = string[] | ((previous: string[]) => string[]);

type NutritionUiState = {
  selectedDate: string;
  activeSubjectType: NutritionSubjectType;
  activeSubjectId: string | null;
  selectedMealGroupId: string;
  selectedPlannerDay: NutritionPlannerDay;
  diaryMealTypeOrder: string[];
  plannerMealTypeOrderByDay: Partial<Record<NutritionPlannerDay, string[]>>;
  mealGroupMealTypeOrderByGroup: Record<string, Partial<Record<NutritionPlannerDay, string[]>>>;
  diaryFilters: NutritionDiaryFilters;
  plannerFilters: NutritionPlannerFilters;
  recentDiaryItems: NutritionRecentDiaryItem[];
};

type NutritionUiActions = {
  setSelectedDate: (value: string) => void;
  setActiveSubject: (type: NutritionSubjectType, id: string | null) => void;
  setSelectedMealGroupId: (value: string | null | undefined) => void;
  setSelectedPlannerDay: (value: NutritionPlannerDay) => void;
  setDiaryMealTypeOrder: (value: MealTypeOrderUpdater) => void;
  clearDiaryMealTypeOrder: () => void;
  setPlannerMealTypeOrder: (day: NutritionPlannerDay, value: MealTypeOrderUpdater) => void;
  clearPlannerMealTypeOrder: (day: NutritionPlannerDay) => void;
  setMealGroupMealTypeOrder: (mealGroupId: string, day: NutritionPlannerDay, value: MealTypeOrderUpdater) => void;
  clearMealGroupMealTypeOrder: (mealGroupId: string, day: NutritionPlannerDay) => void;
  setDiaryFilters: (value: Partial<NutritionDiaryFilters>) => void;
  setPlannerFilters: (value: Partial<NutritionPlannerFilters>) => void;
  pushRecentDiaryItem: (value: NutritionRecentDiaryItem) => void;
  resetNutritionUiState: () => void;
};

type NutritionUiStore = NutritionUiState & NutritionUiActions;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
const EMPTY_MEAL_TYPE_ORDER: string[] = [];

function initialState(): NutritionUiState {
  return {
    selectedDate: toDateInput(new Date()),
    activeSubjectType: "self",
    activeSubjectId: null,
    selectedMealGroupId: "",
    selectedPlannerDay: currentMealDay(),
    diaryMealTypeOrder: [],
    plannerMealTypeOrderByDay: {},
    mealGroupMealTypeOrderByGroup: {},
    diaryFilters: {
      meal_type: null,
      favorites_meal_type: null,
    },
    plannerFilters: {
      meal_type: null,
    },
    recentDiaryItems: [],
  };
}

function normalizeDiaryMealTypeOrder(value: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    const key = `${item || ""}`.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

export const useNutritionUiStore = create<NutritionUiStore>()(
  persist(
    (set) => ({
      ...initialState(),
      setSelectedDate: (value) => set({ selectedDate: value }),
      setActiveSubject: (type, id) => set({ activeSubjectType: type, activeSubjectId: id }),
      setSelectedMealGroupId: (value) => set({ selectedMealGroupId: (value || "").trim() }),
      setSelectedPlannerDay: (value) => set({ selectedPlannerDay: value }),
      setDiaryMealTypeOrder: (value) =>
        set((state) => ({
          diaryMealTypeOrder: normalizeDiaryMealTypeOrder(
            typeof value === "function" ? value(state.diaryMealTypeOrder) : value
          ),
        })),
      clearDiaryMealTypeOrder: () => set({ diaryMealTypeOrder: [] }),
      setPlannerMealTypeOrder: (day, value) =>
        set((state) => {
          const previous = state.plannerMealTypeOrderByDay[day] ?? EMPTY_MEAL_TYPE_ORDER;
          const next = normalizeDiaryMealTypeOrder(typeof value === "function" ? value([...previous]) : value);
          return {
            plannerMealTypeOrderByDay: {
              ...state.plannerMealTypeOrderByDay,
              [day]: next,
            },
          };
        }),
      clearPlannerMealTypeOrder: (day) =>
        set((state) => {
          if (!state.plannerMealTypeOrderByDay[day]) return state;
          const next = { ...state.plannerMealTypeOrderByDay };
          delete next[day];
          return {
            plannerMealTypeOrderByDay: next,
          };
        }),
      setMealGroupMealTypeOrder: (mealGroupId, day, value) =>
        set((state) => {
          const normalizedGroupId = mealGroupId.trim();
          if (!normalizedGroupId) return state;

          const currentGroupOrder = state.mealGroupMealTypeOrderByGroup[normalizedGroupId] ?? {};
          const previous = currentGroupOrder[day] ?? EMPTY_MEAL_TYPE_ORDER;
          const next = normalizeDiaryMealTypeOrder(typeof value === "function" ? value([...previous]) : value);

          return {
            mealGroupMealTypeOrderByGroup: {
              ...state.mealGroupMealTypeOrderByGroup,
              [normalizedGroupId]: {
                ...currentGroupOrder,
                [day]: next,
              },
            },
          };
        }),
      clearMealGroupMealTypeOrder: (mealGroupId, day) =>
        set((state) => {
          const normalizedGroupId = mealGroupId.trim();
          if (!normalizedGroupId) return state;

          const currentGroupOrder = state.mealGroupMealTypeOrderByGroup[normalizedGroupId];
          if (!currentGroupOrder?.[day]) return state;

          const nextGroupOrder = { ...currentGroupOrder };
          delete nextGroupOrder[day];

          if (Object.keys(nextGroupOrder).length === 0) {
            const nextGroups = { ...state.mealGroupMealTypeOrderByGroup };
            delete nextGroups[normalizedGroupId];
            return { mealGroupMealTypeOrderByGroup: nextGroups };
          }

          return {
            mealGroupMealTypeOrderByGroup: {
              ...state.mealGroupMealTypeOrderByGroup,
              [normalizedGroupId]: nextGroupOrder,
            },
          };
        }),
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
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<NutritionUiState>;
        return {
          ...currentState,
          ...persisted,
          selectedDate: currentState.selectedDate,
          selectedPlannerDay: currentState.selectedPlannerDay,
        };
      },
      partialize: (state) => ({
        activeSubjectType: state.activeSubjectType,
        activeSubjectId: state.activeSubjectId,
        selectedMealGroupId: state.selectedMealGroupId,
        diaryMealTypeOrder: state.diaryMealTypeOrder,
        plannerMealTypeOrderByDay: state.plannerMealTypeOrderByDay,
        mealGroupMealTypeOrderByGroup: state.mealGroupMealTypeOrderByGroup,
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

export const useNutritionDiaryMealTypeOrder = () => useNutritionUiStore((state) => state.diaryMealTypeOrder);
export const useSetNutritionDiaryMealTypeOrder = () => useNutritionUiStore((state) => state.setDiaryMealTypeOrder);
export const useClearNutritionDiaryMealTypeOrder = () => useNutritionUiStore((state) => state.clearDiaryMealTypeOrder);
export const useNutritionPlannerMealTypeOrder = (day: NutritionPlannerDay) =>
  useNutritionUiStore((state) => state.plannerMealTypeOrderByDay[day] ?? EMPTY_MEAL_TYPE_ORDER);
export const useSetNutritionPlannerMealTypeOrder = () => useNutritionUiStore((state) => state.setPlannerMealTypeOrder);
export const useClearNutritionPlannerMealTypeOrder = () => useNutritionUiStore((state) => state.clearPlannerMealTypeOrder);
export const useNutritionMealGroupMealTypeOrder = (mealGroupId: string, day: NutritionPlannerDay) => {
  const normalizedMealGroupId = mealGroupId.trim();
  return useNutritionUiStore((state) => state.mealGroupMealTypeOrderByGroup[normalizedMealGroupId]?.[day] ?? EMPTY_MEAL_TYPE_ORDER);
};
export const useSetNutritionMealGroupMealTypeOrder = () => useNutritionUiStore((state) => state.setMealGroupMealTypeOrder);
export const useClearNutritionMealGroupMealTypeOrder = () => useNutritionUiStore((state) => state.clearMealGroupMealTypeOrder);

export const useSetNutritionDiaryFilters = () => useNutritionUiStore((state) => state.setDiaryFilters);

export const useNutritionRecentDiaryItems = () => useNutritionUiStore((state) => state.recentDiaryItems);
export const usePushNutritionRecentDiaryItem = () => useNutritionUiStore((state) => state.pushRecentDiaryItem);
