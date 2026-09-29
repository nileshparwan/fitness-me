"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import type { ComplianceRecoveryData } from "@/app/actions/progress-overview";

type Props = {
  data: ComplianceRecoveryData | undefined;
  isLoading: boolean;
  isActive?: boolean;
};

function formatDate(value: string) {
  return value.slice(5);
}

export function HealthSleepCard({ data, isLoading, isActive = true }: Props) {
  const rows = useMemo(() => data?.sleep_series || [], [data]);

  if (isLoading) return <Skeleton className="h-48 rounded-[16px] md:h-56 lg:h-64" />;

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h3 className="text-sm font-semibold text-foreground">Sleep Detail</h3>
      <div className="mt-4 h-48 md:h-56 lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={24} />
            <YAxis yAxisId="left" stroke="#8692af" width={36} />
            <YAxis yAxisId="right" orientation="right" stroke="#8692af" width={36} />
            <ChartTooltip />
            <Bar yAxisId="left" dataKey="sleep_hours" fill="#5b9cff" radius={[4, 4, 0, 0]} isAnimationActive={isActive} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sleep_score"
              stroke="#f6b84f"
              strokeWidth={2}
              isAnimationActive={isActive}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
