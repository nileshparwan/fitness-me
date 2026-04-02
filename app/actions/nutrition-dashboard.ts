"use server";

import { z } from "zod";

import { runTrackedAction } from "@/lib/events/dispatcher";
import {
  activityMetadataObject,
  activityMetadataString,
  classifyNutritionActivityType,
  describeNutritionActivity,
  NUTRITION_DASHBOARD_ACTIVITY_EVENTS,
  shouldIncludeNutritionActivityForScope,
} from "@/lib/nutrition/dashboard-activity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Json, Database } from "@/types/database";

type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];

const subjectSchema = z
  .object({
    subject_user_id: z.string().uuid().nullable().optional(),
    subject_client_id: z.string().uuid().nullable().optional(),
  })
  .optional();

const listActivitySchema = z.object({
  limit: z.number().int().min(1).max(10).default(10),
  subject: subjectSchema,
  nutrition_plan_id: z.string().uuid().optional(),
});

type NutritionDashboardActivityType = "meal" | "assignment" | "group" | "progress" | "client";

type NutritionDashboardActivityRow = {
  id: string;
  event_name: string;
  type: NutritionDashboardActivityType;
  text: string;
  created_at: string;
  user_id: string | null;
  subject_user_id: string | null;
  subject_client_id: string | null;
  metadata: Json | null;
};

export async function listNutritionDashboardActivityAction(input: z.input<typeof listActivitySchema>): Promise<NutritionDashboardActivityRow[]> {
  const payload = listActivitySchema.parse(input);
  return runTrackedAction({
    eventName: "nutrition.dashboard.activity.list",
    payload: {
      limit: payload.limit,
      subject_client_id: payload.subject?.subject_client_id ?? null,
      subject_user_id: payload.subject?.subject_user_id ?? null,
      nutrition_plan_id: payload.nutrition_plan_id ?? null,
    },
    action: async () => {
      const supabase = await createClient();
      const admin = createAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const fetchLimit = Math.max(payload.limit, 20);
      const { data, error } = await admin
        .from("analytics_events")
        .select("*")
        .eq("user_id", user.id)
        .in("event_name", [...NUTRITION_DASHBOARD_ACTIVITY_EVENTS])
        .or("metadata.is.null,metadata->status.is.null,metadata->>status.eq.success")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      if (error) throw new Error(error.message);

      const rows = (data || []) as AnalyticsEventRow[];
      const filtered: NutritionDashboardActivityRow[] = [];

      for (const row of rows) {
        if (!row.created_at) continue;
        const metadata = activityMetadataObject(row.metadata);

        const eventSubject = {
          subject_user_id: activityMetadataString(metadata, "subject_user_id"),
          subject_client_id: activityMetadataString(metadata, "subject_client_id") || activityMetadataString(metadata, "client_id"),
          nutrition_plan_id: activityMetadataString(metadata, "nutrition_plan_id"),
        };
        if (!shouldIncludeNutritionActivityForScope(eventSubject, { ...payload.subject, nutrition_plan_id: payload.nutrition_plan_id })) continue;

        filtered.push({
          id: row.id,
          event_name: row.event_name,
          type: classifyNutritionActivityType(row.event_name),
          text: describeNutritionActivity(row.event_name, metadata),
          created_at: row.created_at,
          user_id: row.user_id,
          subject_user_id: eventSubject.subject_user_id,
          subject_client_id: eventSubject.subject_client_id,
          metadata: row.metadata,
        });

        if (filtered.length >= payload.limit) {
          break;
        }
      }

      return filtered;
    },
  });
}
