"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBodyMeasurementForDate,
  logBodyMeasurementAction,
} from "@/app/actions/body-measurements";
import {
  getDailyActivityForDateAction,
  updateDailyActivityAction,
} from "@/app/actions/daily-health-log";
import { useUnitSystem } from "@/stores/use-settings-store";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function useQuickLogData(date = toDateInput(new Date())) {
  const queryClient = useQueryClient();
  const unitSystem = useUnitSystem();
  const queryKey = ["dashboard", "quick-log", date] as const;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [measurement, dailyActivity] = await Promise.all([
        getBodyMeasurementForDate({ type: "me" }, date),
        getDailyActivityForDateAction({ type: "me" }, date),
      ]);

      return {
        date,
        measurement,
        dailyActivity,
      };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const saveWeight = useMutation({
    mutationFn: async (weight: number) => {
      await logBodyMeasurementAction(
        { type: "me" },
        {
          date,
          weight,
        },
        unitSystem
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const saveWaterIntake = useMutation({
    mutationFn: async (waterIntakeMl: number | null) => {
      await updateDailyActivityAction(
        { type: "me" },
        {
          date,
          water_intake_ml: waterIntakeMl,
        }
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    date,
    query,
    saveWeight,
    saveWaterIntake,
  };
}
