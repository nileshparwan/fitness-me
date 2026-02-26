"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/database";

type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];

type AnalyticsEvent = Pick<
  AnalyticsEventRow,
  "id" | "event_name" | "page_path" | "user_id" | "created_at" | "metadata"
>;

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toCsvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((value) => {
      const text = String(value ?? "");
      return `"${text.replaceAll('"', '""')}"`;
    })
    .join(",");
}

export function AnalyticsExportPanel({ events }: { events: AnalyticsEvent[] }) {
  const summary = useMemo(() => {
    const eventCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();

    events.forEach((event) => {
      eventCounts.set(event.event_name, (eventCounts.get(event.event_name) || 0) + 1);
      const page = event.page_path || "/";
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
    });

    return {
      topEvents: Array.from(eventCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topPages: Array.from(pageCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }, [events]);

  const exportJson = () => {
    const fileName = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(fileName, JSON.stringify(events, null, 2), "application/json");
  };

  const exportCsv = () => {
    const rows = events.map((event) =>
      toCsvRow([
        event.id,
        event.event_name,
        event.page_path,
        event.user_id,
        event.created_at,
        JSON.stringify(event.metadata ?? {}),
      ])
    );
    const csv = [toCsvRow(["id", "event_name", "page_path", "user_id", "created_at", "metadata"]), ...rows].join("\n");
    const fileName = `analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(fileName, csv, "text/csv;charset=utf-8;");
  };

  return (
    <div className="section-gap">
      <Card className="native-surface">
        <CardHeader>
          <CardTitle>Admin Analytics Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Button variant="outline" onClick={exportCsv} disabled={events.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportJson} disabled={events.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="native-surface">
          <CardHeader>
            <CardTitle>Top Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topEvents.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{count}</p>
              </div>
            ))}
            {summary.topEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No event data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.topPages.map(([path, count]) => (
              <div key={path} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <p className="max-w-[70%] truncate font-medium">{path}</p>
                <p className="text-sm text-muted-foreground">{count}</p>
              </div>
            ))}
            {summary.topPages.length === 0 && (
              <p className="text-sm text-muted-foreground">No page data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
