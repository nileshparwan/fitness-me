"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/utils";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  max?: number;
  animateOnMount?: boolean;
  animationDurationMs?: number;
};

function Progress({
  className,
  indicatorClassName,
  value = 0,
  max = 100,
  animateOnMount = true,
  animationDurationMs = 900,
  ...props
}: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const safeValue = Math.max(0, Math.min(numericValue, safeMax));
  const targetPercent = (safeValue / safeMax) * 100;
  const [displayPercent, setDisplayPercent] = React.useState(animateOnMount ? 0 : targetPercent);

  React.useEffect(() => {
    if (!animateOnMount) {
      setDisplayPercent(targetPercent);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setDisplayPercent(targetPercent);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [animateOnMount, targetPercent]);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted/70", className)}
      value={safeValue}
      max={safeMax}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("h-full rounded-full bg-primary transition-[width] ease-out motion-reduce:transition-none", indicatorClassName)}
        style={{
          width: `${displayPercent}%`,
          transitionDuration: `${animationDurationMs}ms`,
        }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
