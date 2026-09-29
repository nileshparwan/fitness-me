import type { IExerciseData, Muscle } from "react-body-highlighter";

export type MuscleMapping = Record<string, string[]>;

export type ExerciseActivationInput = {
  name: string;
  muscles: string[];
  frequency?: number;
};

export const MUSCLE_GROUP_MAP: Record<string, Muscle[]> = {
  abs: ["abs"],
  abductors: ["abductors"],
  adductor: ["adductor"],
  adductors: ["adductor"],
  back: ["upper-back", "lower-back", "trapezius"],
  "back deltoids": ["back-deltoids"],
  back_deltoids: ["back-deltoids"],
  biceps: ["biceps"],
  calf: ["calves"],
  calves: ["calves"],
  chest: ["chest"],
  core: ["abs", "obliques"],
  deltoids: ["front-deltoids"],
  delts: ["front-deltoids", "back-deltoids"],
  forearm: ["forearm"],
  forearms: ["forearm"],
  "front deltoids": ["front-deltoids"],
  front_deltoids: ["front-deltoids"],
  glute: ["gluteal"],
  gluteal: ["gluteal"],
  glutes: ["gluteal"],
  hamstring: ["hamstring"],
  hamstrings: ["hamstring"],
  hips: ["abductors", "adductor", "gluteal"],
  lats: ["upper-back"],
  legs: ["quadriceps", "hamstring", "gluteal", "calves"],
  "lower back": ["lower-back"],
  lower_back: ["lower-back"],
  "mid back": ["upper-back"],
  mid_back: ["upper-back"],
  neck: ["neck"],
  obliques: ["obliques"],
  "posterior chain": ["hamstring", "gluteal", "lower-back", "calves"],
  posterior_chain: ["hamstring", "gluteal", "lower-back", "calves"],
  pull: ["upper-back", "biceps", "back-deltoids", "trapezius", "forearm"],
  push: ["chest", "triceps", "front-deltoids"],
  quads: ["quadriceps"],
  quadriceps: ["quadriceps"],
  "rear deltoids": ["back-deltoids"],
  rear_delts: ["back-deltoids"],
  shoulders: ["front-deltoids", "back-deltoids"],
  traps: ["trapezius"],
  trapezius: ["trapezius"],
  triceps: ["triceps"],
  "upper back": ["upper-back", "trapezius"],
  upper_back: ["upper-back", "trapezius"],
};

export const BODY_HIGHLIGHT_COLORS = [
  "hsl(var(--primary) / 0.45)",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--chart-1))",
];

export const BODY_COLOR_REST = "hsl(var(--muted) / 0.45)";

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function uniqueMuscles(muscles: Muscle[]) {
  return Array.from(new Set(muscles));
}

export function toBodyHighlighterMuscle(raw: string, mapping?: MuscleMapping): Muscle[] {
  if (mapping) {
    const fromMap = mapping[raw.toLowerCase()] || mapping[normalizeToken(raw)];
    if (fromMap) return fromMap as Muscle[];
  }
  const normalized = normalizeToken(raw).replace(/_/g, " ");
  return MUSCLE_GROUP_MAP[normalized] ?? MUSCLE_GROUP_MAP[normalizeToken(raw)] ?? [];
}

export function mapMuscleGroupsToBodyMapMuscles(values: string[] | null | undefined, mapping?: MuscleMapping): Muscle[] {
  const resolved: Muscle[] = [];
  for (const rawValue of values || []) {
    if (!rawValue) continue;
    resolved.push(...toBodyHighlighterMuscle(rawValue, mapping));
  }
  return uniqueMuscles(resolved);
}

export function buildExerciseData(values: ExerciseActivationInput[], mapping?: MuscleMapping): IExerciseData[] {
  return values.reduce<IExerciseData[]>((accumulator, entry) => {
    const muscles = mapMuscleGroupsToBodyMapMuscles(entry.muscles, mapping);
    if (muscles.length === 0) return accumulator;
    accumulator.push({
      name: entry.name,
      muscles,
      frequency: Math.max(1, Math.round(entry.frequency ?? 1)),
    });
    return accumulator;
  }, []);
}
