"use server";

import { runTrackedAction } from "@/lib/events/dispatcher";
import { createClient } from "@/lib/supabase/server";
import { computeAgeFromBirthDate, computeBodyHealthMetrics, type BodyHealthMetrics } from "@/lib/calculations/body-health";

type BodyHealthSubject = {
  subject_user_id?: string | null;
  subject_client_id?: string | null;
};

function applySubject<T>(query: T, subjectUserId: string | null, subjectClientId: string | null) {
  const builder = query as unknown as {
    eq: (column: string, value: unknown) => { is: (column: string, value: null) => unknown };
  };

  if (subjectUserId) {
    return builder.eq("subject_user_id", subjectUserId).is("subject_client_id", null) as T;
  }

  return builder.eq("subject_client_id", subjectClientId).is("subject_user_id", null) as T;
}

export async function getBodyHealthMetrics(
  subject?: BodyHealthSubject
): Promise<BodyHealthMetrics | null> {
  return runTrackedAction({
    eventName: "body.health.metrics.read",
    payload: {
      has_subject_user_id: Boolean(subject?.subject_user_id),
      has_subject_client_id: Boolean(subject?.subject_client_id),
    },
    action: async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const subjectUserId = subject?.subject_user_id ?? (subject?.subject_client_id ? null : user.id);
      const subjectClientId = subject?.subject_client_id ?? null;

      const profileTargetId = subjectUserId ?? user.id;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("date_of_birth, height, gender")
        .eq("id", profileTargetId)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);

      const measurementQuery = applySubject(
        supabase
          .from("measurements")
          .select("date, weight")
          .order("date", { ascending: false })
          .limit(1),
        subjectUserId,
        subjectClientId
      );
      const { data: measurements, error: measurementError } = await measurementQuery;
      if (measurementError) throw new Error(measurementError.message);

      const latestWeight = measurements?.[0]?.weight ?? null;
      const age = computeAgeFromBirthDate(profile?.date_of_birth ?? null);
      const metrics = computeBodyHealthMetrics({
        gender: profile?.gender ?? null,
        age,
        height_cm: profile?.height ?? null,
        weight_kg: latestWeight,
        activity_level: "moderate",
      });

      if (
        metrics.bmi === null &&
        metrics.bmr === null &&
        metrics.tdee === null &&
        metrics.ideal_body_weight_kg === null
      ) {
        return null;
      }

      return metrics;
    },
  });
}
