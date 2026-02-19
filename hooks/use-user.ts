"use client";

import { createClient } from "@/lib/supabase/client";
import { ProfileFormValues } from "@/lib/validations/settings";
import { useQuery } from "@tanstack/react-query";

export function useUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Type-safe metadata wrapper
      // We cast user_metadata to your TS type for autocomplete in components
      const metadata = user.user_metadata as ProfileFormValues;

      return { 
        ...user, 
        // You can expose metadata directly, or flatten it if you prefer
        profile: metadata 
      };
    },
    staleTime: Infinity,
  });
}