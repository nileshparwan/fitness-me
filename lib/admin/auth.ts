import { createClient } from "@/lib/supabase/server";
import { getRoleContext } from "@/lib/auth/roles";

export async function requireAdmin() {
  const context = await getRoleContext();
  if (!context) {
    throw new Error("Unauthorized");
  }
  if (!context.isSysAdmin) {
    throw new Error("Forbidden");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}
