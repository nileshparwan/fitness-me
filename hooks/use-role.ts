"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type AppRole = Database["public"]["Enums"]["user_role"];

type ClientRoleContext = {
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

export function useRole() {
  const supabase = createClient();

  return useQuery<ClientRoleContext | null>({
    queryKey: ["role-context"],
    queryFn: async () => {
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
      const role = profile?.role ?? inferLegacyRole(user as { app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null; });

      return {
        userId: user.id,
        role,
        isSysAdmin: role === "sysadmin",
        profile,
      };
    },
    staleTime: 60_000,
  });
}
