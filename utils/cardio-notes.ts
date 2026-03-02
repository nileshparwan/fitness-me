export type CardioSetMeta = {
  set_number: number;
  duration: number;
  distance?: number;
  reps?: number;
  calories?: number;
  heartRate?: number;
};

const CARDIO_META_REGEX = /^\[\[cardio_sets:([^\]]+)\]\]\s*/;
const LEGACY_COUNT_REGEX = /^\[\[cardio_sets:(\d+)\]\]\s*/;

export function parseCardioNotes(raw: string | null | undefined): {
  notes: string;
  cardioSets?: CardioSetMeta[];
} {
  if (!raw) return { notes: "" };

  const metaMatch = raw.match(CARDIO_META_REGEX);
  if (metaMatch) {
    try {
      const decoded = decodeURIComponent(metaMatch[1]);
      const parsed = JSON.parse(decoded) as CardioSetMeta[];
      const cardioSets = Array.isArray(parsed)
        ? parsed
            .map((set, idx) => ({
              set_number: idx + 1,
              duration: Number(set.duration || 0),
              distance: set.distance === undefined ? undefined : Number(set.distance || 0),
              reps: set.reps === undefined ? undefined : Number(set.reps || 0),
              calories: set.calories === undefined ? undefined : Number(set.calories || 0),
              heartRate: set.heartRate === undefined ? undefined : Number(set.heartRate || 0),
            }))
            .filter((set) => Number.isFinite(set.duration))
        : undefined;
      return {
        notes: raw.replace(CARDIO_META_REGEX, "").trim(),
        cardioSets: cardioSets && cardioSets.length > 0 ? cardioSets : undefined,
      };
    } catch {
      return { notes: raw.replace(CARDIO_META_REGEX, "").trim() };
    }
  }

  const legacyMatch = raw.match(LEGACY_COUNT_REGEX);
  if (legacyMatch) {
    return { notes: raw.replace(LEGACY_COUNT_REGEX, "").trim() };
  }

  return { notes: raw };
}

export function serializeCardioNotes(
  notes: string | undefined,
  cardioSets: CardioSetMeta[] | undefined
): string | null {
  const normalizedNotes = notes?.trim() || "";
  const normalizedSets = (cardioSets || [])
    .map((set, idx) => ({
      set_number: idx + 1,
      duration: Number(set.duration || 0),
      distance: set.distance === undefined ? undefined : Number(set.distance || 0),
      reps: set.reps === undefined ? undefined : Number(set.reps || 0),
      calories: set.calories === undefined ? undefined : Number(set.calories || 0),
      heartRate: set.heartRate === undefined ? undefined : Number(set.heartRate || 0),
    }))
    .filter((set) => Number.isFinite(set.duration));

  const meta = normalizedSets.length
    ? `[[cardio_sets:${encodeURIComponent(JSON.stringify(normalizedSets))}]]`
    : "";

  const content = [meta, normalizedNotes].filter(Boolean).join(" ").trim();
  return content.length > 0 ? content : null;
}
