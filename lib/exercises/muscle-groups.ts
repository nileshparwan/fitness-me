const FOCUS_ORDER = ["push", "pull", "legs", "core"] as const;

export type ExerciseMuscleFocus = (typeof FOCUS_ORDER)[number];

function normalizeToken(value: string | null | undefined) {
  const compact = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!compact) return "";
  return compact;
}

function normalizeMuscleGroups(values: string[] | null | undefined) {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const entry of values || []) {
    const token = normalizeToken(entry);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    normalized.push(token);
  }
  return normalized;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function extractMuscleFocusTag({
  muscleGroups,
}: {
  muscleGroups?: string[] | null;
}): ExerciseMuscleFocus | null {
  const normalizedMuscles = new Set(normalizeMuscleGroups(muscleGroups));
  for (const focus of FOCUS_ORDER) {
    if (normalizedMuscles.has(focus)) {
      return focus;
    }
  }
  return null;
}

export function hasMuscleFocusTag(muscleGroups: string[] | null | undefined) {
  return extractMuscleFocusTag({ muscleGroups }) !== null;
}

export function formatCategoryWithMuscleFocus({
  category,
  muscleGroups,
}: {
  category?: string | null;
  muscleGroups?: string[] | null;
}) {
  const focus = extractMuscleFocusTag({ muscleGroups });
  const baseCategory = (category || "").trim() || "General";
  if (!focus) return baseCategory;

  const focusLabel = titleCase(focus);
  if (baseCategory.toLowerCase().includes(focus)) return baseCategory;
  return `${baseCategory} · ${focusLabel}`;
}

export function withParentMuscleGroups(muscleGroups: string[] | null | undefined, category: string | null | undefined) {
  void category;
  return normalizeMuscleGroups(muscleGroups);
}
