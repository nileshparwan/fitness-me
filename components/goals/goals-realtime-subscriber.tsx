"use client";

import { useFitnessGoalsRealtimeSync } from "@/hooks/use-fitness-goals-realtime";

export function GoalsRealtimeSubscriber({ userId }: { userId: string | null }) {
  useFitnessGoalsRealtimeSync(userId);
  return null;
}
