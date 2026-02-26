import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const metadataRole =
    typeof user.user_metadata?.role === "string"
      ? String(user.user_metadata.role).toLowerCase()
      : null;

  const allowed = metadataRole === "admin";

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return { supabase, user };
}
