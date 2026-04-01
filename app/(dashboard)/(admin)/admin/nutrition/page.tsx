"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompactMetricCard } from "@/components/admin/compact-metric-card";
import { useAdminNutritionStats } from "@/hooks/admin/use-admin";

const dayOptions = ["7", "14", "30", "60", "90"] as const;

export default function AdminNutritionPage() {
  const [days, setDays] = useState<(typeof dayOptions)[number]>("30");
  const { data, isLoading } = useAdminNutritionStats(Number(days));
  const dailyPlans: Array<{ date: string; plans: number }> = data?.daily_plans || [];
  const mealTypeBreakdown: Array<{ meal_type: string; count: number }> = data?.meal_type_breakdown || [];
  const mealTypeMix: Array<{ name: string; value: number; fill: string }> = data?.meal_type_mix || [];
  const statusBreakdown: Array<{ label: string; count: number }> = data?.status_breakdown || [];
  const velocityData = dailyPlans;

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Nutrition Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Platform-wide nutrition plan quality, macro balance, and publishing velocity.
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

      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <CompactMetricCard title="Plans" value={data?.total_meal_groups ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Active" value={data?.active_meal_groups ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Meals" value={data?.total_meals ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Athletes" value={data?.unique_athletes ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Kcal/Meal" value={data?.avg_calories_per_meal ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Protein g" value={data?.avg_protein_g_per_meal ?? 0} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="native-surface xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Creation Velocity</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="plans" stroke="#0891b2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meal Type Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={mealTypeMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {mealTypeMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusBreakdown.map((status) => (
              <div key={status.label} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <p className="text-sm font-medium capitalize">{status.label}</p>
                <p className="text-sm text-muted-foreground">{status.count}</p>
              </div>
            ))}
            {!isLoading && statusBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground">No status data available for this window.</p>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Meal Types</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meal Type</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mealTypeBreakdown.slice(0, 10).map((mealType) => (
                  <TableRow key={mealType.meal_type}>
                    <TableCell className="font-medium capitalize">{mealType.meal_type}</TableCell>
                    <TableCell>{mealType.count}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && mealTypeBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                      No meal type aggregate data.
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
