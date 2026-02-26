"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CompactMetricCardProps = {
  title: string;
  value: number | string;
  isLoading?: boolean;
  subtitle?: string;
};

export function CompactMetricCard({ title, value, isLoading, subtitle }: CompactMetricCardProps) {
  return (
    <Card className="native-surface">
      <CardHeader className="px-2.5 pb-1 pt-2.5">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2.5 pb-2.5">
        {isLoading ? (
          <Skeleton className="h-5 w-16 rounded-md" />
        ) : (
          <>
            <p className="text-lg font-bold leading-none">{value}</p>
            {subtitle ? <p className="mt-1 text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
