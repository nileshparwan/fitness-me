import { Database } from "./database";

export type NutritionProgram = Database["public"]["Tables"]["nutrition_programs"]["Row"];
export type NutritionMeal = Database["public"]["Tables"]["nutrition_meals"]["Row"];

// A lightweight type for dropdowns/selectors to improve performance
export type ProgramSummary = Pick<NutritionProgram, "id" | "name">;