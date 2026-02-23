import { Database } from "@/types/database";
import { differenceInYears } from "date-fns";

type WorkoutLog = Database["public"]["Tables"]["strength_sets"]["Row"];
type CardioLog = Database["public"]["Tables"]["cardio_sessions"]["Row"];

const roundToGymPlates = (weight: number, increment = 2.5) =>
  Math.round(weight / increment) * increment;

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
  if (reps >= 37) return weight;
  return Math.round(weight * (36 / (37 - reps))); // Brzycki
};

const calculateSetVolume = (weight: number, reps: number) => weight * reps;

const getStandardizedMetrics = (log: WorkoutLog | CardioLog) => {
  if ("activity_type" in log) {
    const distance = log.distance_km || 0;
    const duration = log.duration_minutes || 0;
    const pace = calculatePaceMinutesPerKm(distance, duration);

    return {
      type: "cardio" as const,
      mainMetric: `${distance.toFixed(2)} km`,
      subMetric: `${formatPace(pace)} /km`,
      intensity: log.average_heart_rate ? `${log.average_heart_rate} bpm` : "-",
      value: distance,
    };
  }

  const weight = log.weight || 0;
  const reps = log.reps || 0;

  if (weight === 0 && reps > 0) {
    return {
      type: "bodyweight" as const,
      mainMetric: `${reps} reps`,
      subMetric: "Bodyweight",
      intensity: "-",
      value: reps,
    };
  }

  const oneRepMax = log.calculated_1rm || estimateOneRepMax(weight, reps);

  return {
    type: "strength" as const,
    mainMetric: `${weight} kg`,
    subMetric: `${reps} reps`,
    intensity: oneRepMax ? `${oneRepMax}kg (1RM)` : "-",
    value: oneRepMax,
  };
};

const calculateDeepInsights = (logs: WorkoutLog[]) => {
  if (logs.length < 2) return null;

  const latest = logs[0];
  const previous =
    logs.find(
      (entry) =>
        new Date(entry.created_at || 0).toDateString() !==
        new Date(latest.created_at || 0).toDateString(),
    ) || logs[1];

  const weightDiff = (latest.weight || 0) - (previous.weight || 0);
  const repDiff = (latest.reps || 0) - (previous.reps || 0);

  let overloadStatus = "Maintenance";
  if (weightDiff > 0) overloadStatus = "Intensity Increase";
  else if (weightDiff === 0 && repDiff > 0) overloadStatus = "Volume Increase";
  else if (weightDiff < 0) overloadStatus = "Deload / Regression";

  let repTrend = "Stable";
  if (repDiff > 1) repTrend = "Higher reps than usual";
  if (repDiff < -1) repTrend = "Lower reps than usual";

  return {
    weightDiff,
    repDiff,
    overloadStatus,
    repTrend,
    previousWeight: previous.weight,
  };
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

const calculateStrengthStats = (log: WorkoutLog) => {
  const weight = log.weight || 0;
  const reps = log.reps || 0;
  return {
    volume: calculateSetVolume(weight, reps),
    est1RM: estimateOneRepMax(weight, reps),
  };
};

const calculateNextSession = (lastLog: WorkoutLog) => {
  const metrics = getStandardizedMetrics(lastLog);

  if (metrics.type === "bodyweight") {
    return {
      metric: "Reps",
      weight: 0,
      target: Math.round(metrics.value * 1.1),
      reason: "Bodyweight movement. Increase repetition volume gradually.",
    };
  }

  const currentWeight = lastLog.weight || 0;
  const reps = lastLog.reps || 0;
  let nextWeight = currentWeight;
  let reason = "Maintain load.";

  if (reps >= 10) {
    nextWeight = currentWeight * 1.05;
    reason = "High reps reached. Increase load by about 5%.";
  } else if (reps >= 6) {
    nextWeight = currentWeight + 1.25;
    reason = "Good intensity range. Try a micro-load increase.";
  }

  const target = roundToGymPlates(nextWeight);
  return {
    metric: "Weight",
    weight: target,
    target,
    reason,
  };
};

const analyzeTrainingStyle = (logs: WorkoutLog[]) => {
  if (!logs.length) return { style: "Balanced", color: "text-blue-500" };

  const recent = logs.slice(0, 5);
  const avgReps = recent.reduce((acc, entry) => acc + (entry.reps || 0), 0) / recent.length;

  if (avgReps < 6) return { style: "Strength (Power)", color: "text-red-500" };
  if (avgReps <= 12) return { style: "Hypertrophy", color: "text-blue-500" };
  return { style: "Endurance", color: "text-green-500" };
};
