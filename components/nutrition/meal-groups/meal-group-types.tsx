"use client";

import type { LucideIcon } from "lucide-react";
import {
  Beef,
  Droplets,
  Drumstick,
  GlassWater,
  Moon,
  Soup,
  Sun,
  Zap,
} from "lucide-react";

import type { MealDayOfWeek, MealGroupStatus, MealItemType } from "@/app/actions/meal-groups";

export const MEAL_DAY_ORDER: MealDayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const MEAL_DAY_LABELS: Record<MealDayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const MEAL_TYPE_LABELS: Record<MealItemType, string> = {
  water: "Water",
  breakfast: "Breakfast",
  snack: "Snack",
  lunch: "Lunch",
  pre_workout_meal: "Pre-workout Meal",
  post_workout_meal: "Post-workout Meal",
  dinner: "Dinner",
  protein_drink: "Protein Drink",
};

export const MEAL_TYPE_DISPLAY_ORDER: MealItemType[] = [
  "breakfast",
  "snack",
  "lunch",
  "pre_workout_meal",
  "post_workout_meal",
  "dinner",
  "protein_drink",
  "water",
];

export const MEAL_TYPE_ACCENTS: Record<MealItemType, string> = {
  water: "text-chart-3",
  breakfast: "text-chart-1",
  snack: "text-chart-4",
  lunch: "text-chart-2",
  pre_workout_meal: "text-chart-3",
  post_workout_meal: "text-chart-5",
  dinner: "text-chart-4",
  protein_drink: "text-chart-1",
};

export const MEAL_TYPE_ICONS: Record<MealItemType, LucideIcon> = {
  water: Droplets,
  breakfast: Sun,
  snack: Soup,
  lunch: Drumstick,
  pre_workout_meal: Zap,
  post_workout_meal: Beef,
  dinner: Moon,
  protein_drink: GlassWater,
};

export const MEAL_GROUP_STATUS_LABELS: Record<MealGroupStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};
