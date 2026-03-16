import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSettingsProfile } from "@/app/actions/settings";
import { DisplaySettingsForm } from "@/components/settings/display-settings-form";
import { SettingsSectionSkeleton } from "@/components/settings/settings-section-skeleton";

async function DisplaySettingsSection() {
  let profile;
  try {
    profile = await getSettingsProfile();
  } catch {
    redirect("/login");
  }

  return <DisplaySettingsForm profile={profile} />;
}

export default function SettingsDisplayPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <DisplaySettingsSection />
    </Suspense>
  );
}
