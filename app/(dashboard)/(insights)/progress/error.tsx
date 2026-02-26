"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProgressError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Progress page error:", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[55vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-xl font-semibold">Progress data is temporarily unavailable</h2>
      <p className="text-sm text-muted-foreground">We could not load your progress insights right now.</p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
