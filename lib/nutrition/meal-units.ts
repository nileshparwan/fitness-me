import { z } from "zod";

const MEAL_UNITS = [
  "g",
  "kg",
  "mg",
  "lb",
  "oz",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "serving",
  "piece",
  "slice",
  "bowl",
  "plate",
  "packet",
  "scoop",
  "can",
  "bottle",
  "glass",
  "clove",
  "pinch",
  "dash",
  "drop",
  "stick",
  "whole",
  "half",
  "quart",
  "pint",
] as const;

type MealUnit = (typeof MEAL_UNITS)[number];

const MEAL_UNIT_SET = new Set<string>(MEAL_UNITS);

const MEAL_UNIT_ALIASES: Record<string, MealUnit> = {
  gram: "g",
  grams: "g",
  gm: "g",
  gms: "g",
  kilogram: "kg",
  kilograms: "kg",
  kgs: "kg",
  milligram: "mg",
  milligrams: "mg",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
  ounce: "oz",
  ounces: "oz",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cups: "cup",
  servings: "serving",
  pieces: "piece",
  slices: "slice",
  bowls: "bowl",
  plates: "plate",
  packets: "packet",
  scoops: "scoop",
  cans: "can",
  bottles: "bottle",
  glasses: "glass",
};

export function normalizeMealUnit(value: string | null | undefined): MealUnit | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (MEAL_UNIT_SET.has(normalized)) return normalized as MealUnit;
  return MEAL_UNIT_ALIASES[normalized] ?? null;
}

export const mealUnitInputSchema = z
  .string()
  .trim()
  .max(40)
  .nullable()
  .optional()
  .superRefine((value, ctx) => {
    if (typeof value === "string" && value.length > 0 && !normalizeMealUnit(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a valid unit",
      });
    }
  })
  .transform((value): MealUnit | null | undefined => {
    if (value === undefined) return undefined;
    return normalizeMealUnit(value);
  });

export function getMealUnitOptions(legacyUnit?: string | null) {
  const options = MEAL_UNITS.map((unit) => ({ value: unit, label: unit }));
  if (!legacyUnit) return options;
  const normalizedLegacy = legacyUnit.trim();
  if (!normalizedLegacy || normalizeMealUnit(normalizedLegacy)) return options;
  return [{ value: normalizedLegacy, label: `${normalizedLegacy} (legacy)` }, ...options];
}
