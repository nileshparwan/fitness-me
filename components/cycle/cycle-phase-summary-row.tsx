"use client";

import { ActivitySquare } from "lucide-react";

import type { MenstrualCycleRow } from "@/app/actions/menstrual-cycles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCyclePhase, getDaysUntilNextPeriod } from "@/utils/cycle-phase";
import { cn } from "@/utils";

const PHASE_TONE: Record<string, string> = {
  menstrual: "border-rose-300/30 bg-rose-500/10 text-rose-200",
  follicular: "border-sky-300/30 bg-sky-500/10 text-sky-200",
  ovulatory: "border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
  luteal: "border-amber-300/30 bg-amber-500/10 text-amber-100",
};

type CyclePhaseSummaryRowProps = {
  latestCycle: MenstrualCycleRow | null;
  onLogRequested?: () => void;
  className?: string;
};

export function CyclePhaseSummaryRow({
  latestCycle,
  onLogRequested,
  className,
}: CyclePhaseSummaryRowProps) {
  if (!latestCycle) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-[14px] border border-dashed border-border/60 bg-card/60 p-4 md:flex-row md:items-center md:justify-between",
          className
        )}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No cycles logged yet</p>
          <p className="text-xs text-muted-foreground">
            Log your first cycle to start seeing phase context and history.
          </p>
        </div>
        {onLogRequested ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-[10px]"
            onClick={onLogRequested}
          >
            Log Period
          </Button>
        ) : null}
      </div>
    );
  }

  const cycleLength = latestCycle.cycle_length_days || 28;
  const phase = getCyclePhase(latestCycle.period_start_date, cycleLength);
  const daysUntilNextPeriod = getDaysUntilNextPeriod(
    latestCycle.period_start_date,
    cycleLength
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[14px] border border-border/60 bg-card/70 p-4 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          className={cn(
            "rounded-full border px-3 py-1 capitalize",
            PHASE_TONE[phase.phase] ?? PHASE_TONE.follicular
          )}
        >
          {phase.phase}
        </Badge>
        <span className="text-sm font-medium text-foreground">
          Day {phase.day} of cycle
        </span>
        <span className="text-sm text-muted-foreground">
          Next period in {daysUntilNextPeriod} day
          {daysUntilNextPeriod === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ActivitySquare className="h-3.5 w-3.5" />
        <span>{phase.tip}</span>
      </div>
    </div>
  );
}
