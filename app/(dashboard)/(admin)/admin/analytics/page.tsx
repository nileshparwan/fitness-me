import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { AnalyticsExportPanel } from "@/components/admin/analytics-export-panel";

export default async function AdminAnalyticsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: rawEvents } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  const events = (rawEvents || []).map((event) => ({
    ...event,
    page_path: event.page_path || "/",
    created_at: event.created_at || new Date().toISOString(),
    user_id: event.user_id || "anonymous",
  }));

  const { count: totalCount } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true });

  const uniqueUsers = new Set(events.map((event) => event.user_id).filter((id) => id !== "anonymous"));

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Admin-only analytics suite with filters, trends, and export controls.
        </p>
      </div>

      <AnalyticsExportPanel events={events} />

      <AnalyticsView
        initialEvents={events}
        totalHistoricalEvents={totalCount || 0}
        activeUserCount={uniqueUsers.size}
      />
    </div>
  );
}
