"use client";

import { useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import { listNutritionDashboardActivityAction } from "@/app/actions/nutrition-dashboard";
import { useNutritionDiary } from "@/hooks/use-nutrition-manual";
import { NUTRITION_DASHBOARD_QUICK_ACTIONS, type NutritionDashboardData } from "@/lib/nutrition/dashboard";
import { resolveNutritionSubject } from "@/lib/nutrition/subject";
import { nutritionKeys } from "@/lib/query-keys-nutrition";
import { useNutritionActiveSubject, useNutritionSelectedMealGroupId } from "@/stores/use-nutrition-ui-store";

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIsoDateLabel(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function clampPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function relativeTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

export function useNutritionDashboard() {
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const selectedMealGroupId = useNutritionSelectedMealGroupId();
  const subject = useMemo(() => resolveNutritionSubject(activeSubjectType, activeSubjectId), [activeSubjectId, activeSubjectType]);
  const today = useMemo(() => toDateInput(new Date()), []);

  const diaryQuery = useNutritionDiary(today, subject, undefined, selectedMealGroupId || null);
  const activityQuery = useQuery({
    queryKey: nutritionKeys.dashboardActivity(subject, 10, selectedMealGroupId || null),
    queryFn: () =>
      listNutritionDashboardActivityAction({
        subject,
        limit: 10,
        meal_group_id: selectedMealGroupId || undefined,
      }),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const data = useMemo<NutritionDashboardData>(() => {
    const diary = diaryQuery.data;
    const totals = diary?.totals;
    const targets = diary?.active_plan;

    const calories = Math.round(Number(totals?.calories || 0));
    const protein = Math.round(Number(totals?.protein_g || 0));
    const carbs = Math.round(Number(totals?.carbs_g || 0));
    const fat = Math.round(Number(totals?.fat_g || 0));

    const proteinTarget = Math.round(Number(targets?.daily_protein_target_g || 0));
    const carbsTarget = Math.round(Number(targets?.daily_carbs_target_g || 0));
    const fatTarget = Math.round(Number(targets?.daily_fat_target_g || 0));

    return {
      greetingName: "You",
      greetingSubtitle: "Track your nutrition and manage your clients",
      dateLabel: formatIsoDateLabel(diary?.performed_on || today),
      consumedCalories: calories,
      targetCalories: Math.round(Number(targets?.daily_calorie_target || Math.max(calories, 1))),
      macros: [
        {
          key: "protein",
          label: "Protein",
          grams: protein,
          targetGrams: proteinTarget,
          percent: clampPercent(diary?.progress.protein_pct ?? (proteinTarget > 0 ? (protein / proteinTarget) * 100 : 0)),
        },
        {
          key: "carbs",
          label: "Carbs",
          grams: carbs,
          targetGrams: carbsTarget,
          percent: clampPercent(diary?.progress.carbs_pct ?? (carbsTarget > 0 ? (carbs / carbsTarget) * 100 : 0)),
        },
        {
          key: "fat",
          label: "Fat",
          grams: fat,
          targetGrams: fatTarget,
          percent: clampPercent(diary?.progress.fat_pct ?? (fatTarget > 0 ? (fat / fatTarget) * 100 : 0)),
        },
      ],
      quickActions: NUTRITION_DASHBOARD_QUICK_ACTIONS,
      recentActivity: (activityQuery.data || []).slice(0, 10).map((activity) => ({
        id: activity.id,
        type: activity.type,
        text: activity.text,
        timeLabel: relativeTimeLabel(activity.created_at),
        createdAt: activity.created_at,
        eventName: activity.event_name,
        subjectUserId: activity.subject_user_id,
        subjectClientId: activity.subject_client_id,
      })),
    };
  }, [activityQuery.data, diaryQuery.data, today]);

  return {
    data,
    isLoading: diaryQuery.isLoading || activityQuery.isLoading,
    isFetching: diaryQuery.isFetching || activityQuery.isFetching,
    isError: diaryQuery.isError || activityQuery.isError,
    error: diaryQuery.error || activityQuery.error,
    refetch: async () => {
      await Promise.all([diaryQuery.refetch(), activityQuery.refetch()]);
    },
  };
}
