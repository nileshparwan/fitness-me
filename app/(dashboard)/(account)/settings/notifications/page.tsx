import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getNotificationPreferencesAction } from "@/app/actions/notification-preferences";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import { SettingsSectionSkeleton } from "@/components/settings/settings-section-skeleton";

async function NotificationSettingsSection() {
  let preferences;

  try {
    preferences = await getNotificationPreferencesAction();
  } catch {
    redirect("/login");
  }

  return <NotificationSettingsForm initialValues={preferences} />;
}

export default function SettingsNotificationsPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <NotificationSettingsSection />
    </Suspense>
  );
}
