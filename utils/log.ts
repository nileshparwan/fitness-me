// lib/utils.ts
export function groupLogsByExercise(logs: any[]) {
    if (!logs) return [];

    const groups: Record<string, any> = {};

    logs.forEach((log) => {
        // Use exercise name as key (or composite key with ID if needed)
        const key = log.exercise_name;

        if (!groups[key]) {
            groups[key] = {
                exercise_id: log.exercise_id,
                name: log.exercise_name,
                sets: []
            };
        }

        groups[key].sets.push(log);
    });

    // Convert object back to array and sort sets by number
    return Object.values(groups).map((group: any) => ({
        ...group,
        sets: group.sets.sort((a: any, b: any) => a.set_number - b.set_number)
    }));
}