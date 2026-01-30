import { Database } from "@/types/database";
import { differenceInYears } from "date-fns";

type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

// Helper: Round to nearest 2.5kg (Standard Gym Increment)
const roundToGymPlates = (weight: number) => {
    return Math.round(weight / 2.5) * 2.5;
};

// --- UNIVERSAL METRIC CALCULATOR ---
export const getStandardizedMetrics = (log: WorkoutLog | CardioLog | any) => {

    // 1. IS IT CARDIO?
    if (log && ('distance_km' in log || 'activity_type' in log)) {
        const l = log as CardioLog;
        const dist = l.distance_km || 0;
        const time = l.duration_minutes || 0;
        const pace = dist > 0 ? time / dist : 0;

        // Convert decimal pace to MM:SS
        const paceMin = Math.floor(pace);
        const paceSec = Math.round((pace - paceMin) * 60);
        const paceStr = `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec}`;

        return {
            type: 'cardio',
            mainMetric: `${dist.toFixed(2)} km`,
            subMetric: `${paceStr} /km`,
            intensity: l.average_heart_rate ? `${l.average_heart_rate} bpm` : '-',
            value: dist
        };
    }

    // 2. IS IT STRENGTH?
    const l = log as WorkoutLog;
    const weight = l.weight || 0;
    const reps = l.reps || 0;

    // Smart 1RM Calculation
    // Use stored value if exists, otherwise calculate safely
    let est1RM = l.calculated_1rm || 0;
    
    if (!est1RM && weight > 0) {
        if (reps > 20) {
            // High rep sets are poor 1RM predictors. Return weight as is.
            est1RM = weight; 
        } else if (reps > 10) {
            // Epley Formula (Better for higher reps than Brzycki)
            est1RM = Math.round(weight * (1 + (reps / 30)));
        } else {
            // Brzycki Formula (Gold standard for < 10 reps)
            est1RM = Math.round(weight * (36 / (37 - reps)));
        }
    }

    // Bodyweight Handling
    if (weight === 0 && reps > 0) {
        return {
            type: 'bodyweight',
            mainMetric: `${reps} reps`,
            subMetric: 'Bodyweight',
            intensity: l.rpe ? `RPE ${l.rpe}` : '-',
            value: reps
        };
    }

    return {
        type: 'strength',
        mainMetric: `${weight} kg`,
        subMetric: `${reps} reps`,
        intensity: l.calculated_1rm ? `${l.calculated_1rm}kg (1RM)` : (l.rpe ? `RPE ${l.rpe}` : '-'),
        value: est1RM
    };
};

export const calculateDeepInsights = (logs: WorkoutLog[]) => {
    if (logs.length < 2) return null;

    const latest = logs[0];
    const previous = logs.find(l =>
        new Date(l.created_at!).toDateString() !== new Date(latest.created_at!).toDateString()
    ) || logs[1];

    const weightDiff = (latest.weight || 0) - (previous.weight || 0);
    const repDiff = (latest.reps || 0) - (previous.reps || 0);

    let overloadStatus = "Maintenance";
    if (weightDiff > 0) overloadStatus = "Intensity Increase";
    else if (weightDiff === 0 && repDiff > 0) overloadStatus = "Volume Increase";
    else if (weightDiff < 0) overloadStatus = "Deload / Regression";

    const rpeDiff = (latest.rpe || 0) - (previous.rpe || 0);
    let rpeTrend = "Stable";
    if (rpeDiff > 1) rpeTrend = "Harder than usual";
    if (rpeDiff < -1) rpeTrend = "Getting easier";

    return {
        weightDiff,
        repDiff,
        overloadStatus,
        rpeTrend,
        previousWeight: previous.weight
    };
};

