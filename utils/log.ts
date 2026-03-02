import { Database } from "@/types/database";

type WorkoutLog = Database["public"]["Tables"]["strength_sets"]["Row"];

type GroupedExerciseLogs = {
  exercise_id: string | null;
  group_id: string | null;
  name: string;
  entry_sequence: number | null;
  sets: WorkoutLog[];
};

export function groupLogsByExercise(logs: WorkoutLog[] | null | undefined): GroupedExerciseLogs[] {
  if (!logs?.length) return [];

  const groups = new Map<string, GroupedExerciseLogs>();

  for (const log of logs) {
    const key = `${log.entry_sequence ?? "na"}:${log.exercise_name}`;
    const existing = groups.get(key);

    if (existing) {
      existing.sets.push(log);
      continue;
    }

    groups.set(key, {
      exercise_id: log.exercise_id,
      group_id: log.group_id,
      name: key,
      entry_sequence: log.entry_sequence,
      sets: [log],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      name: group.sets[0]?.exercise_name || group.name,
      sets: group.sets.sort((a, b) => a.set_number - b.set_number),
    }))
    .sort((a, b) => {
      if (a.entry_sequence === null && b.entry_sequence === null) return 0;
      if (a.entry_sequence === null) return 1;
      if (b.entry_sequence === null) return -1;
      return a.entry_sequence - b.entry_sequence;
    });
}
