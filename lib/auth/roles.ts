import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["user_role"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type RoleContext = {
  userId: string;
  role: AppRole;
  isSysAdmin: boolean;
  profile: ProfileRow | null;
};

function inferLegacyRole(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): AppRole {
  const appRole =
    typeof user.app_metadata?.role === "string"
      ? String(user.app_metadata.role).toLowerCase()
      : "";
  const userRole =
    typeof user.user_metadata?.role === "string"
      ? String(user.user_metadata.role).toLowerCase()
      : "";

  if (appRole === "admin" || appRole === "sysadmin" || userRole === "admin" || userRole === "sysadmin") {
    return "sysadmin";
  }
  return "user";
}

export const getRoleContext = cache(async (): Promise<RoleContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData || null) as ProfileRow | null;

  if (!profile) {
    const inferredRole = inferLegacyRole(user as { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null; });

    // Best-effort bootstrap for legacy accounts if DB trigger/backfill has not run yet.
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        role: inferredRole,
        full_name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.display_name === "string"
              ? user.user_metadata.display_name
              : null,
      },
      { onConflict: "id" }
    );

    return {
      userId: user.id,
      role: inferredRole,
      isSysAdmin: inferredRole === "sysadmin",
      profile: null,
    };
  }

  return {
    userId: user.id,
    role: profile.role,
    isSysAdmin: profile.role === "sysadmin",
    profile,
  };
});
