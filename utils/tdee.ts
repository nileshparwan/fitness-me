import type { GenderType } from "@/types/health";

type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "extreme";
type GoalType = "weight_loss" | "muscle_gain" | "body_recomposition" | "maintenance";

type TdeeInput = {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: GenderType | null | undefined;
  activity_level: ActivityLevel;
  goal_type: GoalType;
};

type MacroSplit = {
  protein: number;
  carbs: number;
  fat: number;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extreme: 1.9,
};

const GOAL_MACRO_SPLITS: Record<GoalType, MacroSplit> = {
  weight_loss: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  muscle_gain: { protein: 0.3, carbs: 0.5, fat: 0.2 },
  body_recomposition: { protein: 0.35, carbs: 0.4, fat: 0.25 },
  maintenance: { protein: 0.25, carbs: 0.5, fat: 0.25 },
};

function calculateBmr(weightKg: number, heightCm: number, age: number, gender: GenderType | null | undefined) {
  const male = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  if (gender === "male") return male;
  if (gender === "female") return female;
  return (male + female) / 2;
}

export function calculateTDEE({
  weight_kg,
  height_cm,
  age,
  gender,
  activity_level,
  goal_type,
}: TdeeInput) {
  const bmr = calculateBmr(weight_kg, height_cm, age, gender);
  const calories = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
  const split = GOAL_MACRO_SPLITS[goal_type];

  return {
    calories,
    protein_g: Math.round((calories * split.protein) / 4),
    carbs_g: Math.round((calories * split.carbs) / 4),
    fat_g: Math.round((calories * split.fat) / 9),
  };
}

export type { ActivityLevel, GoalType, TdeeInput };
