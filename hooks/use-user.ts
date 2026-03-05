"use client";

import { createClient } from "@/lib/supabase/client";
import { ProfileFormValues } from "@/lib/validations/settings";
import { useQuery } from "@tanstack/react-query";
import { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const profile = (profileData || null) as ProfileRow | null;

      // Type-safe metadata wrapper
      // We cast user_metadata to your TS type for autocomplete in components
      const metadata = user.user_metadata as ProfileFormValues;

      return { 
        ...user, 
        // You can expose metadata directly, or flatten it if you prefer
        profile,
        metadata,
      };
    },
    staleTime: Infinity,
  });
}
