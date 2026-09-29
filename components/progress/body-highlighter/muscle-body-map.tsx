"use client";

import { useMemo, useState } from "react";
import Model, { ModelType, type IExerciseData, type IMuscleStats } from "react-body-highlighter";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { BODY_COLOR_REST, BODY_HIGHLIGHT_COLORS } from "@/lib/calculations/muscle-map";

type BodyMapView = "anterior" | "posterior";

export type MuscleBodyMapProps = {
  data: IExerciseData[];
  showBothViews?: boolean;
  defaultView?: BodyMapView;
  onMuscleClick?: (stats: IMuscleStats) => void;
  highlightedColors?: string[];
  bodyColor?: string;
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
  posteriorMuscles?: string[];
};

const LEGEND = [
  { label: "Low", color: BODY_HIGHLIGHT_COLORS[0] },
  { label: "Medium", color: BODY_HIGHLIGHT_COLORS[1] },
  { label: "High", color: BODY_HIGHLIGHT_COLORS[2] },
];

function formatMuscleLabel(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function MuscleBodyMap({
  data,
  showBothViews = true,
  defaultView = "anterior",
  onMuscleClick,
  highlightedColors = BODY_HIGHLIGHT_COLORS,
  bodyColor = BODY_COLOR_REST,
  className,
  compact = false,
  title,
  description,
  posteriorMuscles = [],
}: MuscleBodyMapProps) {
  const [singleView, setSingleView] = useState<BodyMapView>(defaultView);
  const [selectedMuscle, setSelectedMuscle] = useState<IMuscleStats | null>(null);

  const views = useMemo(() => {
    if (showBothViews) return [ModelType.ANTERIOR, ModelType.POSTERIOR] as const;
    return [singleView === "posterior" ? ModelType.POSTERIOR : ModelType.ANTERIOR] as const;
  }, [showBothViews, singleView]);

  const cardWidthClass = compact ? "w-[140px] md:w-[150px]" : "w-[140px] md:w-[160px] lg:w-[200px]";

  const handleMuscleClick = (stats: IMuscleStats) => {
    setSelectedMuscle(stats);
    onMuscleClick?.(stats);
  };

  return (
    <section className={cn("rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4", className)}>
      {title || description || !showBothViews ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {!showBothViews ? (
            <div className="inline-flex rounded-xl border border-white/10 bg-[#131b2f]/75 p-1">
              <Button
                type="button"
                variant={singleView === "anterior" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-lg px-3"
                onClick={() => setSingleView("anterior")}
              >
                Front
              </Button>
              <Button
                type="button"
                variant={singleView === "posterior" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 rounded-lg px-3"
                onClick={() => setSingleView("posterior")}
              >
                Back
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("mt-4 flex flex-col items-center gap-4 md:flex-row md:justify-center", compact && "md:gap-2")}>
        {views.map((view) => (
          <div
            key={view}
            className={cn(
              "rounded-[14px] border border-white/8 bg-[#131b2f]/65 p-3",
              "rbh [&_polygon:hover]:fill-[hsl(var(--primary)/0.3)]",
              cardWidthClass
            )}
          >
            <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {view === ModelType.ANTERIOR ? "Front" : "Back"}
            </div>
            <Model
              data={data}
              type={view}
              onClick={handleMuscleClick}
              bodyColor={bodyColor}
              highlightedColors={highlightedColors}
              style={{ width: "100%" }}
              svgStyle={{ width: "100%", height: "auto" }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <div key={item.label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {selectedMuscle ? (
        <div className="mt-4 rounded-[14px] border border-white/10 bg-[#131b2f]/75 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{formatMuscleLabel(selectedMuscle.muscle)}</p>
              <p className="text-xs text-muted-foreground">
                {selectedMuscle.data.frequency} session{selectedMuscle.data.frequency === 1 ? "" : "s"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2" onClick={() => setSelectedMuscle(null)}>
              Clear
            </Button>
          </div>
          {selectedMuscle.data.exercises.length > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{selectedMuscle.data.exercises.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
