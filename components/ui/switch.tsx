"use client";

import * as React from "react";
import { cn } from "@/utils";

type SwitchProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Switch({ checked = false, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary border-primary" : "bg-muted border-border",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
