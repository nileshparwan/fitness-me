"use client";

import { useEffect } from "react";

import { getSettingsProfile } from "@/app/actions/settings";
import { useSettingsStore } from "@/stores/use-settings-store";

const STALE_AFTER_MS = 5 * 60 * 1000;

export function SettingsHydrator() {
  const hydrated = useSettingsStore((state) => state.hydrated);
  const lastSyncedAt = useSettingsStore((state) => state.last_synced_at);
  const hydrate = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const isStale = !lastSyncedAt || now - lastSyncedAt > STALE_AFTER_MS;
    if (hydrated && !isStale) return;

    void (async () => {
      try {
        const profile = await getSettingsProfile();
        if (cancelled) return;
        hydrate({
          preferred_units: profile.preferred_units,
          default_macros: {
            calories: profile.default_calories,
            protein: profile.default_protein,
            carbs: profile.default_carbs,
            fat: profile.default_fat,
          },
          compact_mode: profile.compact_mode,
        });
      } catch {
        // Keep cached values; pages that need hard guarantees fetch on the server.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrate, hydrated, lastSyncedAt]);

  return null;
}
