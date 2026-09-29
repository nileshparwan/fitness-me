import { bmr, caloricNeeds, idealBodyWeight, tdee } from "fitness-health-calculations";

export type SupportedBodyHealthGender = "male" | "female";
export type BodyHealthActivityLevel = "sedentary" | "light" | "moderate" | "high" | "extreme";
export type BodyHealthGoal = "reduction" | "maintain" | "gain";
export type BodyHealthApproach = "slow" | "normal" | "agressive" | "very agressive";
export type BodyMassIndexCategory = "Underweight" | "Normal" | "Overweight" | "Obese";

export type BodyHealthMetrics = {
  bmi: number | null;
  bmi_category: BodyMassIndexCategory | null;
  bmr: number | null;
  tdee: number | null;
  ideal_body_weight_kg: number | null;
  weight_vs_ideal_kg: number | null;
  caloric_needs: {
    reduction: number | null;
    maintain: number | null;
    gain: number | null;
  };
};

export type BodyHealthInput = {
  gender?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: BodyHealthActivityLevel | null;
  reduction_approach?: BodyHealthApproach | null;
  gain_approach?: BodyHealthApproach | null;
};

export function normalizeBodyHealthGender(value: string | null | undefined): SupportedBodyHealthGender | null {
  if (value === "male" || value === "female") return value;
  return null;
}

export function computeAgeFromBirthDate(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
  const dayDelta = now.getUTCDate() - birthDate.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }
  return age > 0 ? age : null;
}

function roundTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function getBodyMassIndexCategory(value: number | null): BodyMassIndexCategory | null {
  if (value === null) return null;
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

function safeCalc(fn: () => number) {
  try {
    const value = fn();
    return Number.isFinite(value) ? roundTwo(value) : null;
  } catch {
    return null;
  }
}

export function computeCaloricNeeds(
  input: BodyHealthInput,
  goal: BodyHealthGoal,
  approach: BodyHealthApproach = "normal"
) {
  const gender = normalizeBodyHealthGender(input.gender);
  const age = input.age ?? null;
  const heightCm = input.height_cm ?? null;
  const weightKg = input.weight_kg ?? null;
  const activityLevel = input.activity_level ?? "moderate";

  if (!gender || !age || !heightCm || !weightKg) return null;
  return safeCalc(() => caloricNeeds(gender, age, heightCm, weightKg, activityLevel, goal, approach));
}

export function deriveActivityLevel(sessionsPerWeek: number): BodyHealthActivityLevel {
  if (sessionsPerWeek <= 0) return "sedentary";
  if (sessionsPerWeek <= 2) return "light";
  if (sessionsPerWeek <= 4) return "moderate";
  if (sessionsPerWeek <= 6) return "high";
  return "extreme";
}

export function computeBodyHealthMetrics(input: BodyHealthInput): BodyHealthMetrics {
  const gender = normalizeBodyHealthGender(input.gender);
  const age = input.age ?? null;
  const heightCm = input.height_cm ?? null;
  const weightKg = input.weight_kg ?? null;
  const activityLevel = input.activity_level ?? "moderate";
  const reductionApproach = input.reduction_approach ?? "normal";
  const gainApproach = input.gain_approach ?? "normal";

  const bmi =
    heightCm && weightKg && heightCm > 0
      ? roundTwo(weightKg / Math.pow(heightCm / 100, 2))
      : null;
  const bmiCategory = getBodyMassIndexCategory(bmi);

  if (!gender || !age || !heightCm || !weightKg) {
    return {
      bmi,
      bmi_category: bmiCategory,
      bmr: null,
      tdee: null,
      ideal_body_weight_kg: null,
      weight_vs_ideal_kg: null,
      caloric_needs: {
        reduction: null,
        maintain: null,
        gain: null,
      },
    };
  }

  const idealWeight = safeCalc(() => idealBodyWeight(heightCm, gender, "metric"));

  return {
    bmi,
    bmi_category: bmiCategory,
    bmr: safeCalc(() => bmr(gender, age, heightCm, weightKg)),
    tdee: safeCalc(() => tdee(gender, age, heightCm, weightKg, activityLevel)),
    ideal_body_weight_kg: idealWeight,
    weight_vs_ideal_kg: idealWeight === null ? null : roundTwo(weightKg - idealWeight),
    caloric_needs: {
      reduction: computeCaloricNeeds(input, "reduction", reductionApproach),
      maintain: computeCaloricNeeds(input, "maintain"),
      gain: computeCaloricNeeds(input, "gain", gainApproach),
    },
  };
}
