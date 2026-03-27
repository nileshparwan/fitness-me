"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  upsertNotificationPreferencesAction,
  type NotificationPreferencesInput,
} from "@/app/actions/notification-preferences";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

function getDefaultValues(initialValues: NotificationPreferencesInput | null): NotificationPreferencesInput {
  const defaults: NotificationPreferencesInput = {
    timezone: "UTC",
    meal_bell_enabled: true,
    meal_push_enabled: false,
    meal_reminder_time: "12:00",
    checkin_bell_enabled: true,
    checkin_push_enabled: false,
    checkin_reminder_time: "08:00",
    goal_bell_enabled: true,
    goal_push_enabled: false,
    goal_reminder_time: "09:00",
    cycle_bell_enabled: true,
    cycle_push_enabled: false,
    cycle_reminder_days: 2,
  };

  return { ...defaults, ...initialValues };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray;
}

type NotificationSettingsFormProps = {
  initialValues: NotificationPreferencesInput | null;
};

export function NotificationSettingsForm({ initialValues }: NotificationSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<NotificationPreferencesInput>(() => getDefaultValues(initialValues));
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>(["UTC"]);

  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIosMobile, setIsIosMobile] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPending, setPushPending] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    setValues(getDefaultValues(initialValues));
  }, [initialValues]);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const supported =
      typeof Intl.supportedValuesOf === "function"
        ? Array.from(new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]))
        : ["UTC", detectedTimezone];

    setTimezoneOptions(supported.sort((a, b) => a.localeCompare(b)));

    setValues((current) => {
      if (initialValues?.timezone) return current;
      return { ...current, timezone: detectedTimezone };
    });

    const userAgent = navigator.userAgent || "";
    setIsMobileDevice(/Mobi|Android|iPhone|iPad/i.test(userAgent));
    setIsIosMobile(/iPhone|iPad/i.test(userAgent));

    const supportsPush = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supportsPush);

    if (!supportsPush) return;

    void (async () => {
      try {
        if (Notification.permission !== "granted") {
          setPushEnabled(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));
      } catch {
        setPushEnabled(false);
      }
    })();
  }, [initialValues?.timezone]);

  const timezoneSelectOptions = useMemo(() => {
    if (timezoneOptions.includes(values.timezone)) return timezoneOptions;
    return Array.from(new Set([...timezoneOptions, values.timezone])).sort((a, b) => a.localeCompare(b));
  }, [timezoneOptions, values.timezone]);

  const updateField = <K extends keyof NotificationPreferencesInput>(key: K, value: NotificationPreferencesInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const savePreferences = () => {
    startTransition(async () => {
      await withToastFeedback(upsertNotificationPreferencesAction(values), {
        loading: "Saving notification preferences...",
        success: "Notification preferences saved",
        error: "Unable to save notification preferences",
      }).catch(() => null);
    });
  };

  const enablePush = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported on this device/browser.");
      return;
    }

    if (!vapidPublicKey) {
      toast.error("Push notifications are not configured on this environment.");
      return;
    }

    setPushPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Push permission not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const serverKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: serverKey.buffer as ArrayBuffer,
        });
      }

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Unable to subscribe for push notifications.");
      }

      setPushEnabled(true);
      toast.success("Push enabled on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable push notifications.");
    } finally {
      setPushPending(false);
    }
  };

  const disablePush = async () => {
    if (!pushSupported) return;

    setPushPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setPushEnabled(false);
      toast.success("Push disabled on this device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to disable push notifications.");
    } finally {
      setPushPending(false);
    }
  };

  return (
    <section className="native-surface surface-pad stack-gap">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Notifications</h3>
        <p className="text-sm text-muted-foreground">
          Configure bell and push reminders for meal logging, check-ins, and goal follow-ups.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Meal Log Reminder</h4>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Show in notification bell</Label>
          <Switch
            checked={values.meal_bell_enabled}
            onCheckedChange={(checked) => updateField("meal_bell_enabled", checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Mobile push notification</Label>
          <Switch
            checked={values.meal_push_enabled}
            onCheckedChange={(checked) => updateField("meal_push_enabled", checked)}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm">Remind me at</Label>
          <Select value={values.meal_reminder_time} onValueChange={(value) => updateField("meal_reminder_time", value)}>
            <SelectTrigger className="h-10 rounded-[10px] border-border/60 bg-card/70">
              <SelectValue placeholder="Select meal reminder time" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={`meal-${time}`} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Health Check-in Reminder</h4>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Show in notification bell</Label>
          <Switch
            checked={values.checkin_bell_enabled}
            onCheckedChange={(checked) => updateField("checkin_bell_enabled", checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Mobile push notification</Label>
          <Switch
            checked={values.checkin_push_enabled}
            onCheckedChange={(checked) => updateField("checkin_push_enabled", checked)}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm">Remind me at</Label>
          <Select
            value={values.checkin_reminder_time}
            onValueChange={(value) => updateField("checkin_reminder_time", value)}
          >
            <SelectTrigger className="h-10 rounded-[10px] border-border/60 bg-card/70">
              <SelectValue placeholder="Select check-in reminder time" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={`checkin-${time}`} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Goal Check-in Reminder</h4>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Show in notification bell</Label>
          <Switch
            checked={values.goal_bell_enabled}
            onCheckedChange={(checked) => updateField("goal_bell_enabled", checked)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
          <Label className="text-sm">Mobile push notification</Label>
          <Switch
            checked={values.goal_push_enabled}
            onCheckedChange={(checked) => updateField("goal_push_enabled", checked)}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm">Remind me at</Label>
          <Select value={values.goal_reminder_time} onValueChange={(value) => updateField("goal_reminder_time", value)}>
            <SelectTrigger className="h-10 rounded-[10px] border-border/60 bg-card/70">
              <SelectValue placeholder="Select goal reminder time" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={`goal-${time}`} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
          <h4 className="text-sm font-semibold">Cycle Reminders</h4>
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
            <Label className="text-sm">Show in notification bell</Label>
            <Switch
              checked={values.cycle_bell_enabled}
              onCheckedChange={(checked) => updateField("cycle_bell_enabled", checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 px-3 py-2.5">
            <Label className="text-sm">Mobile push notification</Label>
            <Switch
              checked={values.cycle_push_enabled}
              onCheckedChange={(checked) => updateField("cycle_push_enabled", checked)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm">Remind me</Label>
            <Select
              value={String(values.cycle_reminder_days)}
              onValueChange={(value) => updateField("cycle_reminder_days", Number(value))}
            >
              <SelectTrigger className="h-10 rounded-[10px] border-border/60 bg-card/70">
                <SelectValue placeholder="Select reminder interval" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="2">2 days before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="5">5 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Timezone</h4>
        <Label className="text-xs text-muted-foreground">Your reminder schedule runs against this timezone.</Label>
        <Select value={values.timezone} onValueChange={(value) => updateField("timezone", value)}>
          <SelectTrigger className="h-10 rounded-[10px] border-border/60 bg-card/70">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {timezoneSelectOptions.map((timezone) => (
              <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isMobileDevice ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <h4 className="text-sm font-semibold">Mobile Push</h4>
          <p className="text-xs text-muted-foreground">
            Enable push on this device to receive reminders outside the app.
          </p>
          {isIosMobile ? (
            <p className="rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
              On iPhone/iPad, tap Share and add this app to your Home Screen first.
            </p>
          ) : null}

          {!pushSupported ? (
            <p className="text-xs text-muted-foreground">Push is not supported on this browser.</p>
          ) : pushEnabled ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-emerald-500">Push enabled on this device.</p>
              <Button type="button" variant="outline" onClick={() => void disablePush()} disabled={pushPending}>
                {pushPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => void enablePush()} disabled={pushPending || !vapidPublicKey}>
              {pushPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable push on this device"
              )}
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" className="accent-strong rounded-[10px] text-black" onClick={savePreferences} disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </section>
  );
}
