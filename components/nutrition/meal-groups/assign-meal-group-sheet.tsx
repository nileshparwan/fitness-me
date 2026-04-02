"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { useAssignableSubjects, useMealGroupMutations } from "@/hooks/use-meal-groups";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

type Props = {
  mealGroupId: string;
  mealGroupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartDate?: string | null;
  defaultEndDate?: string | null;
};

type AssignmentOption =
  | { key: string; label: string; subject_user_id: string | null; subject_client_id: string | null }
  | null;

function formatClientLabel(input: { display_name: string | null; first_name: string; last_name: string | null }) {
  if (input.display_name) return input.display_name;
  return `${input.first_name} ${input.last_name || ""}`.trim();
}

export function AssignMealGroupSheet({
  mealGroupId,
  mealGroupName,
  open,
  onOpenChange,
  defaultStartDate,
  defaultEndDate,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const subjectsQuery = useAssignableSubjects();
  const mutations = useMealGroupMutations();

  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [startDate, setStartDate] = useState(defaultStartDate || "");
  const [endDate, setEndDate] = useState(defaultEndDate || "");
  const [notes, setNotes] = useState("");

  const options = useMemo(() => {
    const rows: AssignmentOption[] = [];
    if (subjectsQuery.data?.self?.id) {
      rows.push({
        key: `self:${subjectsQuery.data.self.id}`,
        label: "Me",
        subject_user_id: subjectsQuery.data.self.id,
        subject_client_id: null,
      });
    }
    for (const client of subjectsQuery.data?.clients || []) {
      rows.push({
        key: `client:${client.id}`,
        label: `Client • ${formatClientLabel(client)}`,
        subject_user_id: null,
        subject_client_id: client.id,
      });
      if (client.linked_user_id) {
        rows.push({
          key: `linked:${client.linked_user_id}`,
          label: `Linked User • ${formatClientLabel(client)}`,
          subject_user_id: client.linked_user_id,
          subject_client_id: null,
        });
      }
    }
    return rows.filter((row): row is NonNullable<AssignmentOption> => Boolean(row));
  }, [subjectsQuery.data]);

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultStartDate || new Date().toISOString().slice(0, 10));
    setEndDate(defaultEndDate || new Date().toISOString().slice(0, 10));
    setNotes("");
    setSelectedTarget(options[0]?.key || "");
  }, [defaultEndDate, defaultStartDate, open, options]);

  const selectedSubject = options.find((entry) => entry.key === selectedTarget) || null;

  const submit = async () => {
    if (!selectedSubject) {
      toast.error("Choose a target before assigning.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required.");
      return;
    }
    const result = await withToastFeedback(
      mutations.assignGroup.mutateAsync({
        nutrition_plan_id: mealGroupId,
        subject: {
          subject_user_id: selectedSubject.subject_user_id,
          subject_client_id: selectedSubject.subject_client_id,
        },
        start_date: startDate,
        end_date: endDate,
        notes: notes.trim() || null,
      }),
      {
        loading: "Assigning meal group...",
        success: "Meal group assigned.",
        error: "Unable to assign meal group.",
      }
    ).catch(() => null);
    if (!result) return;
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn("flex flex-col gap-0 p-0", isDesktop ? "w-[480px] max-w-[480px]" : "max-h-[92dvh] rounded-t-2xl")}
      >
        <SheetHeader className="border-b border-border/50 px-5 py-4">
          <SheetTitle>Assign Meal Group</SheetTitle>
          <SheetDescription>Assign a snapshot of {mealGroupName} to a user or client.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Assign To</Label>
              <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                <SelectTrigger className="rounded-xl border-border/60 bg-muted/20">
                  <SelectValue placeholder="Select user or client" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border-border/60 bg-muted/20" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional assignment notes for coach/client context"
                className="rounded-xl border-border/60 bg-muted/20"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border/50 px-5 py-4">
          <Button variant="outline" className="rounded-xl border-border/60" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="accent-strong rounded-xl" onClick={() => void submit()} disabled={mutations.assignGroup.isPending || subjectsQuery.isLoading}>
            {mutations.assignGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
