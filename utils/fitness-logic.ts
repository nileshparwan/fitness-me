import { Database } from "@/types/database";
import { differenceInYears } from "date-fns";

type CardioLog = Database["public"]["Tables"]["cardio_sessions"]["Row"];

export const calculatePaceMinutesPerKm = (distanceKm: number, durationMinutes: number) => {
  if (distanceKm <= 0 || durationMinutes <= 0) return 0;
  return durationMinutes / distanceKm;
};

export const formatPace = (paceMinutes: number) => {
  if (!Number.isFinite(paceMinutes) || paceMinutes <= 0) return "0:00";
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  const safeSecs = secs === 60 ? 59 : secs;
  return `${mins}:${safeSecs.toString().padStart(2, "0")}`;
};

export const estimateOneRepMax = (weight: number, reps: number) => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps > 20) return weight;
  if (reps > 10) return Math.round(weight * (1 + reps / 30)); // Epley
  return Math.round(weight * (36 / (37 - reps))); // Brzycki
};

export const calculateCardioInsights = (logs: CardioLog[], birthDate?: string | null) => {
  if (logs.length < 2) return null;

  const latest = logs[0];
  const previous = logs[1];

  const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30;
  const maxHR = 220 - age;

  const latestPace = calculatePaceMinutesPerKm(latest.distance_km || 0, latest.duration_minutes || 0);
  const previousPace = calculatePaceMinutesPerKm(previous.distance_km || 0, previous.duration_minutes || 0);
  const paceDiff = previousPace - latestPace;

  const efficiencyScore = (log: CardioLog) => {
    if (!log.average_heart_rate || !log.distance_km || !log.duration_minutes) return 0;
    return (log.distance_km * 1000) / (log.average_heart_rate * log.duration_minutes);
  };

  const hrZone = latest.average_heart_rate ? (latest.average_heart_rate / maxHR) * 100 : 0;
  let zoneDescription = "Moderate";
  if (hrZone < 60) zoneDescription = "Zone 1 (Recovery)";
  else if (hrZone < 70) zoneDescription = "Zone 2 (Endurance Base)";
  else if (hrZone < 80) zoneDescription = "Zone 3 (Aerobic)";
  else if (hrZone < 90) zoneDescription = "Zone 4 (Threshold)";
  else zoneDescription = "Zone 5 (Max Effort)";

  return {
    paceDiff,
    isMoreEfficient: efficiencyScore(latest) > efficiencyScore(previous),
    zoneDescription,
    hrZone: Math.round(hrZone),
    caloriesPerMin: latest.calories_burned ? latest.calories_burned / Math.max(latest.duration_minutes, 1) : 0,
  };
};
