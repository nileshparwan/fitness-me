"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search } from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompactMetricCard } from "@/components/admin/compact-metric-card";
import { useAdminUsers, useAdminUserStats, useUpdateAdminUserRole } from "@/hooks/admin/use-admin";
import { useDebounce } from "@/hooks/use-debounce";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useAdminUsers(debouncedSearch, 400);
  const { data: userStats, isLoading: loadingStats } = useAdminUserStats(90);
  const { mutate: mutateRole, isPending } = useUpdateAdminUserRole();

  const trendData = useMemo(() => {
    const joinedMap = new Map((userStats?.join_trend || []).map((item) => [item.date, item.count]));
    const riskMap = new Map((userStats?.leave_risk_trend || []).map((item) => [item.date, item.count]));
    const dates = Array.from(new Set([...joinedMap.keys(), ...riskMap.keys()])).sort((a, b) => a.localeCompare(b));

    return dates.slice(-30).map((date) => ({
      date: date.slice(5),
      joined: joinedMap.get(date) || 0,
      risk: riskMap.get(date) || 0,
    }));
  }, [userStats?.join_trend, userStats?.leave_risk_trend]);

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">User Intelligence</h2>
          <p className="text-sm text-muted-foreground">Role governance, retention signals, and lifecycle trends.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user id, email, or role..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <CompactMetricCard title="Total Users" value={userStats?.total_users ?? 0} isLoading={loadingStats} />
        <CompactMetricCard title="Admins" value={userStats?.total_admins ?? 0} isLoading={loadingStats} />
        <CompactMetricCard title="Active 30d" value={userStats?.active_last_30_days ?? 0} isLoading={loadingStats} />
        <CompactMetricCard title="At Risk 30d" value={userStats?.likely_leaving_30_days ?? 0} isLoading={loadingStats} />
        <CompactMetricCard title="Likely Left 90d" value={userStats?.likely_left_90_days ?? 0} isLoading={loadingStats} />
        <CompactMetricCard title="Joined 90d" value={userStats?.joined_in_window ?? 0} isLoading={loadingStats} />
      </section>

      <Card className="native-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Join vs Leave-Risk Trend (90 days)</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          {loadingStats ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="joined" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="risk" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="native-surface surface-pad">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Meal Plans</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>
                    <p className="max-w-[220px] truncate font-medium">{row.email || "No email"}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted-foreground">{row.user_id}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.role}
                      disabled={isPending}
                      onValueChange={(value) => mutateRole({ userId: row.user_id, role: value as "admin" | "user" })}
                    >
                      <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{row.sessions_count}</TableCell>
                  <TableCell>{row.meal_plans_count}</TableCell>
                  <TableCell>{row.goals_count}</TableCell>
                  <TableCell>
                    {row.last_activity
                      ? `${formatDistanceToNow(new Date(row.last_activity), { addSuffix: true })}`
                      : "No activity"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/users/${row.user_id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View Detail
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {(data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No users matched your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
