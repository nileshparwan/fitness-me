const PARENT_GROUP_ORDER = ["chest", "back", "legs", "shoulders", "arms", "core", "glutes", "cardio"] as const;
type ParentGroup = (typeof PARENT_GROUP_ORDER)[number];

const TAG_ALIASES: Record<string, string> = {
  quad: "quads",
  leg: "legs",
  shoulder: "shoulders",
  arm: "arms",
  ab: "abs",
  lat: "lats",
  delt: "delts",
};

const MAIN_GROUP_CANDIDATES_BY_TAG: Record<string, ParentGroup[]> = {
  chest: ["chest"],
  upper_chest: ["chest"],
  lower_chest: ["chest"],
  pecs: ["chest"],
  pectorals: ["chest"],

  back: ["back"],
  upper_back: ["back"],
  lower_back: ["back"],
  lats: ["back"],
  traps: ["back"],
  rhomboids: ["back"],
  erectors: ["back"],

  shoulders: ["shoulders"],
  front_delts: ["shoulders"],
  side_delts: ["shoulders"],
  rear_delts: ["shoulders"],
  delts: ["shoulders"],
  rotator_cuff: ["shoulders"],

  arms: ["arms"],
  biceps: ["arms"],
  triceps: ["arms"],
  forearms: ["arms"],
  brachialis: ["arms"],

  legs: ["legs"],
  quads: ["legs"],
  hamstrings: ["legs"],
  calves: ["legs"],
  adductors: ["legs"],
  abductors: ["legs"],
  hip_flexors: ["legs"],
  glutes: ["legs", "glutes"],

  core: ["core"],
  abs: ["core"],
  obliques: ["core"],
  lower_abs: ["core"],
  transverse_abdominis: ["core"],

  cardio: ["cardio"],
  cardiovascular: ["cardio"],
  conditioning: ["cardio"],
  endurance: ["cardio"],
  coordination: ["cardio"],
};

function normalizeToken(value: string | null | undefined) {
  const compact = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!compact) return "";
  return TAG_ALIASES[compact] || compact;
}

export function withParentMuscleGroups(muscleGroups: string[] | null | undefined, category: string | null | undefined) {
  const normalizedMuscles: string[] = [];
  const seenMuscles = new Set<string>();

  for (const entry of muscleGroups || []) {
    const normalized = normalizeToken(entry);
    if (!normalized || seenMuscles.has(normalized)) continue;
    seenMuscles.add(normalized);
    normalizedMuscles.push(normalized);
  }

  const normalizedCategory = normalizeToken(category);
  let mainGroup: ParentGroup | null = null;

  if ((PARENT_GROUP_ORDER as readonly string[]).includes(normalizedCategory)) {
    mainGroup = normalizedCategory as ParentGroup;
  } else {
    const candidates = new Set<ParentGroup>();
    for (const muscle of normalizedMuscles) {
      for (const candidate of MAIN_GROUP_CANDIDATES_BY_TAG[muscle] || []) {
        candidates.add(candidate);
      }
    }
    mainGroup = PARENT_GROUP_ORDER.find((group) => candidates.has(group)) || null;
  }

  if (!mainGroup) return normalizedMuscles;
  const remainder = normalizedMuscles.filter((muscle) => muscle !== mainGroup);
  return [mainGroup, ...remainder];
}
