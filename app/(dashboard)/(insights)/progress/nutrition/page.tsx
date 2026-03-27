import { redirect } from "next/navigation";

export default function NutritionProgressRoute() {
  redirect("/progress?tab=nutrition");
}
