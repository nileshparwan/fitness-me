import { Database } from "./database";

export type NutritionProgram = Database["public"]["Tables"]["meal_plans"]["Row"];
export type NutritionMeal = Database["public"]["Tables"]["meal_plan_meals"]["Row"];

// A lightweight type for dropdowns/selectors to improve performance
export type ProgramSummary = Pick<NutritionProgram, "id" | "name">;