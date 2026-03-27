"use client";

import Link from "next/link";
import { differenceInCalendarWeeks } from "date-fns";
import { Baby, HeartPulse } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsStore } from "@/stores/use-settings-store";

export function PregnancyStatusCard() {
  const is_pregnant = useSettingsStore((state) => state.is_pregnant);
  const due_date = useSettingsStore((state) => state.due_date);
  const is_postpartum = useSettingsStore((state) => state.is_postpartum);
  const postpartum_since = useSettingsStore((state) => state.postpartum_since);

  if (!is_pregnant && !is_postpartum) return null;

  const weeksPregnant =
    is_pregnant && due_date ? Math.max(0, 40 - differenceInCalendarWeeks(new Date(due_date), new Date())) : null;
  const postpartumWeeks =
    is_postpartum && postpartum_since ? Math.max(0, differenceInCalendarWeeks(new Date(), new Date(postpartum_since))) : null;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Baby className="h-4 w-4 text-primary" />
          Pregnancy / Postpartum
        </CardTitle>
        <CardDescription>Optional training context when it applies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {is_pregnant ? (
          <>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Pregnant</Badge>
              <span className="text-xs text-muted-foreground">{weeksPregnant ?? "—"} weeks</span>
            </div>
            <p className="text-sm text-foreground">
              Coach reminder: apply prenatal exercise modifications and watch intensity closely.
            </p>
          </>
        ) : null}

        {is_postpartum ? (
          <>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Postpartum</Badge>
              <span className="text-xs text-muted-foreground">{postpartumWeeks ?? "—"} weeks</span>
            </div>
            <p className="text-sm text-foreground">
              Gradual return to training. Keep load progression conservative and prioritize recovery.
            </p>
          </>
        ) : null}

        <Button asChild variant="outline" className="w-full">
          <Link href="/settings/profile">
            <HeartPulse className="mr-2 h-4 w-4" />
            Update Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
