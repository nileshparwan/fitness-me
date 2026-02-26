"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CompactMetricCard } from "@/components/admin/compact-metric-card";
import { useAdminSettingsSnapshot } from "@/hooks/admin/use-admin";

function formatDate(value: string | null | undefined) {
  if (!value) return "No data";
  return format(new Date(value), "MMM d, yyyy HH:mm");
}

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

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettingsSnapshot();

  const [localConfig, setLocalConfig] = useState<{
    max_sessions_per_day: string;
    enable_ai_hints: boolean;
    enable_nutrition_autofill: boolean;
  }>({
    max_sessions_per_day: "4",
    enable_ai_hints: true,
    enable_nutrition_autofill: false,
  });

  const exportSnapshot = () => {
    if (!data) return;
    const filename = `admin-settings-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
  };

  const environmentScore = useMemo(() => {
    if (!data) return 0;
    return [data.environment.has_openai_key, data.environment.has_service_role_key, data.environment.has_supabase_url].filter(Boolean).length;
  }, [data]);

  const saveDummyConfig = () => {
    toast.info("Dummy configuration saved locally. Backend persistence will be implemented in next phase.");
  };

  return (
    <div className="section-gap">
      <div className="native-surface surface-pad flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Application Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Centralized control panel for runtime readiness, policy configuration, and future feature controls.
          </p>
        </div>
        <Button variant="outline" onClick={exportSnapshot} disabled={!data}>
          <Download className="mr-2 h-4 w-4" />
          Export Config Snapshot
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <CompactMetricCard title="Config Readiness" value={`${environmentScore}/3`} isLoading={isLoading} />
        <CompactMetricCard title="Users" value={data?.health.total_users ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Sessions" value={data?.health.total_sessions ?? 0} isLoading={isLoading} />
        <CompactMetricCard title="Events" value={data?.health.total_events ?? 0} isLoading={isLoading} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Critical Environment Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusRow label="SUPABASE_SERVICE_ROLE_KEY" ok={Boolean(data?.environment.has_service_role_key)} isLoading={isLoading} />
            <StatusRow label="OPENAI_AI_KEY" ok={Boolean(data?.environment.has_openai_key)} isLoading={isLoading} />
            <StatusRow label="NEXT_PUBLIC_SUPABASE_URL" ok={Boolean(data?.environment.has_supabase_url)} isLoading={isLoading} />
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dummy Runtime Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max Sessions Per Day</p>
              <Input
                value={localConfig.max_sessions_per_day}
                onChange={(event) => setLocalConfig((prev) => ({ ...prev, max_sessions_per_day: event.target.value }))}
              />
            </div>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Enable AI Hints</span>
              <Switch
                checked={localConfig.enable_ai_hints}
                onCheckedChange={(checked) => setLocalConfig((prev) => ({ ...prev, enable_ai_hints: checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Enable Nutrition Autofill</span>
              <Switch
                checked={localConfig.enable_nutrition_autofill}
                onCheckedChange={(checked) =>
                  setLocalConfig((prev) => ({ ...prev, enable_nutrition_autofill: checked }))
                }
              />
            </label>
            <Button onClick={saveDummyConfig} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Dummy Config
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature Flags (Dummy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.app_configuration.feature_flags || []).map((flag) => (
              <div key={flag.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{flag.key}</p>
                  <p className={flag.enabled ? "text-emerald-600" : "text-muted-foreground"}>{flag.enabled ? "On" : "Off"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="native-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Security Policy Templates (Dummy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.app_configuration.security_controls || []).map((policy) => (
              <div key={policy.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{policy.key}</p>
                  <p className="text-muted-foreground">{policy.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{policy.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="native-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data Freshness</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-3 text-sm">
          <FreshnessTile title="Training" value={formatDate(data?.health.last_training_entry_at)} isLoading={isLoading} />
          <FreshnessTile title="Nutrition" value={formatDate(data?.health.last_nutrition_entry_at)} isLoading={isLoading} />
          <FreshnessTile title="Analytics" value={formatDate(data?.health.last_analytics_event_at)} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, ok, isLoading }: { label: string; ok: boolean; isLoading: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <p className="text-sm font-medium">{label}</p>
      {isLoading ? <Skeleton className="h-4 w-16" /> : <p className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "Ready" : "Missing"}</p>}
    </div>
  );
}

function FreshnessTile({ title, value, isLoading }: { title: string; value: string; isLoading: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {isLoading ? <Skeleton className="mt-1 h-4 w-24" /> : <p className="text-sm">{value}</p>}
    </div>
  );
}
