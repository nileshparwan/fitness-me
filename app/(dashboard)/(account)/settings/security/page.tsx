import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSettingsProfile } from "@/app/actions/settings";
import { SecuritySettingsPanel } from "@/components/settings/security-settings-panel";
import { SettingsSectionSkeleton } from "@/components/settings/settings-section-skeleton";

async function SecuritySettingsSection() {
  let profile;
  try {
    profile = await getSettingsProfile();
    if (!profile.email) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return <SecuritySettingsPanel email={profile.email} hasEmailIdentity={profile.has_email_identity} />;
}

export default function SettingsSecurityPage() {
  return (
    <Suspense fallback={<SettingsSectionSkeleton />}>
      <SecuritySettingsSection />
    </Suspense>
  );
}