export const calculateCardioInsights = (logs: CardioLog[], birthDate?: string | null) => {
    if (logs.length < 2) return null;

    const latest = logs[0];
    const previous = logs[1];

    const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30; 
    const maxHR = 220 - age; // Note: Use Karvonen if RHR is added to profile schema later

    const calculatePace = (log: CardioLog) => {
        if (!log.distance_km || !log.duration_minutes) return 0;
        return log.duration_minutes / log.distance_km;
    };

    const latestPace = calculatePace(latest);
    const prevPace = calculatePace(previous);
    const paceDiff = prevPace - latestPace;

    // Efficiency: Meters per Heart Beat (Aerobic Decoupling proxy)
    const efficiencyScore = (log: CardioLog) => {
        if (!log.average_heart_rate || !log.distance_km || !log.duration_minutes) return 0;
        return (log.distance_km * 1000) / (log.average_heart_rate * log.duration_minutes);
    };

    const isMoreEfficient = efficiencyScore(latest) > efficiencyScore(previous);

    const hrZone = latest.average_heart_rate ? (latest.average_heart_rate / maxHR) * 100 : 0;
    let zoneDescription = "Moderate";
    if (hrZone < 60) zoneDescription = "Zone 1 (Recovery)";
    else if (hrZone < 70) zoneDescription = "Zone 2 (Endurance Base)";
    else if (hrZone < 80) zoneDescription = "Zone 3 (Aerobic)";
    else if (hrZone < 90) zoneDescription = "Zone 4 (Threshold)";
    else zoneDescription = "Zone 5 (Max Effort)";

    return {
        paceDiff,
        isMoreEfficient,
        zoneDescription,
        hrZone: Math.round(hrZone),
        caloriesPerMin: latest.calories_burned ? (latest.calories_burned / latest.duration_minutes).toFixed(1) : 0
    };
};

export const calculateStrengthStats = (log: WorkoutLog) => {
    const weight = log.weight || 0;
    const reps = log.reps || 0;
    const volume = weight * reps;
    
    // SAFE 1RM CALCULATION
    let est1RM = 0;
    if (weight > 0) {
        if (reps > 20) est1RM = weight; // Cap high reps
        else if (reps > 10) est1RM = Math.round(weight * (1 + (reps / 30))); // Epley
        else est1RM = Math.round(weight * (36 / (37 - reps))); // Brzycki
    }

    return { volume, est1RM };
};

export const calculateNextSession = (lastLog: WorkoutLog) => {
    const metrics = getStandardizedMetrics(lastLog);

    if (metrics.type === 'bodyweight') {
        return {
            metric: "Reps",
            weight: 0,
            target: Math.round(metrics.value * 1.1),
            reason: "Bodyweight movement. Focus on increasing repetition volume."
        };
    }

    if (metrics.type === 'strength') {
        const currentWeight = lastLog.weight || 0;
        const rpe = lastLog.rpe || 8;

        let nextWeight = currentWeight;
        let msg = "Maintain load.";

        if (rpe <= 6) {
            nextWeight = currentWeight * 1.05;
            msg = "Previous set was easy (RPE ≤ 6). Increase load ~5%.";
        } else if (rpe >= 7 && rpe <= 8.5) {
            // OPTIMIZATION: Small increase for optimal zone
            nextWeight = currentWeight + 1.25; 
            msg = "Optimal zone. Attempt a small micro-load increase.";
        }

        // OPTIMIZATION: Round to actionable gym plates (2.5kg)
        const roundedWeight = roundToGymPlates(nextWeight);

        return {
            metric: "Weight",
            weight: roundedWeight,
            target: roundedWeight,
            reason: msg
        };
    }

    return null;
};

export const analyzeTrainingStyle = (logs: WorkoutLog[]) => {
    if (!logs.length) return { style: "Balanced", color: "text-blue-500" };
    
    // OPTIMIZATION: Only analyze last 5 sessions for current phase accuracy
    const recentLogs = logs.slice(0, 5);
    
    const avgReps = recentLogs.reduce((acc, curr) => acc + (curr.reps || 0), 0) / recentLogs.length;

    if (avgReps < 6) return { style: "Strength (Power)", color: "text-red-500" };
    if (avgReps >= 6 && avgReps <= 12) return { style: "Hypertrophy", color: "text-blue-500" };
    return { style: "Endurance", color: "text-green-500" };
};