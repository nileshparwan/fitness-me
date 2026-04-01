"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, CheckCircle2, Clock3, Drumstick, Flame, Layers, Plus, Sparkles, Target, TrendingUp, Users, UtensilsCrossed, Wheat } from "lucide-react";

import { ActivitySectionSkeleton, NutritionHeroSkeleton } from "@/components/nutrition/dashboard/nutrition-dashboard-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNutritionDashboardData, useNutritionPrefetch } from "@/hooks/use-nutrition-data";
import { getGreeting, getTodayLabel } from "@/lib/nutrition/greeting";
import type { NutritionDashboardActivity, NutritionDashboardData, NutritionDashboardMacro, NutritionDashboardQuickAction } from "@/lib/nutrition/dashboard";
import { computeNutritionVisualPercent } from "@/lib/nutrition/progress-bars";
import { useSetNutritionActiveSubject } from "@/stores/use-nutrition-ui-store";
import { cn } from "@/utils";

function DashboardHeader() {
  return (
    <section className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
      <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
    </section>
  );
}

function getGoalState(consumed: number, target: number | null) {
  if (!target || target <= 0) {
    return {
      state: "untracked" as const,
      delta: null,
      ringClass: "text-muted-foreground",
      filterColor: "var(--muted-foreground)",
      value: Math.round(consumed),
      label: "kcal logged",
    };
  }

  const safeTarget = Math.max(target, 1);
  const delta = consumed - safeTarget;

  if (delta > 0) {
    return {
      state: "over" as const,
      delta,
      ringClass: "text-chart-4",
      filterColor: "var(--chart-4)",
      value: Math.round(delta),
      label: "kcal over",
    };
  }

  if (delta === 0) {
    return {
      state: "met" as const,
      delta,
      ringClass: "text-emerald-400",
      filterColor: "rgb(52 211 153)",
      value: "Hit",
      label: "target reached",
    };
  }

  return {
    state: "below" as const,
    delta,
    ringClass: "text-chart-2",
    filterColor: "var(--chart-2)",
    value: Math.round(Math.abs(delta)),
    label: "kcal left",
  };
}

function CalorieRing({ consumed, target, compact = false }: { consumed: number; target: number | null; compact?: boolean }) {
  const safeTarget = Math.max(target ?? consumed ?? 1, 1);
  const progress = target ? Math.max(0, Math.min(100, Math.round((consumed / safeTarget) * 100))) : 100;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;
  const goalState = getGoalState(consumed, target);

  return (
    <div
      className={cn(
        "glass-subtle relative mx-auto transition-colors",
        goalState.state === "met" && "bg-emerald-500/5",
        goalState.state === "over" && "bg-chart-4/5",
        goalState.state === "untracked" && "bg-muted/10",
        compact ? "h-36 w-36 p-1.5" : "h-44 w-44 p-2.5 sm:h-48 sm:w-48 sm:p-3"
      )}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 180 180" role="img" aria-label={`Calorie progress ${progress}%`}>
        <circle cx="90" cy="90" r={radius} stroke="currentColor" strokeWidth="12" fill="none" className="text-muted/60" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          className={goalState.ringClass}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: dashOffset,
            filter: `drop-shadow(0 0 12px color-mix(in srgb, ${goalState.filterColor} 45%, transparent))`,
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className={cn("font-semibold leading-none tabular-nums", compact ? "text-3xl" : "text-4xl")}>{goalState.value}</p>
        <p className={cn("text-muted-foreground", compact ? "mt-1 text-xs" : "mt-1.5 text-sm")}>{goalState.label}</p>
      </div>
    </div>
  );
}

function macroConfig(macro: NutritionDashboardMacro) {
  if (macro.key === "protein") {
    return {
      Icon: Drumstick,
      valueClass: "text-chart-3",
      barClass: "bg-chart-3",
      iconClass: "text-chart-3",
    };
  }

  if (macro.key === "carbs") {
    return {
      Icon: Wheat,
      valueClass: "text-chart-4",
      barClass: "bg-chart-4",
      iconClass: "text-chart-4",
    };
  }

  return {
    Icon: Flame,
    valueClass: "text-chart-1",
    barClass: "bg-chart-1",
    iconClass: "text-chart-1",
  };
}

