"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAvailableExercises,
  getExerciseMetrics,
  getUserProfile,
  getMuscleBalance,
  getExerciseDetails,
  type CardioChartPoint,
  type StrengthChartPoint,
} from "@/app/actions/progress";
import { Database } from "@/types/database";

// UI Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// UNIFIED COMPONENTS
// Note: Adjusted paths to standard naming conventions based on previous components
import { ExerciseProfile } from "@/components/progress/exercise-profile";
import { AnalyticsPanel } from "@/components/progress/analytics-panel";
import { PersonalRecords } from "@/components/progress/personal-records";
import { HistoryTable } from "@/components/progress/history-table";
import { AthleteRadar } from "@/components/progress/athlete-radar";


// CARDIO COMPONENTS
import { CardioCharts } from "@/components/progress/cardio-charts";
import { CardioCoach } from "@/components/progress/cardio-coach";
import { CardioAnalytics } from "@/components/progress/cardio-analytics";

// SKELETON LOADING
import { ProgressSkeleton } from "./_components/progress-skeleton";
import { ProgressCharts } from "@/components/progress/progress-chart";
import { PhysioChart } from "@/components/progress/physical-chart";
import { AdvancedCoach } from "@/components/progress/advance-coach";
import { CardioInsightsBoard, StrengthInsightsBoard } from "@/components/progress/insights-board";

type WorkoutLogRow = Database['public']['Tables']['strength_sets']['Row'];
type CardioLogRow = Database['public']['Tables']['cardio_sessions']['Row'];

