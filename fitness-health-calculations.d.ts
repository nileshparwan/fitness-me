declare module "fitness-health-calculations" {
  export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "extreme";
  export type Goal = "reduction" | "maintain" | "gain";
  export type Approach = "slow" | "normal" | "agressive" | "very agressive";
  export type Gender = "male" | "female";

  export function bmr(gender: Gender, age: number, height: number, weight: number): number;
  export function tdee(
    gender: Gender,
    age: number,
    height: number,
    weight: number,
    activityLevel: ActivityLevel
  ): number;
  export function caloricNeeds(
    gender: Gender,
    age: number,
    height: number,
    weight: number,
    activityLevel: ActivityLevel,
    goal: Goal,
    approach?: Approach
  ): number;
  export function idealBodyWeight(height: number, gender: Gender, units?: "metric" | "imperial"): number;
}
