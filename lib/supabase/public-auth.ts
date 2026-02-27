import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export function createPublicAuthClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
