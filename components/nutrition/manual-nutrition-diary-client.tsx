"use client";

import { useEffect, useState } from "react";

import { ManualNutritionDiarySkeleton } from "@/components/nutrition/manual-nutrition-diary-skeleton";
import { ManualNutritionDiary } from "@/components/nutrition/manual-nutrition-diary";

export function ManualNutritionDiaryClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <ManualNutritionDiarySkeleton />;
  }

  return <ManualNutritionDiary />;
}
