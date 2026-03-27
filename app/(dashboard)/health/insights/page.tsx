import { redirect } from "next/navigation";

export default function HealthInsightsPage() {
  redirect("/progress?tab=health");
}
