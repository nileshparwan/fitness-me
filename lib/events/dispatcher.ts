import "server-only";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  getSuccessPayload?: (result: T) => EventPayload;
  getErrorPayload?: (error: unknown) => EventPayload;
};

function isReadOnlyEvent(eventName: AppEventName | string) {
  const name = String(eventName).toLowerCase();
  const readOnlyTokens = [
    ".read",
    ".list",
    ".detail",
    ".recent",
    ".favorites",
    ".summary",
    ".options",
    ".assignable-subjects",
  ];
  return (
    readOnlyTokens.some((token) => name.includes(token))
  );
}

async function withActorUserId(payload: EventPayload): Promise<EventPayload> {
  if (typeof payload.user_id === "string" && payload.user_id.trim().length > 0) {
    return payload;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      return {
        ...payload,
        user_id: user.id,
      };
    }
  } catch {
    // Best-effort enrichment: keep original payload if actor cannot be resolved.
  }

  return payload;
}

export async function runTrackedAction<T>({
  eventName,
  payload = {},
  action,
  getSuccessPayload,
  getErrorPayload,
}: RunTrackedActionOptions<T>): Promise<T> {
  const shouldTrack = !isReadOnlyEvent(eventName);
  const trackedPayload = shouldTrack ? await withActorUserId(payload) : payload;

  try {
    const result = await action();
    if (shouldTrack) {
      let successPayload: EventPayload = {};
      if (getSuccessPayload) {
        try {
          successPayload = getSuccessPayload(result);
        } catch {
          successPayload = {};
        }
      }
      trackEvent(eventName, { ...trackedPayload, ...successPayload }, "success");
    }
    return result;
  } catch (error) {
    if (shouldTrack) {
      let failurePayload: EventPayload = {};
      if (getErrorPayload) {
        try {
          failurePayload = getErrorPayload(error);
        } catch {
          failurePayload = {};
        }
      }
      trackEvent(
        eventName,
        {
          ...trackedPayload,
          ...failurePayload,
          error_message: error instanceof Error ? error.message : "unknown_error",
        },
        "error"
      );
    }
    throw error;
  }
}
