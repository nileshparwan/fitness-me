"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, ChevronRight } from "lucide-react";

import { getLatestCycleAction } from "@/app/actions/menstrual-cycles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCyclePhase, getDaysUntilNextPeriod } from "@/utils/cycle-phase";

type CycleSummary = {
  phase: string;
  day: number;
  tip: string;
  daysUntilNextPeriod: number;
};

export function CyclePhaseWidget() {
  const latestCycleQuery = useQuery({
    queryKey: ["latest-cycle"],
    queryFn: () => getLatestCycleAction(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const summary = useMemo<CycleSummary | null>(() => {
    const cycle = latestCycleQuery.data?.cycle;
    if (!cycle) return null;

    const cycleLength = cycle.cycle_length_days || 28;
    const phase = getCyclePhase(cycle.period_start_date, cycleLength);

    return {
      phase: phase.phase,
      day: phase.day,
      tip: phase.tip,
      daysUntilNextPeriod: getDaysUntilNextPeriod(cycle.period_start_date, cycleLength),
    };
  }, [latestCycleQuery.data?.cycle]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarHeart className="h-4 w-4 text-primary" />
          Cycle Phase
        </CardTitle>
        <CardDescription>Personalized training context based on your latest cycle log.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? (
          <>
            <div className="flex items-center justify-between">
              <Badge className="capitalize">{summary.phase}</Badge>
              <span className="text-xs text-muted-foreground">Day {summary.day}</span>
            </div>
            <p className="text-sm text-foreground">{summary.tip}</p>
            <p className="text-xs text-muted-foreground">
              {summary.daysUntilNextPeriod} day{summary.daysUntilNextPeriod === 1 ? "" : "s"} until next period
            </p>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-4">
            <p className="text-sm font-medium text-foreground">Log your first cycle to see phase insights</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use cycle history to add phase context for training and nutrition decisions.
            </p>
          </div>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/health/cycle">
            View Cycle
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
