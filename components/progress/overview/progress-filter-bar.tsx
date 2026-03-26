"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PROGRESS_FILTER_RANGE_OPTIONS, PROGRESS_FILTER_TYPE_OPTIONS } from "@/utils/app-constants";
import { cn } from "@/utils";
import type { ProgressRange, ProgressTrainingType } from "@/app/actions/progress-overview";

type Props = {
  range: ProgressRange;
  onRangeChange: (range: ProgressRange) => void;
  trainingType: ProgressTrainingType;
  onTrainingTypeChange: (value: ProgressTrainingType) => void;
  compare: boolean;
  onCompareChange: (value: boolean) => void;
};

export function ProgressFilterBar({
  range,
  onRangeChange,
  trainingType,
  onTrainingTypeChange,
  compare,
  onCompareChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-[10px] border border-white/10 bg-[#131b2f]/85 p-1">
          {PROGRESS_FILTER_RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-[8px] px-3 text-xs font-medium",
                  active
                    ? "bg-[#e65778] text-white hover:bg-[#e65778]"
                    : "text-muted-foreground hover:bg-white/10 hover:text-white"
                )}
                onClick={() => onRangeChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-[8px] text-muted-foreground"
            disabled
            title="Custom range is coming soon"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>

        <Select value={trainingType} onValueChange={(value) => onTrainingTypeChange(value as ProgressTrainingType)}>
          <SelectTrigger className="h-10 w-[180px] rounded-[10px] border-white/10 bg-[#131b2f]/85">
            <SelectValue placeholder="Training type" />
          </SelectTrigger>
          <SelectContent>
            {PROGRESS_FILTER_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={compare} onCheckedChange={onCompareChange} />
        Compare
      </label>
    </div>
  );
}
