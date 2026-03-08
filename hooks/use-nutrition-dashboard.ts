"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchNutritionDashboardMockData } from "@/lib/mock-api/nutrition-dashboard";
import { nutritionDashboardKeys } from "@/lib/query-keys-nutrition-dashboard";

export function useNutritionDashboard() {
  return useQuery({
    queryKey: nutritionDashboardKeys.summary(),
    queryFn: fetchNutritionDashboardMockData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
