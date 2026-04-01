"use client";

import * as React from "react";

import { cn } from "@/utils";

type AnimatedFillProps = React.HTMLAttributes<HTMLDivElement> & {
  width: number;
  durationMs?: number;
};

function AnimatedFill({
  width,
  durationMs = 900,
  className,
  style,
  ...props
}: AnimatedFillProps) {
  const targetWidth = Number.isFinite(width) ? Math.max(0, Math.min(width, 100)) : 0;
  const [displayWidth, setDisplayWidth] = React.useState(0);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayWidth(targetWidth);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [targetWidth]);

  return (
    <div
      {...props}
      className={cn("transition-[width] ease-out motion-reduce:transition-none", className)}
      style={{
        ...style,
        width: `${displayWidth}%`,
        transitionDuration: `${durationMs}ms`,
      }}
    />
  );
}

export { AnimatedFill };
