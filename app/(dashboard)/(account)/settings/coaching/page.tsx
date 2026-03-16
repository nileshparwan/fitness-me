import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSettingsProfile } from "@/app/actions/settings";
import { CoachingSettingsForm } from "@/components/settings/coaching-settings-form";
import { SettingsSectionSkeleton } from "@/components/settings/settings-section-skeleton";

async function CoachingSettingsSection() {
  let profile;
  try {
    profile = await getSettingsProfile();
  } catch {
    redirect("/login");
  }

  return <CoachingSettingsForm profile={profile} />;
}

export default function SettingsCoachingPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <CoachingSettingsSection />
    </Suspense>
  );
}
