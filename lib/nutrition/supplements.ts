export const SUPPLEMENT_NUTRIENT_LABELS: Record<string, string> = {
  vitamin_d_iu: "Vitamin D",
  vitamin_c_mg: "Vitamin C",
  vitamin_b12_mcg: "B12",
  folate_mcg: "Folate",
  iron_mg: "Iron",
  calcium_mg: "Calcium",
  magnesium_mg: "Magnesium",
  zinc_mg: "Zinc",
  omega3_g: "Omega-3",
  creatine_g: "Creatine",
  protein_g: "Protein (suppl.)",
} as const;

export const SUPPLEMENT_CATEGORY_LABELS: Record<string, string> = {
  vitamin: "Vitamins",
  mineral: "Minerals",
  omega: "Omega",
  electrolyte: "Electrolytes",
  protein: "Performance",
  herbal: "Herbal",
  other: "Other",
};

export const SUPPLEMENT_UNIT_VALUES = [
  "unit",
  "serving",
  "scoop",
  "capsule",
  "tablet",
  "softgel",
  "packet",
  "sachet",
  "drop",
  "spray",
  "piece",
  "tsp",
  "tbsp",
  "ml",
  "l",
  "fl_oz",
  "oz",
  "g",
  "mg",
  "mcg",
  "iu",
] as const;
export type SupplementUnitValue = (typeof SUPPLEMENT_UNIT_VALUES)[number];

export const SUPPLEMENT_UNIT_OPTIONS: Array<{ value: SupplementUnitValue; label: string }> = [
  { value: "unit", label: "Unit" },
  { value: "serving", label: "Serving" },
  { value: "scoop", label: "Scoop" },
  { value: "capsule", label: "Capsule" },
  { value: "tablet", label: "Tablet" },
  { value: "softgel", label: "Softgel" },
  { value: "packet", label: "Packet" },
  { value: "sachet", label: "Sachet" },
  { value: "drop", label: "Drop" },
  { value: "spray", label: "Spray" },
  { value: "piece", label: "Piece" },
  { value: "tsp", label: "Teaspoon (tsp)" },
  { value: "tbsp", label: "Tablespoon (tbsp)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "l", label: "Liter (l)" },
  { value: "fl_oz", label: "Fluid ounce (fl oz)" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "g", label: "Gram (g)" },
  { value: "mg", label: "Milligram (mg)" },
  { value: "mcg", label: "Microgram (mcg)" },
  { value: "iu", label: "IU" },
];

export function buildSupplementProgramNote(input: {
  workoutProgram?: string | null;
  nutritionProgram?: string | null;
}) {
  const parts: string[] = [];
  const workoutProgram = input.workoutProgram?.trim();
  const nutritionProgram = input.nutritionProgram?.trim();

  if (workoutProgram) parts.push(`Workout: ${workoutProgram}`);
  if (nutritionProgram) parts.push(`Nutrition: ${nutritionProgram}`);
  return parts.join(" | ") || null;
}

export function parseSupplementProgramNote(note?: string | null): {
  workoutProgram: string | null;
  nutritionProgram: string | null;
} {
  const raw = note?.trim();
  if (!raw) {
    return { workoutProgram: null, nutritionProgram: null };
  }

  let workoutProgram: string | null = null;
  let nutritionProgram: string | null = null;
  for (const segment of raw.split("|")) {
    const token = segment.trim();
    if (!token) continue;
    const lower = token.toLowerCase();
    if (lower.startsWith("workout:")) {
      const value = token.slice(token.indexOf(":") + 1).trim();
      if (value) workoutProgram = value;
      continue;
    }
    if (lower.startsWith("nutrition:")) {
      const value = token.slice(token.indexOf(":") + 1).trim();
      if (value) nutritionProgram = value;
      continue;
    }
  }

  return { workoutProgram, nutritionProgram };
}

export function normalizeSupplementDisplayName(name: string) {
  let normalized = (name || "").trim();
  if (!normalized) return normalized;

  // Remove trailing parenthetical dose blocks e.g. "(325mg ferrous)".
  normalized = normalized.replace(/\s*\((?:[^)]*\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)[^)]*)\)\s*$/i, "");
  // Remove trailing dose suffix e.g. "500mg", "1000 IU", "2 g".
  normalized = normalized.replace(/\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|iu)\s*$/i, "");

  return normalized.trim();
}
