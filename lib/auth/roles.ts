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

  if (!profile) return null;

  return {
    userId: user.id,
    role: profile.role,
    isSysAdmin: profile.role === "sysadmin",
    profile,
  };
});
