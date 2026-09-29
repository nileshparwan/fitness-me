"use client";

import type { ComplianceRecoveryData } from "@/app/actions/progress-overview";
import { ComplianceRecoveryCard } from "@/components/progress/overview/compliance-recovery-card";
import { WorkoutCalendarCard } from "@/components/progress/overview/workout-calendar-card";

type ComplianceSectionProps = {
  data: ComplianceRecoveryData | undefined;
  compareData?: ComplianceRecoveryData | null;
  compare: boolean;
  isLoading: boolean;
};

export function ComplianceSection({
  data,
  compareData,
  compare,
  isLoading,
}: ComplianceSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <ComplianceRecoveryCard
        data={data}
        compareData={compareData ?? undefined}
        compare={compare}
        isLoading={isLoading}
      />
      <WorkoutCalendarCard rows={data?.workout_calendar ?? []} isLoading={isLoading} />
    </div>
  );
}

