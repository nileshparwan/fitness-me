"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WorkoutCalendarRow = {
  date: string;
  has_strength: boolean;
  has_cardio: boolean;
  session_count: number;
};

type Props = {
  rows: WorkoutCalendarRow[];
  isLoading: boolean;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year || 0, (month || 1) - 1, day || 1, 12, 0, 0));
}

function addDays(value: string, days: number) {
  const next = parseDateInput(value);
  next.setUTCDate(next.getUTCDate() + days);
  return toDateInput(next);
}

function toMonthKey(value: string) {
  return value.slice(0, 7);
}

function monthLabel(monthKey: string) {
  const date = parseDateInput(`${monthKey}-01`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildMonthGrid(monthKey: string) {
  const monthStart = parseDateInput(`${monthKey}-01`);
  const startDay = monthStart.getUTCDay();
  const mondayOffset = startDay === 0 ? 6 : startDay - 1;
  const gridStart = addDays(`${monthKey}-01`, -mondayOffset);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function WorkoutCalendarCard({ rows, isLoading }: Props) {
  const [monthIndex, setMonthIndex] = useState(0);

  const monthKeys = useMemo(() => {
    const keys = Array.from(new Set(rows.map((row) => toMonthKey(row.date)))).sort();
    return keys.length ? keys : [toDateInput(new Date()).slice(0, 7)];
  }, [rows]);

  const activeMonth = monthKeys[Math.min(monthKeys.length - 1, Math.max(0, monthKeys.length - 1 + monthIndex))];

  const rowByDate = useMemo(() => {
    return new Map(rows.map((row) => [row.date, row] as const));
  }, [rows]);

  if (isLoading) {
    return <Skeleton className="h-[380px] rounded-[16px]" />;
  }

  const grid = buildMonthGrid(activeMonth);

  return (
    <section className="rounded-[16px] border border-white/10 bg-[#0f172b]/85 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Workout Calendar</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-[8px]"
            onClick={() => setMonthIndex((prev) => Math.max(prev - 1, -(monthKeys.length - 1)))}
            disabled={monthIndex <= -(monthKeys.length - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-[8px]"
            onClick={() => setMonthIndex((prev) => Math.min(prev + 1, 0))}
            disabled={monthIndex >= 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{monthLabel(activeMonth)}</p>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {[
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ].map((label) => (
          <p key={label} className="py-1">
            {label}
          </p>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((date) => {
          const entry = rowByDate.get(date);
          const inMonth = toMonthKey(date) === activeMonth;
          const today = date === toDateInput(new Date());
          return (
            <div
              key={date}
              className={`min-h-[42px] rounded-[8px] border px-1 py-1 text-xs ${
                inMonth
                  ? "border-white/10 bg-[#121b2f]/55"
                  : "border-white/5 bg-[#0f172b]/40 text-muted-foreground/40"
              } ${today ? "ring-1 ring-[#5b9cff]" : ""}`}
              title={
                entry
                  ? `${date}: ${entry.session_count} sessions${entry.has_strength ? " · strength" : ""}${
                      entry.has_cardio ? " · cardio" : ""
                    }`
                  : date
              }
            >
              <div className="flex items-center justify-between">
                <span>{date.slice(8)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {entry?.session_count ? entry.session_count : ""}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {entry?.has_strength ? <span className="h-1.5 w-1.5 rounded-full bg-[#5b9cff]" /> : null}
                {entry?.has_cardio ? <span className="h-1.5 w-1.5 rounded-full bg-[#5ed28f]" /> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#5b9cff]" /> Strength
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[#5ed28f]" /> Cardio
        </div>
      </div>
    </section>
  );
}
