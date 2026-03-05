import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountDangerZone } from "@/components/settings/account-danger-zone";
import { SetPasswordCard } from "@/components/settings/set-password-card";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "sysadmin";
  const providers = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata.providers as unknown[])
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.toLowerCase())
    : [];
  const isSocialOnly = providers.length > 0 && !providers.includes("email");

  return (
    <div className="stack-gap">
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold tracking-tight">Account Security</h3>
        <p className="text-muted-foreground text-sm">
          Manage account recovery, password access, and account deactivation.
        </p>
      </div>

      <SetPasswordCard isSocialOnly={isSocialOnly} />
      <AccountDangerZone isAdmin={isAdmin} />
    </div>
  );
}
