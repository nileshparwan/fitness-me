"use server";

import { createClient } from "@/lib/supabase/server";

export const logoutUser = async () => {
    const supabase = await createClient()
    await supabase.auth.signOut()
}