// types/analytics.ts
export type TimeRange = "1M" | "6M" | "1Y" | "ALL";

export interface ExerciseMetric {
  date: string;
  weight: number;
  reps: number;
  oneRepMax: number; // Calculated: weight * (1 + reps/30)
  volume: number;    // weight * reps
}

export interface BodyPartBalance {
  part: string;
  score: number; // 0-100 normalized score
}

// Logic to simulate fetching from 'workout_logs' and 'exercise_progress'
export const calculateEst1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (36 / (37 - reps))); // Brzycki Formula
};