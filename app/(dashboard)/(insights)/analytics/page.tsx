import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";

export default async function LegacyAnalyticsRedirectPage() {
  try {
    await requireAdmin();
    redirect("/admin/analytics");
  } catch {
    redirect("/dashboard");
  }
}
