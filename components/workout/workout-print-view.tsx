"use client";

import React from "react";
import { format } from "date-fns";
import { 
  Calendar, 
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database } from "@/types/database";
import { parseCardioNotes } from "@/utils/cardio-notes";
import { useUnitLabels, useUnitSystem } from "@/stores/use-settings-store";
import { displayDistance, displayWeight } from "@/utils/unit-conversion";

type WorkoutLog = Database["public"]["Tables"]["workout_sets"]["Row"];
type CardioLog = Database["public"]["Tables"]["workout_cardio"]["Row"];
type Workout = Database["public"]["Tables"]["workouts"]["Row"];

interface PrintViewProps {
  workout: Workout & { user?: { email: string } | null };
  strengthLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
}

export const WorkoutPrintView = React.forwardRef<HTMLDivElement, PrintViewProps>(
  ({ workout, strengthLogs, cardioLogs }, ref) => {
    const system = useUnitSystem();
    const labels = useUnitLabels();
    const strengthGroups = groupStrengthByExercise(strengthLogs);

    type TimelineEntry =
      | {
          type: "strength";
          name: string;
          createdAtMs: number;
          entrySequence: number | null;
          notes?: string;
          sets: WorkoutLog[];
        }
      | {
          type: "cardio";
          name: string;
          createdAtMs: number;
          entrySequence: number | null;
          notes?: string;
          sets: {
            set_number: number;
            duration: number;
            distance?: number;
            reps?: number;
            calories?: number;
            heartRate?: number;
          }[];
        };

    const timeline: TimelineEntry[] = [
      ...strengthGroups.map((group) => ({
        type: "strength" as const,
        name: group.name,
        createdAtMs: group.createdAtMs,
        entrySequence: group.entrySequence,
        notes: group.notes,
        sets: group.sets,
      })),
      ...cardioLogs.map((log) => {
        const parsed = parseCardioNotes(log.notes);
        return {
          type: "cardio" as const,
          name: log.activity_type || "Cardio",
          createdAtMs: log.entry_sequence ?? safeMs(log.created_at),
          entrySequence: log.entry_sequence,
          notes: parsed.notes || undefined,
          sets:
            parsed.cardioSets && parsed.cardioSets.length > 0
              ? parsed.cardioSets
              : [
                  {
                    set_number: 1,
                    duration: log.duration_minutes || 0,
                    distance: log.distance ?? undefined,
                    reps: log.reps ?? undefined,
                    calories: log.calories_burned ?? undefined,
                    heartRate: log.average_heart_rate ?? undefined,
                  },
                ],
        };
      }),
    ].sort((a, b) => {
      if (a.entrySequence !== null && b.entrySequence !== null) {
        return a.entrySequence - b.entrySequence;
      }
      if (a.entrySequence !== null) return -1;
      if (b.entrySequence !== null) return 1;
      return a.createdAtMs - b.createdAtMs;
    });

    return (
      <div 
        ref={ref} 
        className="max-w-3xl mx-auto bg-card text-card-foreground min-h-screen p-8 md:p-12"
      >
        {/* --- HEADER --- */}
        <div className="space-y-6 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight uppercase">
                {workout.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> 
                  {format(new Date(workout.date), "PPP")}
                </span>
                {workout.overall_rating ? <span>{workout.overall_rating}/10</span> : null}
                {workout.template_id ? (
                  <span className="text-xs uppercase tracking-wide">Template Linked</span>
                ) : null}
                {workout.user && (
                   <span className="flex items-center gap-1.5">
                     <User className="h-4 w-4" /> 
                     {workout.user.email?.split('@')[0]}
                   </span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-xs uppercase tracking-widest px-3 py-1">
              FitTrack Log
            </Badge>
          </div>

          {workout.notes && (
            <div className="bg-muted/50 border-l-4 border-primary/50 p-4 rounded-r-md text-sm italic text-muted-foreground">
              &quot;{workout.notes}&quot;
            </div>
          )}
        </div>

        <div className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">General Notes</p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {workout.notes?.trim() || "No notes provided."}
          </p>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises added yet.</p>
          ) : (
            timeline.map((entry, idx) => (
              <div key={`share-entry-${idx}`} className="space-y-2 border-b pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.type}
                  </span>
                  <p className="text-sm font-semibold">
                    {entry.name || (entry.type === "cardio" ? `Cardio ${idx + 1}` : `Exercise ${idx + 1}`)}
                  </p>
                </div>

                {entry.type === "strength" ? (
                  <div className="space-y-2">
                    {entry.sets.map((set) => {
                      const advanced = formatStrengthAdvancedDetails(set);
                      return (
                        <div key={`share-strength-set-${idx}-${set.set_number}`} className="space-y-1">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <span>Set {set.set_number}</span>
                            <span>{displayWeight(set.weight, system)?.toFixed(1)} {labels.weight}</span>
                            <span>{set.reps} reps</span>
                          </div>
                          {advanced ? <p className="text-[11px] text-muted-foreground">{advanced}</p> : null}
                        </div>
                      );
                    })}
                    {entry.notes?.trim() ? (
                      <div className="pt-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{entry.notes}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entry.sets.map((set) => (
                      <div key={`share-cardio-set-${idx}-${set.set_number}`} className="space-y-1">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <span>Set {set.set_number}</span>
                          <span>{set.duration} min</span>
                          <span>{displayDistance(set.distance ?? 0, system)?.toFixed(1)} {labels.distance}</span>
                          <span>{set.reps ?? 0} reps</span>
                        </div>
                        {(set.calories !== undefined || set.heartRate !== undefined) ? (
                          <p className="text-[11px] text-muted-foreground">
                            {[
                              set.calories !== undefined ? `Calories ${set.calories}` : null,
                              set.heartRate !== undefined ? `Avg HR ${set.heartRate} bpm` : null,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {entry.notes?.trim() ? (
                      <div className="pt-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{entry.notes}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- FOOTER --- */}
        <div className="mt-20 pt-8 border-t text-center space-y-2">
           <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
             Generated by
           </div>
           <div className="text-sm font-bold text-foreground">FitTrack</div>
        </div>
      </div>
    );
  }
);
WorkoutPrintView.displayName = "WorkoutPrintView";

function safeMs(value: string | null | undefined) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function groupStrengthByExercise(strengthLogs: WorkoutLog[]) {
  const map = new Map<
    string,
    {
      name: string;
      notes?: string;
      createdAtMs: number;
      entrySequence: number | null;
      sets: WorkoutLog[];
    }
  >();

  strengthLogs.forEach((set) => {
    const name = set.exercise_name || "Strength";
    const key = `${set.entry_sequence ?? "na"}:${set.exercise_id || "no-id"}:${name}`;
    const createdAtMs = safeMs(set.created_at);
    if (!map.has(key)) {
      map.set(key, {
        name,
        notes: set.notes || undefined,
        createdAtMs,
        entrySequence: set.entry_sequence,
        sets: [set],
      });
      return;
    }
    const existing = map.get(key)!;
    existing.sets.push(set);
    existing.createdAtMs = Math.min(existing.createdAtMs, createdAtMs);
    if (!existing.notes && set.notes) existing.notes = set.notes;
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      sets: [...group.sets].sort((a, b) => (a.set_number || 0) - (b.set_number || 0)),
    }))
    .sort((a, b) => {
      if (a.entrySequence !== null && b.entrySequence !== null) return a.entrySequence - b.entrySequence;
      if (a.entrySequence !== null) return -1;
      if (b.entrySequence !== null) return 1;
      return a.createdAtMs - b.createdAtMs;
    });
}

function formatStrengthAdvancedDetails(set: WorkoutLog) {
  return [
    set.rest_seconds ? `Rest ${set.rest_seconds}s` : null,
    set.tempo ? `Tempo ${set.tempo}` : null,
    set.is_warmup ? "Warm-up" : null,
    set.is_dropset ? "Drop set" : null,
  ]
    .filter(Boolean)
    .join(" • ");
}
