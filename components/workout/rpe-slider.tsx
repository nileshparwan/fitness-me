"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils";
interface RpeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function RpeSlider({ value, onChange, className }: RpeSliderProps) {
  // Helper to color-code RPE (1-4 Green, 5-7 Yellow, 8-10 Red)
  const getColor = (val: number) => {
    if (val >= 8) return "text-red-500 font-bold";
    if (val >= 5) return "text-yellow-500 font-medium";
    return "text-green-500";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <Label className="text-xs text-muted-foreground">Intensity (RPE)</Label>
        <span className={cn("text-xs", getColor(value))}>
          {value === 0 ? "-" : value} / 10
        </span>
      </div>
      <Slider
        defaultValue={[0]}
        value={[value]}
        max={10}
        step={0.5} // Allow 8.5, 9.5 etc
        onValueChange={(vals) => onChange(vals[0])}
        className="[&_.bg-primary]:bg-muted-foreground/50" // Optional styling tweak
      />
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <span>Easy</span>
        <span>Max</span>
      </div>
    </div>
  );
}