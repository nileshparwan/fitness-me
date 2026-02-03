"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function trackEvent(eventName: string, page_path: string = "", metadata: Record<string, any> = {}) {

  // 1. Schedule the database write for AFTER the response is sent
  after(async () => {
    try {
      const supabase = await createClient();

      // This runs in the background
      await supabase.from("analytics_events").insert({
        event_name: eventName,
        metadata: metadata,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        page_path: page_path || ""
      });

      console.log(`[Analytics] Background write success: ${eventName}`);
    } catch (error) {
      console.error(`[Analytics] Background write failed:`, error);
    }
  });

  // 2. Return immediately! 
  // We do not wait for the DB insert above.
  return { success: true };
}