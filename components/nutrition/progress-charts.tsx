"use client";

import { useMemo, useState } from "react";
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, Cell
} from "recharts";
import { format, eachDayOfInterval, parseISO, startOfToday, differenceInCalendarDays, isAfter, min, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NutritionProgram, NutritionMeal } from "@/types/nutrition";
import { GoalData } from "@/app/actions/nutrition-progress";
import { ProgramSelector } from "./program-selector";

// --- TYPES ---
interface Props {
  programs: (NutritionProgram & { nutrition_meals: NutritionMeal[] })[];
  goals: GoalData | null;
}

interface DailyStat {
  date: string;
  displayDate: string;
  dailyCalories: number;
  dailyGoal: number;
  cumulativeCalories: number;
  cumulativeGoal: number;
}

interface MacroSummary {
  name: string;
  grams: number;
  fill: string;
}

// --- MAIN COMPONENT ---
export function ProgressCharts({ programs, goals }: Props) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(programs?.[0]?.id || null);
  const [viewMode, setViewMode] = useState<"full" | "current">("full");
  const [chartType, setChartType] = useState<"cumulative" | "daily">("cumulative");

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId),
    [programs, selectedProgramId]
  );

  // --- DATA CALCULATION ---
  const { chartData, analytics, macroData } = useMemo(() => {
    if (!selectedProgram?.start_date || !selectedProgram?.end_date) {
      return { chartData: [], analytics: null, macroData: [] };
    }

    try {
      const startDate = parseISO(selectedProgram.start_date);
      const endDate = parseISO(selectedProgram.end_date);
      const today = startOfToday();

      // 1. Calculate Daily Template Stats
      const dailyBase = selectedProgram.nutrition_meals
      .filter(meal => meal.status === 'active')
      .reduce((acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein_g || 0),
        carbs: acc.carbs + (meal.carbs_g || 0),
        fats: acc.fats + (meal.fats_g || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

      const dailyGoalTarget = goals?.daily_calories || 2000;

      // 2. Macro Data
      const mData: MacroSummary[] = [
        { name: "Protein", grams: dailyBase.protein, fill: "#3b82f6" },
        { name: "Carbs", grams: dailyBase.carbs, fill: "#a855f7" },
        { name: "Fats", grams: dailyBase.fats, fill: "#f97316" },
      ];

      // 3. Date Range
      const effectiveEndDate = viewMode === "full" ? endDate : min([today, endDate]);
      
      if (viewMode === "current" && isBefore(effectiveEndDate, startDate)) {
         return { chartData: [], analytics: null, macroData: [] };
      }

      const daysInterval = eachDayOfInterval({ start: startDate, end: effectiveEndDate });

      let runningCalories = 0;
      let runningGoal = 0;

      const data: DailyStat[] = daysInterval.map(day => {
        runningCalories += dailyBase.calories;
        runningGoal += dailyGoalTarget;
        return {
          date: format(day, "yyyy-MM-dd"),
          displayDate: format(day, "MMM d"),
          dailyCalories: dailyBase.calories,
          dailyGoal: dailyGoalTarget,
          cumulativeCalories: runningCalories,
          cumulativeGoal: runningGoal,
        };
      });

      // 4. Summary Stats
      const totalDays = differenceInCalendarDays(endDate, startDate) + 1;
      const daysElapsed = Math.max(0, Math.min(differenceInCalendarDays(today, startDate) + 1, totalDays));
      
      const stats = {
        totalDuration: totalDays,
        currentDuration: daysElapsed,
        dailyCalories: dailyBase.calories,
        totalPlannedCalories: dailyBase.calories * totalDays,
        currentPlannedCalories: dailyBase.calories * daysElapsed,
      };

      return { chartData: data, analytics: stats, macroData: mData };

    } catch (e) {
      console.error("Calculation Error", e);
      return { chartData: [], analytics: null, macroData: [] };
    }
  }, [selectedProgram, viewMode, goals]);

  if (!programs.length) return <div className="text-center p-8 text-muted-foreground">No programs found.</div>;

  return (
    <div className="space-y-6">
      <ProgressControls 
        programs={programs}
        selectedId={selectedProgramId}
        onSelect={setSelectedProgramId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        chartType={chartType}
        setChartType={setChartType}
      />

      {analytics && (
        <ProgressStats 
          analytics={analytics} 
          goalDailyCalories={goals?.daily_calories} 
          viewMode={viewMode} 
        />
      )}

      <ProgressChartTabs 
        chartData={chartData} 
        macroData={macroData} 
        chartType={chartType} 
        hasGoal={!!goals?.daily_calories} 
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ProgressControls({ programs, selectedId, onSelect, viewMode, setViewMode, chartType, setChartType }: any) {
  return (
    <div className="flex flex-col gap-2">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="w-full md:w-auto z-20">
              <ProgramSelector 
                programs={programs} 
                selectedId={selectedId} 
                onSelect={onSelect} 
              />
          </div>
          
          <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
                 <SelectTrigger className="w-full md:w-[130px] h-8 text-[10px] md:text-xs bg-card"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="full">Full Duration</SelectItem>
                   <SelectItem value="current">Current Progress</SelectItem>
                 </SelectContent>
              </Select>
              
              <Select value={chartType} onValueChange={setChartType}>
                 <SelectTrigger className="w-[100px] h-8 text-[10px] md:text-xs bg-card"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="cumulative">Cumulative</SelectItem>
                   <SelectItem value="daily">Daily Avg</SelectItem>
                 </SelectContent>
              </Select>
          </div>
       </div>
    </div>
  );
}

function ProgressStats({ analytics, goalDailyCalories, viewMode }: any) {
  return (
    <div className="grid grid-cols-4 gap-1.5 md:gap-4">
       <StatsCard 
         title="Days"
         value={`${analytics.currentDuration}/${analytics.totalDuration}`}
         desc={viewMode === 'full' ? "Total" : "Elapsed"}
       />
       <StatsCard 
         title="Cals"
         value={viewMode === 'full' 
           ? `${(analytics.totalPlannedCalories / 1000).toFixed(0)}k` 
           : `${(analytics.currentPlannedCalories / 1000).toFixed(0)}k`
         }
         desc="Total"
         trend
       />
       <StatsCard 
         title="Daily"
         value={`${Math.round(analytics.dailyCalories)}`}
         desc="kcal"
       />
       <StatsCard 
         title="Delta"
         value={goalDailyCalories 
            ? `${Math.round(analytics.dailyCalories - goalDailyCalories)}` 
            : "-"
         }
         desc="vs Goal"
         trend
         inverse 
       />
    </div>
  );
}

function ProgressChartTabs({ chartData, macroData, chartType, hasGoal }: any) {
  return (
    <Tabs defaultValue="calories" className="w-full">
      <TabsList className="grid w-full grid-cols-2 h-8 mb-2 bg-muted/50 p-0.5 rounded-lg">
        <TabsTrigger value="calories" className="text-[10px] h-7 rounded-md data-[state=active]:bg-background shadow-none data-[state=active]:shadow-sm">Calories</TabsTrigger>
        <TabsTrigger value="macros" className="text-[10px] h-7 rounded-md data-[state=active]:bg-background shadow-none data-[state=active]:shadow-sm">Macros</TabsTrigger>
      </TabsList>

      <TabsContent value="calories" className="mt-0">
        <Card className="border shadow-sm">
          <CardHeader className="p-2.5 pb-0">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {chartType === "cumulative" ? "Cumulative Progress" : "Daily Targets"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 h-[180px] md:h-[300px] w-full pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="displayDate" tick={{fontSize: 9, fill: '#888'}} minTickGap={30} tickLine={false} axisLine={false} dy={4} />
                <YAxis tick={{fontSize: 9, fill: '#888'}} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '4px 8px' }} />
                
                {chartType === "cumulative" ? (
                   <Line type="monotone" dataKey="cumulativeGoal" stroke="#ef4444" strokeDasharray="3 3" name="Goal" dot={false} strokeWidth={2} />
                ) : (
                   hasGoal && <Line type="monotone" dataKey="dailyGoal" stroke="#ef4444" strokeDasharray="3 3" name="Goal" dot={false} strokeWidth={2} />
                )}

                <Area 
                  type="monotone" 
                  dataKey={chartType === "cumulative" ? "cumulativeCalories" : "dailyCalories"} 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  fill="url(#colorCal)" 
                  name="Calories"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="macros" className="mt-0">
         <Card className="border shadow-sm">
          <CardHeader className="p-2.5 pb-0">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Daily Macro Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-2.5 h-[180px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macroData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 500}} axisLine={false} tickLine={false} dy={4} />
                <YAxis tick={{fontSize: 9}} axisLine={false} tickLine={false} width={25} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '6px', fontSize: '11px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '4px 8px' }} />
                <Bar dataKey="grams" radius={[4, 4, 0, 0]} name="Grams">
                  {macroData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StatsCard({ title, value, desc, trend, inverse }: any) {
    let textColor = "text-foreground";
    if (trend) {
        textColor = "text-primary";
        if (inverse) {
           const isNegative = typeof value === 'string' && value.includes("-");
           textColor = isNegative ? "text-green-500" : "text-red-500";
        }
    }
    return (
        <div className="bg-card border rounded-lg p-2 md:p-4 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[60px]">
            <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-1">{title}</span>
            <div className={`text-sm md:text-2xl font-bold tracking-tight leading-none ${textColor}`}>{value}</div>
            <span className="text-[9px] md:text-[10px] text-muted-foreground leading-none mt-1 opacity-80">{desc}</span>
        </div>
    )
}