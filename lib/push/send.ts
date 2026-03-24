import webPush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  public_key: string;
  auth_secret: string;
};

let vapidConfigured = false;

function hasVapidEnv() {
  return Boolean(
    process.env.VAPID_SUBJECT &&
      process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
  );
}

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  if (!hasVapidEnv()) {
    throw new Error("Push notifications are not configured: missing VAPID env variables.");
  }

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  vapidConfigured = true;
}

export function isPushConfigured() {
  return hasVapidEnv();
}

/**
 * Returns false when the subscription is stale (410/404) — caller must delete it.
 * Throws on other errors.
 */
export async function sendPushNotification(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<boolean> {
  ensureVapidConfigured();

  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.public_key, auth: sub.auth_secret } },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const status = (error as { statusCode?: number } | null)?.statusCode;
    if (status === 404 || status === 410) return false;
    throw error;
  }
}
