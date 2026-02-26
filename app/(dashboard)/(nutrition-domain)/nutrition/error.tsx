"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function NutritionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Nutrition page error:", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-xl font-semibold">Nutrition module failed to load</h2>
      <p className="text-sm text-muted-foreground">Please retry or reopen this page.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
