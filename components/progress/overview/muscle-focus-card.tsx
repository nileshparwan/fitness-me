"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayWeight } from "@/utils/unit-conversion";

type RadarDatum = {
  muscle: string;
  score: number;
};

type FocusDistributionRow = {
  focus: "push" | "pull" | "legs" | "core";
  score: number;
  pct: number;
};

type MuscleVolumeRow = {
  muscle_group: string;
  volume_kg: number;
  pct: number;
};

type Props = {
  focusDistribution: FocusDistributionRow[];
  muscleVolume: MuscleVolumeRow[];
  isLoading: boolean;
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function MuscleFocusCard({ focusDistribution, muscleVolume, isLoading }: Props) {
  const system = useUnitSystem();
  const labels = useUnitLabels();

  if (isLoading) {
    return <Skeleton className="h-[380px] rounded-[16px]" />;
  }

  const focusRows = focusDistribution;
  const radarRows: RadarDatum[] = focusRows.map((row) => ({
    muscle: titleCase(row.focus),
    score: row.pct,
  }));
  const hasFocusData = focusRows.some((row) => row.pct > 0);
  const hasMuscleData = muscleVolume.length > 0;

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <h2 className="text-xl font-semibold">Muscle Focus</h2>

      {!hasFocusData && !hasMuscleData ? (
        <div className="mt-4 rounded-[12px] border border-white/10 bg-[#121b2f]/45 px-4 py-10 text-center text-sm text-muted-foreground">
          Log strength workouts to see muscle distribution.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-[250px] w-full rounded-[12px] border border-white/10 bg-[#111a2f]/65 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarRows} outerRadius="70%">
                <PolarGrid stroke="rgba(140,156,187,0.35)" />
                <PolarAngleAxis dataKey="muscle" stroke="#9ba6c1" tick={{ fontSize: 12 }} />
                <Radar
                  dataKey="score"
                  stroke="#5b9cff"
                  fill="#5b9cff"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 rounded-[12px] border border-white/10 bg-[#111a2f]/65 p-3">
            {!hasFocusData ? (
              <p className="text-xs text-amber-300">
                Add a muscle focus tag (<code>push</code>, <code>pull</code>, <code>legs</code>, <code>core</code>) to
                exercises to populate focus split.
              </p>
            ) : null}
            <p className="text-sm font-medium">Focus split this period</p>
            {focusRows.map((row) => (
              <div key={row.focus}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{titleCase(row.focus)}</span>
                  <span>{row.pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#1f2a44]">
                  <div
                    className="h-full rounded-full bg-[#5b9cff]"
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Top muscles</p>
            </div>
            {muscleVolume.slice(0, 6).map((row) => (
              <div key={row.muscle_group}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{row.muscle_group.replace(/_/g, " ")}</span>
                  <span>{displayWeight(row.volume_kg, system)?.toLocaleString()} {labels.weight} · {row.pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#1f2a44]">
                  <div
                    className="h-full rounded-full bg-[#5b9cff]"
                    style={{ width: `${Math.min(100, row.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
