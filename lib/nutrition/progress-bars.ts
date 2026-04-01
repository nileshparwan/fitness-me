export type NutritionProgressMetric = "calories" | "protein" | "carbs" | "fat";

const FALLBACK_TARGETS: Record<NutritionProgressMetric, number> = {
  calories: 2500,
  protein: 160,
  carbs: 250,
  fat: 80,
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function computeNutritionVisualPercent(args: {
  metric: NutritionProgressMetric;
  value: number;
  target?: number | null;
  explicitPercent?: number | null;
  maxPercent?: number;
}) {
  const maxPercent = args.maxPercent ?? 160;
  if (typeof args.explicitPercent === "number" && Number.isFinite(args.explicitPercent)) {
    return clampInt(args.explicitPercent, 0, maxPercent);
  }

  const baselineTarget =
    typeof args.target === "number" && Number.isFinite(args.target) && args.target > 0
      ? args.target
      : FALLBACK_TARGETS[args.metric];

  if (!baselineTarget || baselineTarget <= 0) return 0;
  return clampInt((Math.max(0, args.value) / baselineTarget) * 100, 0, maxPercent);
}
