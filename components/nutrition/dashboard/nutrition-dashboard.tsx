"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Drumstick, Flame, Plus, SlidersHorizontal, TrendingUp, Users, UtensilsCrossed, Wheat } from "lucide-react";

import {
  useNutritionDashboardData,
  useNutritionPrefetch,
} from "@/hooks/use-nutrition-data";
import {
  useSetNutritionNavigationSource,
  useSetNutritionViewMode,
} from "@/stores/use-nutrition-ui-store";
import { NutritionScopeControls } from "@/components/nutrition/nutrition-scope-controls";
import { NutritionDashboardSkeleton } from "@/components/nutrition/dashboard/nutrition-dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { Separator } from "@/components/ui/separator";
import type { NutritionDashboardActivity, NutritionDashboardMacro, NutritionDashboardQuickAction } from "@/lib/nutrition/dashboard";
import { cn } from "@/utils";

function CalorieRing({ consumed, target, compact = false }: { consumed: number; target: number; compact?: boolean }) {
  const safeTarget = Math.max(target, 1);
  const progress = Math.max(0, Math.min(100, Math.round((consumed / safeTarget) * 100)));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn(
        "glass-subtle relative mx-auto",
        compact ? "h-28 w-28 p-1.5 sm:h-32 sm:w-32" : "h-44 w-44 p-2.5 sm:h-48 sm:w-48 sm:p-3 lg:h-52 lg:w-52"
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
        <p className={cn("font-semibold leading-none", compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl")}>{consumed}</p>
        <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[10px] sm:text-xs" : "mt-1.5 text-xs sm:mt-2 sm:text-sm")}>
          / {target} kcal
        </p>
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

function MacroCard({ macro, compact = false }: { macro: NutritionDashboardMacro; compact?: boolean }) {
  const config = macroConfig(macro);
  const percent = Math.max(0, Math.min(100, macro.percent));

  return (
    <Card className="glass-subtle min-w-0 border-border/50">
      <CardContent className={cn(compact ? "space-y-2 p-2.5" : "space-y-3 p-3 sm:space-y-4 sm:p-4 lg:p-5")}>
        <div className="flex items-center gap-2">
          <config.Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", config.iconClass)} />
          <p className={cn("truncate text-muted-foreground", compact ? "text-[11px]" : "text-xs sm:text-sm")}>{macro.label}</p>
        </div>
        <p className={cn("truncate font-semibold leading-none", compact ? "text-2xl" : "text-2xl sm:text-3xl lg:text-4xl", config.valueClass)}>
          {macro.grams}
          <span className={cn("ml-0.5 text-muted-foreground", compact ? "text-base" : "text-base sm:text-lg lg:text-xl")}>g</span>
        </p>
        <div className="space-y-1.5">
          <div className={cn("overflow-hidden rounded-full bg-muted/80", compact ? "h-1.5" : "h-1.5")}>
            <div className={cn("h-full rounded-full transition-all", config.barClass)} style={{ width: `${percent}%` }} />
          </div>
          <p className={cn("text-right text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>{percent}%</p>
        </div>
      </CardContent>
    </Card>
  );
}

function quickActionConfig(action: NutritionDashboardQuickAction) {
  if (action.icon === "log") return { Icon: Plus };
  if (action.icon === "plans") return { Icon: CalendarDays };
  if (action.icon === "clients") return { Icon: Users };
  return { Icon: TrendingUp };
}

function QuickActionCard({ action }: { action: NutritionDashboardQuickAction }) {
  const { Icon } = quickActionConfig(action);
  const isPrimary = action.id === "log";

  return (
    <Button
      asChild
      variant="outline"
      className={cn(
        "h-24 w-full justify-center rounded-2xl text-base",
        isPrimary
          ? "accent-strong border-0 text-black hover:brightness-105"
          : "glass-subtle border-border/60 hover:bg-accent/35"
      )}
    >
      <Link href={action.href}>
        <span className="flex flex-col items-center gap-2">
          <Icon className={cn("h-5 w-5", isPrimary ? "text-black" : "text-chart-2")} />
          <span>{action.label}</span>
        </span>
      </Link>
    </Button>
  );
}

function activityIcon(type: NutritionDashboardActivity["type"]) {
  if (type === "assignment") return Users;
  if (type === "group") return CalendarDays;
  if (type === "progress") return TrendingUp;
  if (type === "client") return Users;
  return UtensilsCrossed;
}

function RecentActivityRow({
  activity,
  withSeparator,
}: {
  activity: NutritionDashboardActivity;
  withSeparator: boolean;
}) {
  const Icon = activityIcon(activity.type);

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
            <Icon className="h-4 w-4 text-chart-2" />
          </div>
          <p className="truncate text-sm sm:text-base">{activity.text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground sm:gap-1.5 sm:text-sm">
          <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="whitespace-nowrap">{activity.timeLabel}</span>
        </div>
      </div>
      {withSeparator ? <Separator className="bg-border/60" /> : null}
    </>
  );
}

export function NutritionDashboard() {
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const query = useNutritionDashboardData();
  const setViewMode = useSetNutritionViewMode();
  const setNavigationSource = useSetNutritionNavigationSource();

  useNutritionPrefetch();

  useEffect(() => {
    setViewMode("dashboard");
    setNavigationSource("dashboard");
  }, [setNavigationSource, setViewMode]);

  if (query.isLoading) {
    return <NutritionDashboardSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="glass-surface surface-pad">
        <div className="flex flex-col items-start gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Today&apos;s Nutrition</h1>
          <p className="text-sm text-muted-foreground">We couldn&apos;t load dashboard data right now.</p>
          <Button className="accent-strong rounded-xl" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const data = query.data;

  return (
    <div className="section-gap">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold tracking-tight">Nutrition Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.greetingSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="glass-subtle h-14 w-14 shrink-0 rounded-2xl border-border/60"
              onClick={() => setScopeDialogOpen(true)}
            >
              <SlidersHorizontal className="h-5 w-5 text-chart-2" />
              <span className="sr-only">Select user and meal group</span>
            </Button>
            <Button size="icon" className="accent-strong h-14 w-14 shrink-0 rounded-2xl text-black">
              <Plus className="h-6 w-6" />
              <span className="sr-only">Quick add</span>
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-surface surface-pad">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Nutrition</h2>
            <p className="text-sm text-muted-foreground">{data.dateLabel}</p>
          </div>

          <div className="grid gap-3 md:hidden">
            <div className="grid grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] items-center gap-2">
              <CalorieRing consumed={data.consumedCalories} target={data.targetCalories} compact />
              {data.macros.map((macro) => (
                <MacroCard key={macro.key} macro={macro} compact />
              ))}
            </div>
          </div>

          <div className="hidden gap-3 md:grid xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:items-stretch">
            <div className="xl:self-center">
              <CalorieRing consumed={data.consumedCalories} target={data.targetCalories} />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              {data.macros.map((macro) => (
                <MacroCard key={macro.key} macro={macro} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.quickActions.map((action) => (
            <QuickActionCard key={action.id} action={action} />
          ))}
        </div>
      </section>

      <section className="glass-surface surface-pad">
        <h2 className="mb-2 text-xl font-semibold tracking-tight">Recent Activity</h2>
        <div className="rounded-2xl border border-border/60 bg-card/60 px-4">
          {data.recentActivity.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No recent nutrition activity yet.</p>
          ) : (
            data.recentActivity.map((activity, index) => (
              <RecentActivityRow
                key={activity.id}
                activity={activity}
                withSeparator={index < data.recentActivity.length - 1}
              />
            ))
          )}
        </div>
      </section>

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="rounded-2xl border-border/70 bg-card/95 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>User & Meal Group</DialogTitle>
            <DialogDescription>Select the user and meal group context for nutrition pages.</DialogDescription>
          </DialogHeader>
          <NutritionScopeControls showHelperText fullWidthOnMobile />
        </DialogContent>
      </Dialog>
    </div>
  );
}
