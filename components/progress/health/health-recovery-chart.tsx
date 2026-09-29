"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

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

export function HealthRecoveryChart({ data, isLoading, isActive = true }: Props) {
  const rows = useMemo(
    () =>
      (data?.readiness_series || []).map((row) => ({
        date: row.date,
        recovery_score: row.recovery_score,
        hrv_ms: row.hrv_ms,
      })),
    [data]
  );

  if (isLoading) return <Skeleton className="h-48 rounded-[16px] md:h-56 lg:h-64" />;

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h3 className="text-sm font-semibold text-foreground">Recovery Trend</h3>
      <div className="mt-4 h-48 md:h-56 lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={24} />
            <YAxis stroke="#8692af" width={40} />
            <ChartTooltip />
            <Area type="monotone" dataKey="recovery_score" stroke="#3fbf92" fill="#3fbf9233" isAnimationActive={isActive} />
            <Area type="monotone" dataKey="hrv_ms" stroke="#8b7cff" fill="#8b7cff22" isAnimationActive={isActive} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
