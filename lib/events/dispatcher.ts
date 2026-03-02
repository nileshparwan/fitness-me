import "server-only";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type { AppEventName, EventPayload, EventStatus } from "@/types/events";

function toJsonObject(payload: EventPayload, status: EventStatus): Json {
  return {
    status,
    ...payload,
  } as Json;
}

export function trackEvent(
  eventName: AppEventName | string,
  payload: EventPayload = {},
  status: EventStatus
) {
  const execute = async () => {
    try {
      const admin = createAdminClient();
      const userId = typeof payload.user_id === "string" ? payload.user_id : null;
      const pagePath = typeof payload.page_path === "string" ? payload.page_path : null;

      await admin.from("analytics_events").insert({
        event_name: String(eventName),
        user_id: userId,
        page_path: pagePath,
        metadata: toJsonObject(payload, status),
      });
    } catch (error) {
      console.error("trackEvent_failed", {
        eventName,
        status,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  };

  try {
    after(async () => {
      await execute();
    });
  } catch {
    // Fallback for runtimes where `after` is unavailable.
    void execute();
  }
}

type RunTrackedActionOptions<T> = {
  eventName: AppEventName | string;
  payload?: EventPayload;
  action: () => Promise<T>;
};

function isReadOnlyEvent(eventName: AppEventName | string) {
  const name = String(eventName).toLowerCase();
  return (
    name.includes(".read") ||
    name.includes(".list") ||
    name.includes(".detail")
  );
}

export async function runTrackedAction<T>({
  eventName,
  payload = {},
  action,
}: RunTrackedActionOptions<T>): Promise<T> {
  const shouldTrack = !isReadOnlyEvent(eventName);

  try {
    const result = await action();
    if (shouldTrack) {
      trackEvent(eventName, payload, "success");
    }
    return result;
  } catch (error) {
    if (shouldTrack) {
      trackEvent(
        eventName,
        {
          ...payload,
          error_message: error instanceof Error ? error.message : "unknown_error",
        },
        "error"
      );
    }
    throw error;
  }
}