export default function ProgressPage() {
  const [exercise, setExercise] = useState<string>("");
  const [range, setRange] = useState("6M");

  // 1. Fetch Exercises List
  const { data: exercises, isLoading: loadingExercises } = useQuery({
    queryKey: ["exercises-list"],
    queryFn: getAvailableExercises,
    staleTime: 1000 * 60 * 10, // Cache for 10 mins
  });

  const selectedExercise = exercise || exercises?.[0] || "";

  // 2. Fetch Metrics (metrics wait for 'exercise' to be set)
  const { data: metrics, isLoading: loadingMetrics, isFetching: fetchingMetrics } = useQuery({
    queryKey: ["metrics", selectedExercise, range],
    queryFn: () => getExerciseMetrics(selectedExercise, range),
    enabled: !!selectedExercise,
    placeholderData: (previous) => previous,
  });

  // 3. Parallel Data Fetching
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: getUserProfile,
    staleTime: 1000 * 60 * 30
  });

  const { data: radarData } = useQuery({
    queryKey: ["radar-balance"],
    queryFn: getMuscleBalance,
    staleTime: 1000 * 60 * 10
  });

  const { data: exDetails } = useQuery({
    queryKey: ["ex-details", selectedExercise],
    queryFn: () => getExerciseDetails(selectedExercise),
    enabled: !!selectedExercise,
    staleTime: 1000 * 60 * 30
  });

  const isCardio = metrics?.type === "cardio";
  const currentExerciseName = selectedExercise || "Loading...";
  const cardioLogs: CardioLogRow[] = useMemo(
    () => (metrics?.type === "cardio" ? metrics.logs : []),
    [metrics],
  );
  const strengthLogs: WorkoutLogRow[] = useMemo(
    () => (metrics?.type === "strength" ? metrics.logs : []),
    [metrics],
  );
  const cardioChartData: CardioChartPoint[] = useMemo(
    () => (metrics?.type === "cardio" ? metrics.chartData : []),
    [metrics],
  );
  const strengthChartData: StrengthChartPoint[] = useMemo(
    () => (metrics?.type === "strength" ? metrics.chartData : []),
    [metrics],
  );

  const strengthSummary = useMemo(() => {
    if (strengthLogs.length === 0 || strengthChartData.length === 0) {
      return {
        sessions: 0,
        avgSessionsPerWeek: 0,
        latest1RM: 0,
        oneRmChangePercent: 0,
        relativeStrength: null,
        avgVolumePerSession: 0,
        avgRestSeconds: null,
        workSetRatio: 0,
      };
    }

    const sessionDays = new Set(
      strengthLogs
        .map((log) => log.created_at?.split("T")[0])
        .filter((day): day is string => Boolean(day)),
    );
    const sessions = sessionDays.size;
    const sortedDates = Array.from(sessionDays).sort();
    const firstDay = new Date(sortedDates[0]);
    const lastDay = new Date(sortedDates[sortedDates.length - 1]);
    const spanWeeks = Math.max(1, (lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24 * 7) + 1 / 7);

    const latest1RM = strengthChartData[strengthChartData.length - 1]?.estimated_1rm || 0;
    const baseline1RM = strengthChartData[0]?.estimated_1rm || 0;
    const oneRmChangePercent = baseline1RM > 0 ? ((latest1RM - baseline1RM) / baseline1RM) * 100 : 0;

    const avgVolumePerSession =
      strengthChartData.reduce((acc, point) => acc + point.volume, 0) / Math.max(strengthChartData.length, 1);

    const restValues = strengthLogs.map((log) => log.rest_seconds).filter((rest): rest is number => Boolean(rest));
    const avgRestSeconds =
      restValues.length > 0 ? restValues.reduce((acc, rest) => acc + rest, 0) / restValues.length : null;

    const workSetCount = strengthLogs.filter((log) => !log.is_warmup).length;
    const warmupCount = strengthLogs.filter((log) => Boolean(log.is_warmup)).length;
    const workSetRatio = workSetCount / Math.max(workSetCount + warmupCount, 1);

    const latestBodyWeight =
      [...strengthChartData].reverse().find((point) => point.bodyWeight && point.bodyWeight > 0)?.bodyWeight || null;
    const relativeStrength = latestBodyWeight ? latest1RM / latestBodyWeight : null;

    return {
      sessions,
      avgSessionsPerWeek: sessions / spanWeeks,
      latest1RM,
      oneRmChangePercent,
      relativeStrength,
      avgVolumePerSession,
      avgRestSeconds,
      workSetRatio,
    };
  }, [strengthLogs, strengthChartData]);

  const cardioSummary = useMemo(() => {
    if (cardioLogs.length === 0) {
      return {
        sessions: 0,
        avgSessionsPerWeek: 0,
        totalDistanceKm: 0,
        avgPaceMinPerKm: 0,
        paceImprovementPercent: 0,
        avgHeartRate: null,
        weeklyDistanceKm: 0,
        totalElevationM: 0,
      };
    }

    const totalDistanceKm = cardioLogs.reduce((acc, log) => acc + (log.distance_km || 0), 0);
    const totalDurationMin = cardioLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
    const avgPaceMinPerKm = totalDistanceKm > 0 ? totalDurationMin / totalDistanceKm : 0;

    const paced = cardioLogs
      .map((log) => ({
        pace: log.distance_km && log.distance_km > 0 ? log.duration_minutes / log.distance_km : 0,
        date: new Date(log.date).getTime(),
      }))
      .filter((entry) => entry.pace > 0)
      .sort((a, b) => a.date - b.date);
    const firstPace = paced[0]?.pace || 0;
    const latestPace = paced[paced.length - 1]?.pace || 0;
    const paceImprovementPercent = firstPace > 0 ? ((firstPace - latestPace) / firstPace) * 100 : 0;

    const hrValues = cardioLogs
      .map((log) => log.average_heart_rate)
      .filter((hr): hr is number => Boolean(hr && hr > 0));
    const avgHeartRate = hrValues.length ? hrValues.reduce((acc, hr) => acc + hr, 0) / hrValues.length : null;

    const sessionDays = new Set(cardioLogs.map((log) => log.date.split("T")[0]));
    const sortedDates = Array.from(sessionDays).sort();
    const firstDay = new Date(sortedDates[0]);
    const lastDay = new Date(sortedDates[sortedDates.length - 1]);
    const spanWeeks = Math.max(1, (lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24 * 7) + 1 / 7);

    return {
      sessions: sessionDays.size,
      avgSessionsPerWeek: sessionDays.size / spanWeeks,
      totalDistanceKm,
      avgPaceMinPerKm,
      paceImprovementPercent,
      avgHeartRate,
      weeklyDistanceKm: totalDistanceKm / spanWeeks,
      totalElevationM: cardioLogs.reduce((acc, log) => acc + (log.elevation_gain_m || 0), 0),
    };
  }, [cardioLogs]);

  // =========================================================
  // ⚡️ PERFORMANCE FIX: ROBUST LOADING GUARD
  // =========================================================

  if (loadingExercises) {
    return <ProgressSkeleton />;
  }

  if (loadingMetrics || (!metrics && fetchingMetrics)) {
    return <ProgressSkeleton />;
  }

  if (exercises && exercises.length === 0) {
    return (
      <div className="p-12 text-center min-h-screen flex flex-col items-center justify-center text-muted-foreground">
        <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
        <p>Complete a workout to see your progress analytics here.</p>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1600px] mx-auto section-gap pb-24 min-h-screen animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="native-surface md:desktop-surface p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Progress Hub</h1>
          <p className="text-muted-foreground">Deep analysis of your {isCardio ? "endurance" : "strength"} journey.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={selectedExercise} onValueChange={setExercise} disabled={loadingExercises}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Select Movement" />
            </SelectTrigger>
            <SelectContent>
              {exercises?.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
            </SelectContent>
          </Select>

          <Tabs value={range} onValueChange={setRange} className="rounded-md border p-1 shadow-sm bg-background/80">
            <TabsList className="h-9">
              <TabsTrigger value="1M">1M</TabsTrigger>
              <TabsTrigger value="6M">6M</TabsTrigger>
              <TabsTrigger value="1Y">1Y</TabsTrigger>
              <TabsTrigger value="ALL">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {!isCardio && <ExerciseProfile details={exDetails || null} />}

      {isCardio ? (
        // === CARDIO VIEW ===
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <CardioInsightsBoard summary={cardioSummary} />
          <CardioAnalytics logs={cardioLogs} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
            <CardioCharts data={cardioChartData} exerciseName={currentExerciseName} />

            <div className="col-span-1 h-full">
              <AthleteRadar data={radarData || []} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CardioCoach logs={cardioLogs} birthDate={profile?.birth_date} />
          </div>

          <div className="grid grid-cols-1">
            <HistoryTable logs={cardioLogs} />
          </div>
        </div>
      ) : (
        // === STRENGTH VIEW ===
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <StrengthInsightsBoard summary={strengthSummary} />
          <AnalyticsPanel logs={strengthLogs} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
            <ProgressCharts
              data={strengthChartData}
              exerciseName={currentExerciseName}
              timeRange={range}
            />
            <div className="col-span-1 h-full">
              <AthleteRadar data={radarData || []} />
            </div>
          </div>

          <div className="grid grid-cols-1">
            <PhysioChart data={strengthChartData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AdvancedCoach logs={strengthLogs} exerciseName={currentExerciseName} />
            <div className="col-span-1 h-full">
              <PersonalRecords logs={strengthLogs} />
            </div>
          </div>

          <div className="grid grid-cols-1">
            <HistoryTable logs={strengthLogs} />
          </div>
        </div>
      )}
    </div>
  );
}
