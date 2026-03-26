"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompactMetricCard } from "@/components/admin/compact-metric-card";
import { useAdminTrainingStats } from "@/hooks/admin/use-admin";

const dayOptions = ["7", "14", "30", "60", "90"] as const;

export default function AdminTrainingPage() {
  const [days, setDays] = useState<(typeof dayOptions)[number]>("30");
  const { data, isLoading } = useAdminTrainingStats(Number(days));

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Training Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Data-centric training insights for load, quality, and engagement across the platform.
          </p>
        </div>

        <Select value={days} onValueChange={(value) => setDays(value as (typeof dayOptions)[number])}>
          <SelectTrigger className="w-full md:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dayOptions.map((value) => (
              <SelectItem key={value} value={value}>
                Last {value} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <CompactMetricCard title="Sessions" value={data?.total_sessions ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Sets" value={data?.total_strength_sets ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Cardio" value={data?.total_cardio_sessions ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Athletes" value={data?.unique_athletes ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Avg Min" value={data?.avg_session_duration_minutes ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Sets/Session" value={data?.avg_sets_per_session ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Reps/Set" value={data?.avg_reps_per_set ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Volume" value={data?.total_volume_kg ?? 0} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="native-surface xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Session Velocity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.daily_sessions || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sessions by Weekday</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.sessions_by_weekday || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.status_breakdown || []).map((status) => (
              <div key={status.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <p className="text-sm font-medium capitalize">{status.label}</p>
                <p className="text-sm text-muted-foreground">{status.count}</p>
              </div>
            ))}
            {!isLoading && (data?.status_breakdown.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground">No status data available for this window.</p>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.top_exercises || []).map((exercise) => (
                  <TableRow key={exercise.exercise_name}>
                    <TableCell className="max-w-[220px] truncate font-medium">{exercise.exercise_name}</TableCell>
                    <TableCell>{exercise.sets}</TableCell>
                    <TableCell>{exercise.total_volume_kg.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.top_exercises.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No exercise aggregate data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
