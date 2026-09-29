"use client";

import { Dumbbell, Target, TrendingUp, Trophy } from "lucide-react";

import type { ProgressOverviewBundle } from "@/app/actions/progress-overview";
import { StrengthProgress } from "@/components/progress/StrengthProgress";
import { ExerciseMuscleMap } from "@/components/progress/strength/exercise-muscle-map";
import { StrengthTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type StrengthTabProps = {
  bundle: ProgressOverviewBundle | undefined;
  isLoading: boolean;
  compare: boolean;
};

function Tile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Dumbbell;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-white/10 bg-[#10182c]/85 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]">
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function StrengthTab({ bundle, isLoading, compare }: StrengthTabProps) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (isLoading && !bundle) {
    return <StrengthTabSkeleton />;
  }

  const volume = bundle?.summary
    ? `${((displayWeight(bundle.summary.volume_kg, system) ?? 0) / 1000).toFixed(1)}k ${labels.weight}`
    : "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Total Volume" value={volume} icon={Dumbbell} tone="text-[#5b9cff]" />
        <Tile label="Sessions" value={`${bundle?.summary.sessions ?? 0}`} icon={Target} tone="text-[#5ed28f]" />
        <Tile
          label="Avg RPE"
          value={bundle?.summary.avg_rpe !== null && bundle?.summary.avg_rpe !== undefined ? bundle.summary.avg_rpe.toFixed(1) : "—"}
          icon={TrendingUp}
          tone="text-[#efb241]"
        />
        <Tile
          label="PRs This Period"
          value={`${bundle?.strength.current.recent_prs.length ?? 0}`}
          icon={Trophy}
          tone="text-[#e65778]"
        />
      </div>

      <StrengthProgress
        data={bundle?.strength.current}
        compareData={bundle?.strength.compare}
        compare={compare}
        isLoading={isLoading}
        latestWeightKg={bundle?.summary.latest_weight ?? null}
      />

      <ExerciseMuscleMap
        exercises={bundle?.muscleActivation ?? []}
        posteriorMuscles={bundle?.posteriorMuscles}
        mapping={bundle?.muscleMapping}
      />
    </div>
  );
}

