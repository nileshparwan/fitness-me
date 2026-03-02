"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompactMetricCard } from "@/components/admin/compact-metric-card";
import { useAdminDashboardStats, useAdminNutritionStats, useAdminTrainingStats, useAdminUserStats } from "@/hooks/admin/use-admin";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading: loadingDashboard } = useAdminDashboardStats();
  const { data: training, isLoading: loadingTraining } = useAdminTrainingStats(30);
  const { data: nutrition, isLoading: loadingNutrition } = useAdminNutritionStats(30);
  const { data: users, isLoading: loadingUsers } = useAdminUserStats(90);

  const loading = loadingDashboard || loadingTraining || loadingNutrition || loadingUsers;
  const joinTrend: Array<{ date: string; count: number }> = users?.join_trend || [];

  const combinedTrend = useMemo(() => {
    const dailySessions: Array<{ date: string; count: number }> = training?.daily_sessions || [];
    const dailyPlans: Array<{ date: string; count: number }> = nutrition?.daily_plans || [];
    const sessionMap = new Map(dailySessions.map((item) => [item.date, item.count]));
    const planMap = new Map(dailyPlans.map((item) => [item.date, item.count]));

    const dateKeys = Array.from(new Set([...sessionMap.keys(), ...planMap.keys()])).sort((a, b) => a.localeCompare(b));
    return dateKeys.map((date) => ({
      date: date.slice(5),
      sessions: sessionMap.get(date) || 0,
      plans: planMap.get(date) || 0,
    }));
  }, [training?.daily_sessions, nutrition?.daily_plans]);

  return (
    <div className="section-gap">
      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <CompactMetricCard
          title="Users Logged In"
          value={dashboard?.currently_logged_in_users ?? 0}
          isLoading={loadingDashboard}
          subtitle="Last 30 min"
        />
        <CompactMetricCard
          title="Admins Logged In"
          value={dashboard?.currently_logged_in_admins ?? 0}
          isLoading={loadingDashboard}
          subtitle="Last 30 min"
        />
        <CompactMetricCard title="Sessions" value={dashboard?.total_sessions ?? 0} isLoading={loadingDashboard} />
        <CompactMetricCard title="Strength Sets" value={dashboard?.total_strength_sets ?? 0} isLoading={loadingDashboard} />
        <CompactMetricCard title="Meal Plans" value={dashboard?.total_meal_plans ?? 0} isLoading={loadingDashboard} />
        <CompactMetricCard title="Events (7d)" value={dashboard?.recent_events ?? 0} isLoading={loadingDashboard} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="native-surface xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">30-Day Platform Throughput</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#0f766e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="plans" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Join vs Risk Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            {loadingUsers ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={joinTrend.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" name="Joined" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users" className="native-surface p-3 transition-colors hover:bg-accent">
          <p className="text-sm font-semibold">User Intelligence</p>
          <p className="text-xs text-muted-foreground">Role management, churn indicators, and activity patterns.</p>
        </Link>
        <Link href="/admin/training" className="native-surface p-3 transition-colors hover:bg-accent">
          <p className="text-sm font-semibold">Training Intelligence</p>
          <p className="text-xs text-muted-foreground">Session volume, exercise concentration, and utilization patterns.</p>
        </Link>
        <Link href="/admin/nutrition" className="native-surface p-3 transition-colors hover:bg-accent">
          <p className="text-sm font-semibold">Nutrition Intelligence</p>
          <p className="text-xs text-muted-foreground">Plan compliance signals and macro distribution quality.</p>
        </Link>
        <Link href="/admin/settings" className="native-surface p-3 transition-colors hover:bg-accent">
          <p className="text-sm font-semibold">Configuration Center</p>
          <p className="text-xs text-muted-foreground">Security posture, feature flags, and release readiness checks.</p>
        </Link>
      </section>
    </div>
  );
}
