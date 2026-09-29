"use client";

import { Suspense } from "react";

import { CycleTabContent } from "@/components/cycle/cycle-tab-content";
import { CycleTabSkeleton } from "@/app/(dashboard)/(insights)/progress/_components/progress-section-skeletons";

export function CycleTab() {
  return (
    <Suspense fallback={<CycleTabSkeleton />}>
      <CycleTabContent />
    </Suspense>
  );
}

