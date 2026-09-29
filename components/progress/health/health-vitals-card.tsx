"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

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

export function HealthVitalsCard({ data, isLoading, isActive = true }: Props) {
  const rows = useMemo(
    () =>
      (data?.stress_series || []).map((row) => ({
        date: row.date,
        stress_level: row.stress_level,
        rhr_bpm: data?.rhr_series.find((entry) => entry.date === row.date)?.rhr_bpm ?? null,
      })),
    [data]
  );

  if (isLoading) return <Skeleton className="h-48 rounded-[16px] md:h-56 lg:h-64" />;

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h3 className="text-sm font-semibold text-foreground">Vitals</h3>
      <div className="mt-4 h-48 md:h-56 lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={24} />
            <YAxis yAxisId="left" stroke="#8692af" width={36} />
            <YAxis yAxisId="right" orientation="right" stroke="#8692af" width={36} />
            <ChartTooltip />
            <Line yAxisId="left" dataKey="rhr_bpm" type="monotone" stroke="#ef5f7a" strokeWidth={2} isAnimationActive={isActive} />
            <Line yAxisId="right" dataKey="stress_level" type="monotone" stroke="#8b7cff" strokeWidth={2} isAnimationActive={isActive} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