function MacroRow({ macro }: { macro: NutritionDashboardMacro }) {
  const config = macroConfig(macro);
  const percent = computeNutritionVisualPercent({
    metric: macro.key,
    value: macro.grams,
    target: macro.targetGrams,
    explicitPercent: macro.percent,
    maxPercent: 100,
  });

  return (
    <div className="flex items-center gap-3">
      <config.Icon className={cn("h-4 w-4 shrink-0", config.iconClass)} />
      <p className="w-14 shrink-0 text-sm text-muted-foreground">{macro.label}</p>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <Progress
          value={percent}
          className="h-1.5 bg-muted/80"
          indicatorClassName={config.barClass}
          animationDurationMs={1000}
        />
      </div>
      <p className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        <span className={cn("font-medium", config.valueClass)}>{macro.grams}g</span>
        {macro.targetGrams ? <span className="text-muted-foreground/60"> / {macro.targetGrams}g</span> : null}
      </p>
    </div>
  );
}

function CalorieStat({
  label,
  value,
  valueClass,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass-subtle flex flex-1 flex-col items-center gap-1 rounded-[10px] px-3 py-3", className)}>
      <p className={cn("text-lg font-semibold tabular-nums leading-none", valueClass ?? "text-foreground")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {hint ? <p className="text-[10px] text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}

function NutritionHeroCard({ data }: { data: NutritionDashboardData }) {
  const goalState = getGoalState(data.consumedCalories, data.calorieTarget);
  const remaining = data.calorieTarget ? Math.max(0, data.calorieTarget - data.consumedCalories) : 0;
  const overBy = data.calorieTarget ? Math.max(0, data.consumedCalories - data.calorieTarget) : 0;
  const isAlmostThere = goalState.state === "below" && remaining <= Math.max(100, data.targetCalories * 0.1);
  const statusBadge =
    goalState.state === "met" ? (
      <Badge className="border-emerald-400/20 bg-emerald-500/12 px-2.5 py-1 text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Target met
      </Badge>
    ) : goalState.state === "over" ? (
      <Badge className="border-chart-4/20 bg-chart-4/12 px-2.5 py-1 text-chart-4">
        <Sparkles className="h-3.5 w-3.5" />
        Target exceeded
      </Badge>
    ) : isAlmostThere ? (
      <Badge className="border-chart-2/20 bg-chart-2/12 px-2.5 py-1 text-chart-2">
        <Target className="h-3.5 w-3.5" />
        Almost there
      </Badge>
    ) : goalState.state === "untracked" ? (
      <Badge className="border-border/60 bg-muted/50 px-2.5 py-1 text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        No target set
      </Badge>
    ) : null;
  const summaryStat =
    goalState.state === "below" ? (
      <CalorieStat label="Remaining" value={remaining} valueClass="text-chart-3" hint="to reach today's goal" />
    ) : goalState.state === "met" ? (
      <CalorieStat
        label="Status"
        value="Complete"
        valueClass="text-emerald-300"
        hint="today's target achieved"
        className="border-emerald-400/20 bg-emerald-500/8"
      />
    ) : goalState.state === "over" ? (
      <CalorieStat
        label="Over By"
        value={overBy}
        valueClass="text-chart-4"
        hint="above today's target"
        className="border-chart-4/20 bg-chart-4/8"
      />
    ) : (
      <CalorieStat
        label="Status"
        value="Tracking only"
        valueClass="text-muted-foreground"
        hint="configure targets to enable goal completion"
      />
    );

  return (
    <section className="glass-surface surface-pad space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Nutrition</h2>
          {statusBadge}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {data.activePlanName ? (
            <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              {data.activePlanName}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden gap-6 md:flex md:items-center">
        <CalorieRing consumed={data.consumedCalories} target={data.calorieTarget} />
        <div className="flex flex-1 flex-col gap-4">
          {data.macros.map((macro) => (
            <MacroRow key={macro.key} macro={macro} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 md:hidden">
        <CalorieRing consumed={data.consumedCalories} target={data.calorieTarget} compact />
        <div className="w-full space-y-3">
          {data.macros.map((macro) => (
            <MacroRow key={macro.key} macro={macro} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <CalorieStat label="Consumed" value={data.consumedCalories} valueClass="text-chart-2" />
        <CalorieStat
          label="Target"
          value={data.calorieTarget ?? "Not set"}
          hint={data.calorieTarget ? undefined : "set default macro targets to track progress"}
        />
        {summaryStat}
      </div>
    </section>
  );
}

function quickActionConfig(action: NutritionDashboardQuickAction) {
  if (action.icon === "log") return { Icon: Plus };
  if (action.icon === "plans") return { Icon: CalendarDays };
  if (action.icon === "clients") return { Icon: Users };
  return { Icon: TrendingUp };
}

function QuickActionsRow({ actions }: { actions: NutritionDashboardQuickAction[] }) {
  const primary = actions.find((action) => action.id === "log") || actions[0] || null;
  const secondary = actions.filter((action) => action.id !== primary?.id).slice(0, 3);

  return (
    <section>
      <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
        {primary ? (
          <Button
            asChild
            className="accent-strong col-span-2 h-11 rounded-xl text-black hover:brightness-105 md:col-auto md:min-w-[140px] md:flex-none"
          >
            <Link href={primary.href}>
              <Plus className="mr-2 h-4 w-4" />
              {primary.label}
            </Link>
          </Button>
        ) : null}
        {secondary.map((action) => {
          const { Icon } = quickActionConfig(action);
          return (
            <Button key={action.id} asChild variant="outline" className="glass-subtle h-11 rounded-xl border-border/60">
              <Link href={action.href}>
                <Icon className="mr-2 h-4 w-4 text-chart-2" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

function activityStyle(type: NutritionDashboardActivity["type"]): {
  iconBg: string;
  iconColor: string;
  Icon: LucideIcon;
} {
  switch (type) {
    case "meal":
      return { iconBg: "bg-chart-2/15", iconColor: "text-chart-2", Icon: UtensilsCrossed };
    case "assignment":
      return { iconBg: "bg-chart-3/15", iconColor: "text-chart-3", Icon: CalendarDays };
    case "group":
      return { iconBg: "bg-chart-4/15", iconColor: "text-chart-4", Icon: Layers };
    case "progress":
      return { iconBg: "bg-chart-1/15", iconColor: "text-chart-1", Icon: TrendingUp };
    case "client":
      return { iconBg: "bg-primary/10", iconColor: "text-primary", Icon: Users };
    default:
      return { iconBg: "bg-muted/60", iconColor: "text-muted-foreground", Icon: UtensilsCrossed };
  }
}

function RecentActivityRow({
  activity,
  withSeparator,
}: {
  activity: NutritionDashboardActivity;
  withSeparator: boolean;
}) {
  const { Icon, iconBg, iconColor } = activityStyle(activity.type);

  return (
    <div className={cn("flex items-center justify-between gap-3 py-4", withSeparator && "border-b border-border/60")}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <p className="truncate text-sm sm:text-base">{activity.text}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground sm:gap-1.5 sm:text-sm">
        <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span className="whitespace-nowrap">{activity.timeLabel}</span>
      </div>
    </div>
  );
}

function ActivitySection({ activities }: { activities: NutritionDashboardActivity[] }) {
  return (
    <section className="glass-surface surface-pad">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
        <Link href="/nutrition/diary" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
          View diary →
        </Link>
      </div>
      <div className="rounded-[10px] border border-border/60 bg-card/60 px-4">
        {activities.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No recent nutrition activity yet.</p>
        ) : (
          activities.map((activity, index) => (
            <RecentActivityRow key={activity.id} activity={activity} withSeparator={index < activities.length - 1} />
          ))
        )}
      </div>
    </section>
  );
}

export function NutritionDashboard() {
  const { data, diaryIsLoading, activityIsLoading, isError, refetch } = useNutritionDashboardData();
  const setActiveSubject = useSetNutritionActiveSubject();
  useNutritionPrefetch();

  useEffect(() => {
    setActiveSubject("self", null);
  }, [setActiveSubject]);

  if (isError) {
    return (
      <div className="section-gap">
        <DashboardHeader />
        <section className="glass-surface surface-pad">
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">We couldn&apos;t load dashboard data right now.</p>
            <Button className="accent-strong rounded-xl" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="section-gap">
      <DashboardHeader />

      {diaryIsLoading ? <NutritionHeroSkeleton /> : <NutritionHeroCard data={data} />}

      <QuickActionsRow actions={data.quickActions} />

      {activityIsLoading ? <ActivitySectionSkeleton /> : <ActivitySection activities={data.recentActivity} />}
    </div>
  );
}
