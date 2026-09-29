"use client";

import { CheckCircle2, Flame, Trophy } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ComplianceRecoveryData } from "@/app/actions/progress-overview";
import { cn } from "@/utils";

type StreaksStripProps = {
  data: ComplianceRecoveryData | undefined;
  isLoading: boolean;
};

function computeWorkoutStreaks(calendar: ComplianceRecoveryData["workout_calendar"] | undefined) {
  const days = [...(calendar || [])]
    .filter((row) => row.session_count > 0)
    .map((row) => row.date)
    .sort((a, b) => a.localeCompare(b));

  if (days.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let currentRun = 0;
  let trailing = 0;

  for (let index = 0; index < days.length; index += 1) {
    const current = new Date(`${days[index]}T00:00:00Z`).getTime();
    const previous = index > 0 ? new Date(`${days[index - 1]}T00:00:00Z`).getTime() : null;
    const isContinuous = previous !== null && current - previous === 86_400_000;
    currentRun = isContinuous ? currentRun + 1 : 1;
    if (currentRun > longest) longest = currentRun;
  }

  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (index === days.length - 1) {
      trailing = 1;
      continue;
    }
    const current = new Date(`${days[index]}T00:00:00Z`).getTime();
    const next = new Date(`${days[index + 1]}T00:00:00Z`).getTime();
    if (next - current === 86_400_000) {
      trailing += 1;
      continue;
    }
    break;
  }

  return { current: trailing, longest };
}

export function StreaksStrip({ data, isLoading }: StreaksStripProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-32 rounded-full" />
        ))}
      </div>
    );
  }

  const workoutStreaks = computeWorkoutStreaks(data?.workout_calendar);
  const loggingStreak = Math.max(
    data?.day_streak ?? 0,
    ...((data?.habits || []).map((habit) => habit.streak_days))
  );
  const streakItems = [
    {
      label: "Current Streak",
      value: `${workoutStreaks.current} days`,
      icon: Flame,
      accent: "bg-amber-500/10 text-amber-200 border-amber-400/20",
    },
    {
      label: "Best Streak",
      value: `${workoutStreaks.longest} days`,
      icon: Trophy,
      accent: "bg-yellow-500/10 text-yellow-200 border-yellow-400/20",
    },
    {
      label: "Logging Streak",
      value: `${loggingStreak} days`,
      icon: CheckCircle2,
      accent: "bg-emerald-500/10 text-emerald-200 border-emerald-400/20",
    },
    ...(data?.habits || []).slice(0, 3).map((habit) => ({
      label: habit.name,
      value: `${habit.streak_days} day streak`,
      icon: Flame,
      accent: "bg-white/[0.03] text-foreground border-white/10",
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {streakItems.map((item) => (
        <div
          key={item.label}
          className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs", item.accent)}
        >
          <item.icon className="h-3.5 w-3.5" />
          <span className="font-medium">{item.label}</span>
          <span className="text-current/80">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
