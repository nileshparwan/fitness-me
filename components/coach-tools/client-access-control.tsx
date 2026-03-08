"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { listClientDetailAction } from "@/app/actions/coach-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoachClientPortalMutations, useCoachClientPortalSettings } from "@/hooks/use-client-portal";
import { CLIENT_MODULE_KEYS, type ClientModuleKey } from "@/lib/client-portal/constants";
import { coachKeys } from "@/lib/query-keys-coach";
import { cn } from "@/utils";

const MODULE_LABELS: Record<ClientModuleKey, string> = {
  workouts: "Workouts",
  training_plan: "Training Plan",
  meal_plan: "Meal Plan",
  meal_logging: "Meal Logging",
  steps_tracking: "Steps Tracking",
  goals: "Goals",
  check_ins: "Check-ins",
  coach_notes: "Coach Notes Visibility",
  tasks: "Tasks / Todos",
};

function statusTone(status: "active" | "blocked" | "removed" | null) {
  if (status === "active") return "border-chart-2/40 bg-chart-2/10 text-chart-2";
  if (status === "blocked") return "border-chart-4/40 bg-chart-4/10 text-chart-4";
  if (status === "removed") return "border-destructive/40 bg-destructive/10 text-destructive";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

export function ClientAccessControl({ clientId }: { clientId: string }) {
  const clientQuery = useQuery({
    queryKey: coachKeys.clientDetail(clientId),
    queryFn: () => listClientDetailAction(clientId),
    enabled: Boolean(clientId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const settingsQuery = useCoachClientPortalSettings(clientId);
  const mutations = useCoachClientPortalMutations(clientId);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    if (settingsQuery.data?.username) {
      setUsername(settingsQuery.data.username);
    }
  }, [settingsQuery.data?.username]);

  const moduleAccessByKey = useMemo(() => {
    const map = new Map<ClientModuleKey, "disabled" | "read_only" | "enabled">();
    for (const row of settingsQuery.data?.module_access || []) {
      map.set(row.module_key, row.access_level);
    }
    return map;
  }, [settingsQuery.data?.module_access]);

  const loading = clientQuery.isLoading || settingsQuery.isLoading;

  if (loading && !clientQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data?.client) {
    return (
      <div className="glass-surface surface-pad text-sm text-destructive">
        {clientQuery.error instanceof Error ? clientQuery.error.message : "Unable to load client access settings"}
      </div>
    );
  }

  const client = clientQuery.data.client;
  const displayName = client.display_name || `${client.first_name} ${client.last_name || ""}`.trim();
  const portalStatus = settingsQuery.data?.status || null;

  const saveCredentials = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("Username and password are required.");
      return;
    }

    try {
      await mutations.setCredentials.mutateAsync({
        client_id: clientId,
        username: username.trim(),
        password,
      });
      setPassword("");
      toast.success("Client portal credentials saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save credentials");
    }
  };

  const updateUsername = async () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }

    try {
      await mutations.changeUsername.mutateAsync({
        client_id: clientId,
        username: username.trim(),
      });
      toast.success("Username updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update username");
    }
  };

  const applyPasswordReset = async () => {
    if (!resetPassword.trim()) {
      toast.error("New password is required.");
      return;
    }

    try {
      await mutations.resetPassword.mutateAsync({
        client_id: clientId,
        new_password: resetPassword,
      });
      setResetPassword("");
      toast.success("Portal password reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    }
  };

  const updateModuleAccess = async (
    moduleKey: ClientModuleKey,
    accessLevel: "disabled" | "read_only" | "enabled"
  ) => {
    try {
      await mutations.updateModuleAccess.mutateAsync({
        client_id: clientId,
        module_key: moduleKey,
        access_level: accessLevel,
      });
      toast.success(`${MODULE_LABELS[moduleKey]} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update module access");
    }
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="glass-surface surface-pad">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{displayName} • Access Control</h1>
            <p className="text-sm text-muted-foreground">Configure client portal credentials and module-level visibility.</p>
          </div>

          <div className={cn("rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em]", statusTone(portalStatus))}>
            Portal status: {portalStatus || "not configured"}
          </div>
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-chart-2" />
          <h2 className="text-lg font-semibold">Credentials</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="accent-strong rounded-xl" onClick={() => void saveCredentials()} disabled={mutations.setCredentials.isPending}>
            {mutations.setCredentials.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Credentials
          </Button>
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void updateUsername()} disabled={mutations.changeUsername.isPending}>
            {mutations.changeUsername.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Change Username
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Reset Password</Label>
            <Input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" placeholder="Set temporary or new password" />
          </div>
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => void applyPasswordReset()} disabled={mutations.resetPassword.isPending}>
            {mutations.resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset Password
          </Button>
        </div>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Access actions
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl border-chart-4/40 bg-chart-4/10 text-chart-4 hover:bg-chart-4/20" onClick={() => void mutations.blockAccess.mutateAsync(clientId).then(() => toast.success("Client access blocked")).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to block access"))} disabled={mutations.blockAccess.isPending}>
              {mutations.blockAccess.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Block Access
            </Button>
            <Button variant="outline" className="rounded-xl border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20" onClick={() => void mutations.removeAccess.mutateAsync(clientId).then(() => toast.success("Client portal access removed")).catch((error) => toast.error(error instanceof Error ? error.message : "Unable to remove access"))} disabled={mutations.removeAccess.isPending}>
              {mutations.removeAccess.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Remove Access
            </Button>
          </div>
        </div>
      </section>

      <section className="glass-surface surface-pad space-y-3">
        <h2 className="text-lg font-semibold">Feature Access</h2>
        <div className="space-y-2">
          {CLIENT_MODULE_KEYS.map((moduleKey) => {
            const value = moduleAccessByKey.get(moduleKey) || "enabled";
            return (
              <div key={moduleKey} className="glass-subtle flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{MODULE_LABELS[moduleKey]}</p>
                  <p className="text-xs text-muted-foreground">Set visibility and edit permissions for this module.</p>
                </div>

                <Select value={value} onValueChange={(next) => void updateModuleAccess(moduleKey, next as "disabled" | "read_only" | "enabled") }>
                  <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20 md:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="read_only">Read only</SelectItem>
                    <SelectItem value="enabled">Enabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
