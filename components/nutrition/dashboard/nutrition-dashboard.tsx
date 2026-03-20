"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Clock3, Drumstick, Flame, Layers, Plus, TrendingUp, Users, UtensilsCrossed, Wheat } from "lucide-react";

import { ActivitySectionSkeleton, NutritionHeroSkeleton } from "@/components/nutrition/dashboard/nutrition-dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useNutritionDashboardData, useNutritionPrefetch } from "@/hooks/use-nutrition-data";
import { getGreeting, getTodayLabel } from "@/lib/nutrition/greeting";
import type { NutritionDashboardActivity, NutritionDashboardData, NutritionDashboardMacro, NutritionDashboardQuickAction } from "@/lib/nutrition/dashboard";
import { cn } from "@/utils";

function DashboardHeader() {
  return (
    <section className="space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
      <p className="text-sm text-muted-foreground">{getTodayLabel()}</p>
    </section>
  );
}

function CalorieRing({ consumed, target, compact = false }: { consumed: number; target: number; compact?: boolean }) {
  const safeTarget = Math.max(target, 1);
  const progress = Math.max(0, Math.min(100, Math.round((consumed / safeTarget) * 100)));
  const remaining = Math.max(0, safeTarget - consumed);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn(
        "glass-subtle relative mx-auto",
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
          className="text-chart-2"
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: dashOffset,
            filter: "drop-shadow(0 0 12px color-mix(in srgb, var(--chart-2) 45%, transparent))",
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className={cn("font-semibold leading-none tabular-nums", compact ? "text-3xl" : "text-4xl")}>{remaining}</p>
        <p className={cn("text-muted-foreground", compact ? "mt-1 text-xs" : "mt-1.5 text-sm")}>kcal left</p>
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
  const percent = Math.max(0, Math.min(100, macro.percent));

  return (
    <div className="flex items-center gap-3">
      <config.Icon className={cn("h-4 w-4 shrink-0", config.iconClass)} />
      <p className="w-14 shrink-0 text-sm text-muted-foreground">{macro.label}</p>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
          <div className={cn("h-full rounded-full transition-all", config.barClass)} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <p className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        <span className={cn("font-medium", config.valueClass)}>{macro.grams}g</span>
        <span className="text-muted-foreground/60"> / {macro.targetGrams}g</span>
      </p>
    </div>
  );
}

function CalorieStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="glass-subtle flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-3">
      <p className={cn("text-lg font-semibold tabular-nums leading-none", valueClass ?? "text-foreground")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function NutritionHeroCard({ data }: { data: NutritionDashboardData }) {
  const remaining = Math.max(0, data.targetCalories - data.consumedCalories);
  const remainingClass =
    remaining > data.targetCalories * 0.2 ? "text-chart-3" : remaining > 0 ? "text-chart-4" : "text-destructive";

  return (
    <section className="glass-surface surface-pad space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Nutrition</h2>
        {data.activePlanName ? (
          <span className="rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
            {data.activePlanName}
          </span>
        ) : null}
      </div>

      <div className="hidden gap-6 md:flex md:items-center">
        <CalorieRing consumed={data.consumedCalories} target={data.targetCalories} />
        <div className="flex flex-1 flex-col gap-4">
          {data.macros.map((macro) => (
            <MacroRow key={macro.key} macro={macro} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 md:hidden">
        <CalorieRing consumed={data.consumedCalories} target={data.targetCalories} compact />
        <div className="w-full space-y-3">
          {data.macros.map((macro) => (
            <MacroRow key={macro.key} macro={macro} />
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <CalorieStat label="Consumed" value={data.consumedCalories} valueClass="text-chart-2" />
        <CalorieStat label="Target" value={data.targetCalories} />
        <CalorieStat label="Remaining" value={remaining} valueClass={remainingClass} />
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
      <div className="rounded-2xl border border-border/60 bg-card/60 px-4">
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
  useNutritionPrefetch();

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
