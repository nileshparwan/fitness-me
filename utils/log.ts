import { Database } from "@/types/database";

type WorkoutLog = Database["public"]["Tables"]["strength_sets"]["Row"];

type GroupedExerciseLogs = {
  exercise_id: string | null;
  group_id: string | null;
  name: string;
  sets: WorkoutLog[];
};

export function groupLogsByExercise(logs: WorkoutLog[] | null | undefined): GroupedExerciseLogs[] {
  if (!logs?.length) return [];

  const groups = new Map<string, GroupedExerciseLogs>();

  for (const log of logs) {
    const key = log.exercise_name;
    const existing = groups.get(key);

    if (existing) {
      existing.sets.push(log);
      continue;
    }

    groups.set(key, {
      exercise_id: log.exercise_id,
      group_id: log.group_id,
      name: key,
      sets: [log],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    sets: group.sets.sort((a, b) => a.set_number - b.set_number),
  }));
}
