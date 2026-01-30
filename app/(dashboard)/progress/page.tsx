"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAvailableExercises, getExerciseMetrics, getUserProfile, getMuscleBalance, getExerciseDetails } from "@/app/actions/progress";
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

type WorkoutLogRow = Database['public']['Tables']['workout_logs']['Row'];
type CardioLogRow = Database['public']['Tables']['cardio_logs']['Row'];

type StrengthChartData = {
  date: string;
  estimated_1rm: number;
  volume: number;
  bodyWeight?: number | null;
};

type CardioChartData = {
  date: string;
  pace: number;
  heart_rate: number;
  distance: number;
};

export default function ProgressPage() {
  const [exercise, setExercise] = useState<string>("");
  const [range, setRange] = useState("6M");

  // 1. Fetch Exercises List
  const { data: exercises, isLoading: loadingExercises } = useQuery({
    queryKey: ["exercises-list"],
    queryFn: getAvailableExercises,
    staleTime: 1000 * 60 * 10, // Cache for 10 mins
  });

  // Effect: Set default exercise safely once loaded
  useEffect(() => {
    if (!exercise && exercises && exercises.length > 0) {
      setExercise(exercises[0]);
    }
  }, [exercises, exercise]);

  // 2. Fetch Metrics (metrics wait for 'exercise' to be set)
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["metrics", exercise, range],
    queryFn: () => getExerciseMetrics(exercise, range),
    enabled: !!exercise, // Only run if exercise is selected
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
    queryKey: ["ex-details", exercise],
    queryFn: () => getExerciseDetails(exercise),
    enabled: !!exercise,
    staleTime: 1000 * 60 * 30
  });

  // --- LOADING STATE ---
  // Show Skeleton while initial exercises load OR while metrics load for the first time
  if (loadingExercises || (exercise && loadingMetrics)) {
    return <ProgressSkeleton />;
  }

  const isCardio = metrics?.type === "cardio";
  const logs = metrics?.logs || [];
  const chartData = metrics?.chartData || [];
  
  // Safe exercise name
  const currentExerciseName = exercise || "Loading...";

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-24 bg-gray-50/30 min-h-screen animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Progress Hub</h1>
          <p className="text-muted-foreground">Deep analysis of your {isCardio ? "endurance" : "strength"} journey.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Select value={exercise} onValueChange={setExercise} disabled={loadingExercises}>
            <SelectTrigger className="w-full md:w-[240px] bg-white border-gray-200 shadow-sm transition-all hover:border-indigo-300">
              <SelectValue placeholder="Select Movement" />
            </SelectTrigger>
            <SelectContent>
              {exercises?.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
            </SelectContent>
          </Select>

          <Tabs value={range} onValueChange={setRange} className="bg-white rounded-md border p-1 shadow-sm">
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
           <CardioAnalytics logs={logs as unknown as CardioLogRow[]} /> 

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
              <CardioCharts data={chartData as unknown as CardioChartData[]} exerciseName={currentExerciseName} />
              
              <div className="col-span-1 h-full">
                 <AthleteRadar data={radarData || []} />
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CardioCoach logs={logs as unknown as CardioLogRow[]} birthDate={profile?.birth_date} />
           </div>
           
           <div className="grid grid-cols-1">
             <HistoryTable logs={logs as any[]} />
           </div>
        </div>
      ) : (
        // === STRENGTH VIEW ===
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
          <AnalyticsPanel logs={logs as unknown as WorkoutLogRow[]} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
             <ProgressCharts 
                data={chartData as unknown as StrengthChartData[]} 
                exerciseName={currentExerciseName} 
                timeRange={range} 
             />
             <div className="col-span-1 h-full">
                <AthleteRadar data={radarData || []} />
             </div>
          </div>
          
          <div className="grid grid-cols-1">
             <PhysioChart data={chartData as unknown as StrengthChartData[]} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <AdvancedCoach logs={logs as unknown as WorkoutLogRow[]} exerciseName={currentExerciseName} />
             <div className="col-span-1 h-full">
                <PersonalRecords logs={logs as unknown as WorkoutLogRow[]} />
             </div>
          </div>

           <div className="grid grid-cols-1">
             <HistoryTable logs={logs as any[]} />
           </div>
        </div>
      )}
    </div>
  );
}