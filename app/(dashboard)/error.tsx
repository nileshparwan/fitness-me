"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard boundary error:", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-2xl font-semibold">Dashboard failed to load</h2>
      <p className="text-muted-foreground">Try again or refresh the page.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Go to Dashboard
        </Button>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
