"use client";

import { Apple, CheckCircle2, Droplets, Moon, Plus, Timer, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ActivityRingMetric = {
  label: string;
  value: number;
  target: number;
  unit: string;
};

type MacroMetric = {
  label: string;
  consumed: number;
  target: number;
  unit: string;
};

type WorkoutRow = {
  date: string;
  session: string;
  duration: string;
  strain: string;
  status: "completed" | "planned";
};

const DEFAULT_ACTIVITY: ActivityRingMetric[] = [
  { label: "Move", value: 540, target: 700, unit: "kcal" },
  { label: "Train", value: 58, target: 75, unit: "min" },
  { label: "Readiness", value: 78, target: 100, unit: "%" },
];

const DEFAULT_MACROS: MacroMetric[] = [
  { label: "Protein", consumed: 124, target: 160, unit: "g" },
  { label: "Carbs", consumed: 188, target: 260, unit: "g" },
  { label: "Fat", consumed: 62, target: 70, unit: "g" },
];

const DEFAULT_WORKOUTS: WorkoutRow[] = [
  { date: "Today", session: "Lower Body Strength", duration: "58 min", strain: "High", status: "completed" },
  { date: "Tomorrow", session: "Tempo Run + Core", duration: "42 min", strain: "Moderate", status: "planned" },
  { date: "Fri", session: "Upper Body Hypertrophy", duration: "64 min", strain: "High", status: "planned" },
];

function CircularMetric({ metric }: { metric: ActivityRingMetric }) {
  const pct = Math.max(0, Math.min(100, (metric.value / Math.max(metric.target, 1)) * 100));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} strokeWidth="8" className="fill-none stroke-muted" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            strokeWidth="8"
            className="fill-none stroke-primary transition-all"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
          {Math.round(pct)}%
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">{metric.label}</p>
        <p className="text-xs text-muted-foreground">
          {metric.value} / {metric.target} {metric.unit}
        </p>
      </div>
    </div>
  );
}

function MacroProgress({ metric }: { metric: MacroMetric }) {
  const pct = Math.max(0, Math.min(100, (metric.consumed / Math.max(metric.target, 1)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{metric.label}</span>
        <span className="text-muted-foreground">
          {metric.consumed}/{metric.target} {metric.unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export type UserDashboardOverviewProps = {
  activity?: ActivityRingMetric[];
  macros?: MacroMetric[];
  workouts?: WorkoutRow[];
};

export function UserDashboardOverview({
  activity = DEFAULT_ACTIVITY,
  macros = DEFAULT_MACROS,
  workouts = DEFAULT_WORKOUTS,
}: UserDashboardOverviewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Apple className="h-4 w-4 text-primary" />
              Daily Activity Rings
            </CardTitle>
            <CardDescription>Inspired by best-in-class daily readiness and activity tracking.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {activity.map((metric) => (
              <CircularMetric key={metric.label} metric={metric} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
              Macro Intake
            </CardTitle>
            <CardDescription>Fuel tracking for training quality and recovery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {macros.map((macro) => (
              <MacroProgress key={macro.label} metric={macro} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4 text-primary" />
              Recovery Snapshot
            </CardTitle>
            <CardDescription>Live readiness markers for day planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-muted-foreground">Sleep Quality</span>
              <span className="font-semibold">82%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-muted-foreground">HRV Trend</span>
              <span className="font-semibold">Stable</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-muted-foreground">Hydration</span>
              <span className="font-semibold">2.1 L</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="border-border bg-card xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Training Timeline</CardTitle>
            <CardDescription>Planned and completed sessions with strain context.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workouts.map((row) => (
                  <TableRow key={`${row.date}-${row.session}`}>
                    <TableCell className="text-muted-foreground">{row.date}</TableCell>
                    <TableCell className="font-medium">{row.session}</TableCell>
                    <TableCell>{row.duration}</TableCell>
                    <TableCell>{row.strain}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "completed" ? "default" : "outline"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Log</CardTitle>
            <CardDescription>Capture critical daily data in under 30 seconds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bodyweight">Bodyweight (kg)</Label>
              <Input id="bodyweight" type="number" inputMode="decimal" placeholder="e.g. 72.4" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hydration">Water Intake (ml)</Label>
              <div className="relative">
                <Droplets className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="hydration" type="number" inputMode="numeric" className="pl-8" placeholder="e.g. 2200" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Readiness</Label>
              <Select defaultValue="steady">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharp">Sharp</SelectItem>
                  <SelectItem value="steady">Steady</SelectItem>
                  <SelectItem value="flat">Flat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="outline" className="w-full">
                <Timer className="mr-2 h-4 w-4" />
                Later
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-1 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Today&apos;s priority
              </div>
              Hit protein target and finish cooldown mobility for better next-day readiness.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

