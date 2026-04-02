"use client";

import { useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getNutritionDiaryDayAction } from "@/app/actions/nutrition-manual";
import { listNutritionDashboardActivityAction } from "@/app/actions/nutrition-dashboard";
import { NUTRITION_DASHBOARD_QUICK_ACTIONS, type NutritionDashboardData } from "@/lib/nutrition/dashboard";
import { resolveNutritionSubject } from "@/lib/nutrition/subject";
import { nutritionKeys } from "@/lib/query-keys-nutrition";
import { toDateInput } from "@/lib/utils/date";
import { useNutritionActiveSubject } from "@/stores/use-nutrition-ui-store";

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

function normalizeTarget(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function relativeTimeLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "just now";
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
}

export function useNutritionDashboard() {
  const { activeSubjectType, activeSubjectId } = useNutritionActiveSubject();
  const subject = useMemo(() => resolveNutritionSubject(activeSubjectType, activeSubjectId), [activeSubjectId, activeSubjectType]);
  const today = useMemo(() => toDateInput(new Date()), []);

  const diaryQuery = useQuery({
    queryKey: nutritionKeys.dashboardSummary(subject, today, undefined),
    queryFn: () =>
      getNutritionDiaryDayAction({
        performed_on: today,
        subject,
        nutrition_plan_id: undefined,
      }),
    enabled: Boolean(today),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const activityQuery = useQuery({
    queryKey: nutritionKeys.dashboardActivity(subject, 10, undefined),
    queryFn: () =>
      listNutritionDashboardActivityAction({
        subject,
        limit: 10,
        nutrition_plan_id: undefined,
      }),
    staleTime: 60_000,
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

    const calorieTarget = normalizeTarget(targets?.daily_calorie_target);
    const proteinTarget = normalizeTarget(targets?.daily_protein_target_g);
    const carbsTarget = normalizeTarget(targets?.daily_carbs_target_g);
    const fatTarget = normalizeTarget(targets?.daily_fat_target_g);

    return {
      dateLabel: formatIsoDateLabel(diary?.performed_on || today),
      consumedCalories: calories,
      targetCalories: calorieTarget ?? Math.max(calories, 1),
      calorieTarget,
      activePlanName: targets?.name ?? null,
      macros: [
        {
          key: "protein",
          label: "Protein",
          grams: protein,
          targetGrams: proteinTarget,
          percent:
            diary?.progress.protein_pct == null
              ? proteinTarget
                ? clampPercent((protein / proteinTarget) * 100)
                : null
              : clampPercent(diary.progress.protein_pct),
        },
        {
          key: "carbs",
          label: "Carbs",
          grams: carbs,
          targetGrams: carbsTarget,
          percent:
            diary?.progress.carbs_pct == null
              ? carbsTarget
                ? clampPercent((carbs / carbsTarget) * 100)
                : null
              : clampPercent(diary.progress.carbs_pct),
        },
        {
          key: "fat",
          label: "Fat",
          grams: fat,
          targetGrams: fatTarget,
          percent:
            diary?.progress.fat_pct == null
              ? fatTarget
                ? clampPercent((fat / fatTarget) * 100)
                : null
              : clampPercent(diary.progress.fat_pct),
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
    diaryIsLoading: diaryQuery.isLoading,
    activityIsLoading: activityQuery.isLoading,
    isLoading: diaryQuery.isLoading || activityQuery.isLoading,
    isFetching: diaryQuery.isFetching || activityQuery.isFetching,
    isError: diaryQuery.isError || activityQuery.isError,
    error: diaryQuery.error || activityQuery.error,
    refetch: async () => {
      await Promise.all([diaryQuery.refetch(), activityQuery.refetch()]);
    },
  };
}
