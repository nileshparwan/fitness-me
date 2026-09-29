"use client";

import { HeartPulse, MoonStar, Signal, Zap } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ComplianceRecoveryData } from "@/app/actions/progress-overview";

type Props = {
  data: ComplianceRecoveryData | undefined;
  isLoading: boolean;
};

function Card({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Signal }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#131b2f]/75 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function HealthRecoveryRow({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-[12px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Recovery Score" value={data?.recovery_score ? `${data.recovery_score}` : "—"} icon={Signal} />
      <Card label="Sleep Score" value={data?.sleep_score_avg ? `${data.sleep_score_avg}` : "—"} icon={MoonStar} />
      <Card label="HRV" value={data?.last_hrv_ms ? `${data.last_hrv_ms} ms` : "—"} icon={Zap} />
      <Card
        label="Resting HR"
        value={data?.rhr_series.at(-1)?.rhr_bpm ? `${data.rhr_series.at(-1)?.rhr_bpm} bpm` : "—"}
        icon={HeartPulse}
      />
    </div>
  );
}
