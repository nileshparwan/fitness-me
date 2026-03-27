"use client";

import type { NutritionProgressDayRow } from "@/types/nutrition-progress";
import { FIBER_COLOR, MACRO_COLORS, PANEL_CLASS } from "./_constants";
import { formatTableDate } from "./_shared";
import { cn } from "@/utils";

export function DailyDetailTable({
  rows,
}: {
  rows: NutritionProgressDayRow[];
}) {
  const tableRowsDesc = [...rows].reverse();

  return (
    <section className={cn(PANEL_CLASS, "space-y-4")}>
      <h2 className="text-xl font-semibold tracking-tight">Daily Detail</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              {["Date", "Calories", "Protein", "Carbs", "Fat", "Fiber"].map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {tableRowsDesc.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-sm text-muted-foreground">
                  No daily logs found in this period.
                </td>
              </tr>
            ) : (
              tableRowsDesc.map((row) => (
                <tr key={row.date} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatTableDate(row.date)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {row.calories.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.protein }}>
                    {row.protein_g}g
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.carbs }}>
                    {row.carbs_g}g
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: MACRO_COLORS.fat }}>
                    {row.fat_g}g
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: FIBER_COLOR }}>
                    {row.fiber_g}g
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
