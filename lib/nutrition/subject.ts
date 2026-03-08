import type { NutritionSubject } from "@/lib/query-keys-nutrition";

type NutritionSubjectType = "self" | "user" | "client";

export function resolveNutritionSubject(subjectType: NutritionSubjectType, subjectId: string | null): NutritionSubject | undefined {
  if (!subjectId || subjectType === "self") return undefined;
  if (subjectType === "client") return { subject_client_id: subjectId };
  return { subject_user_id: subjectId };
}
