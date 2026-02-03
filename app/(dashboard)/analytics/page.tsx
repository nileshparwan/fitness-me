import { createClient } from "@/lib/supabase/server";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: rawEvents } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  // FIX: Normalize the data to remove nulls before passing to client
  const events = (rawEvents || []).map(event => ({
    ...event,
    page_path: event.page_path || "/",      // Fallback for null path
    created_at: event.created_at || new Date().toISOString(), // Fallback for null date
    user_id: event.user_id || "anonymous",  // Fallback for null user
    // metadata is usually 'Json', which is compatible, but you can cast if needed
  }));

  const { count: totalCount } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true });

  const uniqueUsers = new Set(events.map(e => e.user_id).filter(id => id !== "anonymous"));

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Analyzing the last {events.length} interactions.
        </p>
      </div>

      <AnalyticsView 
        initialEvents={events} 
        totalHistoricalEvents={totalCount || 0}
        activeUserCount={uniqueUsers.size}
      />
    </div>
  );
}