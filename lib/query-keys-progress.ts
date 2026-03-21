export const progressKeys = {
  all: ["progress"] as const,
  availableExercises: () => [...progressKeys.all, "available_exercises"] as const,
  exerciseMetrics: (exerciseName: string, range: string) =>
    [...progressKeys.all, "exercise_metrics", { exercise_name: exerciseName, range }] as const,
  userProfile: () => [...progressKeys.all, "user_profile"] as const,
  muscleBalance: () => [...progressKeys.all, "muscle_balance"] as const,
  exerciseDetails: (exerciseName: string) =>
    [...progressKeys.all, "exercise_details", exerciseName] as const,
  nutrition: (params: { range: number; subjectKey: string }) =>
    [...progressKeys.all, "nutrition", params] as const,
};
