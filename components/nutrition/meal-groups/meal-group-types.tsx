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

