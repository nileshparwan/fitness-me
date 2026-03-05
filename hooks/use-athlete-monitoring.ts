"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addNutritionMealAction,
  getMyAssignedProgramsAction,
  getNutritionLogForDateAction,
  listWearableIntegrationsAction,
  upsertDailyActivityAction,
  upsertDailyBiofeedbackAction,
  upsertNutritionLogAction,
  upsertSleepLogAction,
  upsertVitalsLogAction,
  upsertWearableIntegrationAction,
  upsertWeeklyCheckinAction,
} from "@/app/actions/athlete-monitoring";

export function useNutritionLogByDate(date: string) {
  return useQuery({
    queryKey: ["nutrition", "daily-log", date],
    queryFn: () => getNutritionLogForDateAction(date),
    enabled: Boolean(date),
  });
}

export function useWearableIntegrations() {
  return useQuery({
    queryKey: ["wearables", "integrations"],
    queryFn: listWearableIntegrationsAction,
    staleTime: 30_000,
  });
}

export function useAssignedPrograms() {
  return useQuery({
    queryKey: ["programs", "assigned"],
    queryFn: getMyAssignedProgramsAction,
    staleTime: 60_000,
  });
}

export function useAthleteMonitoringMutations() {
  const queryClient = useQueryClient();

  const saveBiofeedback = useMutation({
    mutationFn: upsertDailyBiofeedbackAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const saveActivity = useMutation({
    mutationFn: upsertDailyActivityAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const saveNutritionLog = useMutation({
    mutationFn: upsertNutritionLogAction,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["nutrition", "daily-log", variables.date] });
      await queryClient.invalidateQueries({ queryKey: ["progress", "nutrition"] });
    },
  });

  const addNutritionMeal = useMutation({
    mutationFn: addNutritionMealAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["nutrition", "daily-log"] });
    },
  });

  const saveWeeklyCheckin = useMutation({
    mutationFn: upsertWeeklyCheckinAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const saveVitals = useMutation({
    mutationFn: upsertVitalsLogAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const saveSleep = useMutation({
    mutationFn: upsertSleepLogAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const saveWearable = useMutation({
    mutationFn: upsertWearableIntegrationAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wearables", "integrations"] });
    },
  });

  return {
    saveBiofeedback,
    saveActivity,
    saveNutritionLog,
    addNutritionMeal,
    saveWeeklyCheckin,
    saveVitals,
    saveSleep,
    saveWearable,
  };
}
