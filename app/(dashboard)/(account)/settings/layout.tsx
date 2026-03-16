import type { Metadata } from "next";

import { SettingsTabNav } from "@/components/settings/settings-tab-nav";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage profile, coaching defaults, display preferences, and security.",
};

type SettingsLayoutProps = {
  children: React.ReactNode;
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="page-shell section-gap pb-16">
      <div className="mx-auto w-full max-w-[800px] space-y-5">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your account and coaching workspace preferences.</p>
        </div>
        <SettingsTabNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
