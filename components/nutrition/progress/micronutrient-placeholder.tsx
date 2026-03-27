"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PANEL_CLASS } from "./_constants";
import { cn } from "@/utils";

export function MicronutrientPlaceholder() {
  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Micronutrient Tracking</h2>
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-5">
        <p className="text-sm text-muted-foreground">
          Supplements are handled as informational assignments per workout and nutrition program.
          Manage stacks from supplements to keep this view aligned.
        </p>
        <div className="mt-3">
          <Button asChild className="accent-strong rounded-xl">
            <Link href="/supplements/assigned">Manage supplements</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
