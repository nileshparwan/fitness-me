"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateDisplayPreferences, type SettingsProfilePayload } from "@/app/actions/settings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { useSettingsStore } from "@/stores/use-settings-store";

type DisplaySettingsFormProps = {
  profile: SettingsProfilePayload;
};

export function DisplaySettingsForm({ profile }: DisplaySettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const hydrated = useSettingsStore((state) => state.hydrated);
  const compactMode = useSettingsStore((state) => state.compact_mode);
  const setCompactMode = useSettingsStore((state) => state.setCompactMode);

  const value = hydrated ? compactMode : profile.compact_mode;

  return (
    <section className="native-surface surface-pad stack-gap">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground">Adjust how dense the workspace layout should feel.</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="space-y-1">
          <Label>Compact Mode</Label>
          <p className="text-xs text-muted-foreground">Reduce spacing for a denser layout.</p>
        </div>
        <Switch
          aria-label="Compact mode"
          checked={Boolean(value)}
          disabled={isPending}
          onCheckedChange={(checked) => {
            setCompactMode(checked);
            startTransition(async () => {
              const result = await withToastFeedback(updateDisplayPreferences({ compact_mode: checked }), {
                loading: "Updating display preference...",
                success: "Display preference updated",
                error: "Unable to update display preference",
              }).catch(() => null);
              if (!result) setCompactMode(!checked);
            });
          }}
        />
      </div>
    </section>
  );
}
