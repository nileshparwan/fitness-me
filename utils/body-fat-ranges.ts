import type { GenderType } from "@/types/health";

type BodyFatCategory = {
  category: string;
  color: string;
  description: string;
};

const FEMALE_RANGES = [
  { max: 14, category: "Essential", color: "bg-sky-500", description: "Essential fat range" },
  { max: 20, category: "Athlete", color: "bg-emerald-500", description: "Athlete range" },
  { max: 24, category: "Fit", color: "bg-lime-500", description: "Fit range" },
  { max: 31, category: "Average", color: "bg-amber-500", description: "Average range" },
] as const;

const MALE_RANGES = [
  { max: 6, category: "Essential", color: "bg-sky-500", description: "Essential fat range" },
  { max: 13, category: "Athlete", color: "bg-emerald-500", description: "Athlete range" },
  { max: 17, category: "Fit", color: "bg-lime-500", description: "Fit range" },
  { max: 24, category: "Average", color: "bg-amber-500", description: "Average range" },
] as const;

type BodyFatRange = {
  max: number;
  category: string;
  color: string;
  description: string;
};

function pickRange(percent: number, ranges: readonly BodyFatRange[]): BodyFatCategory {
  for (const range of ranges) {
    if (percent <= range.max) {
      return range;
    }
  }
  return { category: "Obese", color: "bg-red-500", description: "Above the recommended range" };
}

export function getBodyFatCategory(percent: number, gender: GenderType | null | undefined): BodyFatCategory {
  if (gender === "male") return pickRange(percent, MALE_RANGES);
  if (gender === "female") return pickRange(percent, FEMALE_RANGES);
  return pickRange(percent, FEMALE_RANGES);
}

export type { BodyFatCategory };
