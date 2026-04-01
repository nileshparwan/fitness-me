import type { NutritionSubject } from "@/lib/query-keys-nutrition";
import type { NutritionSubjectType } from "@/stores/use-nutrition-ui-store";

export function resolveNutritionSubject(subjectType: NutritionSubjectType, subjectId: string | null): NutritionSubject | undefined {
  if (!subjectId || subjectType === "self") return undefined;
  if (subjectType === "client") return { subject_client_id: subjectId };
  return { subject_user_id: subjectId };
}
