"use client";

import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Gauge,
  HeartPulse,
  Mountain,
  Repeat,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

type StrengthSummary = {
  sessions: number;
  avgSessionsPerWeek: number;
  latest1RM: number;
  oneRmChangePercent: number;
  relativeStrength: number | null;
  avgVolumePerSession: number;
  avgRestSeconds: number | null;
  workSetRatio: number;
};

type CardioSummary = {
  sessions: number;
  avgSessionsPerWeek: number;
  totalDistanceKm: number;
  avgPaceMinPerKm: number;
  paceImprovementPercent: number;
  avgHeartRate: number | null;
  weeklyDistanceKm: number;
  totalElevationM: number;
};

const formatPace = (pace: number) => {
  if (!Number.isFinite(pace) || pace <= 0) return "--";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
};

function InsightCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
}) {
  const Icon = icon;
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StrengthInsightsBoard({ summary }: { summary: StrengthSummary }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Strength Performance Summary</CardTitle>
          <Badge variant="secondary">{summary.sessions} sessions analyzed</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Estimated 1RM"
          value={`${summary.latest1RM.toFixed(0)} kg`}
          subtitle={`${summary.oneRmChangePercent >= 0 ? "+" : ""}${summary.oneRmChangePercent.toFixed(1)}% vs first session`}
          icon={TrendingUp}
        />
        <InsightCard
          title="Relative Strength"
          value={summary.relativeStrength ? `${summary.relativeStrength.toFixed(2)}x BW` : "--"}
          subtitle="1RM divided by latest bodyweight"
          icon={Gauge}
        />
        <InsightCard
          title="Workload Density"
          value={`${summary.avgVolumePerSession.toFixed(0)} kg`}
          subtitle="Average total volume per session"
          icon={BarChart3}
        />
        <InsightCard
          title="Set Quality"
          value={`${(summary.workSetRatio * 100).toFixed(0)}%`}
          subtitle={`Work sets vs warmup sets | Avg rest ${summary.avgRestSeconds ? `${summary.avgRestSeconds.toFixed(0)}s` : "--"}`}
          icon={Repeat}
        />
      </CardContent>
    </Card>
  );
}

export function CardioInsightsBoard({ summary }: { summary: CardioSummary }) {
  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Cardio Performance Summary</CardTitle>
          <Badge variant="secondary">{summary.sessions} sessions analyzed</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Average Pace"
          value={formatPace(summary.avgPaceMinPerKm)}
          subtitle={`${summary.paceImprovementPercent >= 0 ? "+" : ""}${summary.paceImprovementPercent.toFixed(1)}% pace change across range`}
          icon={Timer}
        />
        <InsightCard
          title="Heart Rate"
          value={summary.avgHeartRate ? `${summary.avgHeartRate.toFixed(0)} bpm` : "--"}
          subtitle="Average session HR"
          icon={HeartPulse}
        />
        <InsightCard
          title="Weekly Volume"
          value={`${summary.weeklyDistanceKm.toFixed(1)} km`}
          subtitle={`${summary.totalDistanceKm.toFixed(1)} km total distance`}
          icon={Zap}
        />
        <InsightCard
          title="Elevation"
          value={`${summary.totalElevationM.toFixed(0)} m`}
          subtitle={`${summary.avgSessionsPerWeek.toFixed(2)} sessions/week`}
          icon={Mountain}
        />
      </CardContent>
    </Card>
  );
}
