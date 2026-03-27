"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { NutritionProgressData } from "@/types/nutrition-progress";
import { LOGGING_LEVEL_COLORS, PANEL_CLASS } from "./_constants";
import { formatTableDate } from "./_shared";
import { cn } from "@/utils";

export function LoggingCalendar({ data }: { data: NutritionProgressData }) {
  if (data.days_in_range < 14) return null;

  return (
    <TooltipProvider>
      <section className={cn(PANEL_CLASS, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Logging Calendar</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_on_target }}
              />
              On target
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_off_target }}
              />
              Off target
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-[#cf8b2e]"
                style={{
                  backgroundColor: LOGGING_LEVEL_COLORS.partial_log,
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 4px)",
                }}
              />
              Partial log
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LOGGING_LEVEL_COLORS.logged_no_target }}
              />
              Logged no target
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LOGGING_LEVEL_COLORS.not_logged }}
              />
              Not logged
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.daily_compliance.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-5 w-5 rounded-sm border transition-opacity hover:opacity-85",
                    day.level === "partial_log" ? "border-[#cf8b2e]" : "border-white/10"
                  )}
                  style={{
                    backgroundColor: LOGGING_LEVEL_COLORS[day.level],
                    backgroundImage:
                      day.level === "partial_log"
                        ? "repeating-linear-gradient(135deg, rgba(255,255,255,0.2) 0 2px, transparent 2px 4px)"
                        : undefined,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{formatTableDate(day.date)}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {day.level.replace(/_/g, " ")}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{data.perfect_days} perfect days</span>
          <span>·</span>
          <span>Best streak: {data.longest_streak} days</span>
        </div>
      </section>
    </TooltipProvider>
  );
}
