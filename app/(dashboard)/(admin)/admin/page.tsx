"use client";

import Link from "next/link";
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
import { useAdminDashboardStats, useAdminUserStats } from "@/hooks/admin/use-admin";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading: loadingDashboard } = useAdminDashboardStats();
  const { data: users, isLoading: loadingUsers } = useAdminUserStats(90);

  const loading = loadingDashboard || loadingUsers;
  const throughputData: Array<{ date: string; actions: number }> = dashboard?.platform_throughput_30d || [];
  const joinRiskData: Array<{ date: string; joined: number; risk: number }> = users?.join_vs_risk_trend || [];

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
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughputData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="actions" stroke="#0f766e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Join vs Risk Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingUsers ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={joinRiskData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="joined" fill="#2563eb" name="Joined" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="risk" fill="#dc2626" name="At Risk" radius={[4, 4, 0, 0]} />
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
