"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

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

export function HealthStepsCard({ data, isLoading, isActive = true }: Props) {
  const rows = useMemo(() => data?.steps_series || [], [data]);

  if (isLoading) return <Skeleton className="h-48 rounded-[16px] md:h-56 lg:h-64" />;

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h3 className="text-sm font-semibold text-foreground">Steps &amp; Activity</h3>
      <div className="mt-4 h-48 md:h-56 lg:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,156,187,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDate} stroke="#8692af" minTickGap={24} />
            <YAxis stroke="#8692af" width={44} />
            <ReferenceLine y={10000} stroke="#f6b84f" strokeDasharray="4 4" />
            <ChartTooltip />
            <Bar dataKey="steps" fill="#3fbf92" radius={[4, 4, 0, 0]} isAnimationActive={isActive} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
