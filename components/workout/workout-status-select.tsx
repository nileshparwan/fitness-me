"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateWorkoutAction } from "@/app/actions/workout";
import { trainingKeys } from "@/lib/query-keys-training";
import { withToastFeedback } from "@/lib/ui/toast-feedback";
import { cn } from "@/utils";

type WorkoutStatus = "draft" | "active" | "completed" | "archived";

const WORKOUT_STATUSES: WorkoutStatus[] = ["draft", "active", "completed", "archived"];

function normalizeStatus(input: string): WorkoutStatus {
  return WORKOUT_STATUSES.includes(input as WorkoutStatus) ? (input as WorkoutStatus) : "draft";
}

function statusLabel(status: WorkoutStatus) {
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  if (status === "active") return "Active";
  return "Draft";
}

function statusDotClass(status: WorkoutStatus) {
  if (status === "active") return "bg-chart-2";
  if (status === "completed") return "bg-chart-1";
  if (status === "archived") return "bg-muted-foreground";
  return "bg-chart-4";
}

interface WorkoutStatusSelectProps {
  workoutId: string;
  status: string;
  className?: string;
  // NEW: Callback to update parent state
  onStatusChange?: (newStatus: string) => void; 
}

export function WorkoutStatusSelect({ 
  workoutId, 
  status, 
  className,
  onStatusChange 
}: WorkoutStatusSelectProps) {
  const queryClient = useQueryClient();
  const normalizedCurrent = normalizeStatus(status);

  const handleStatusChange = async (newStatus: string) => {
    const normalizedNext = normalizeStatus(newStatus);
    onStatusChange?.(normalizedNext);

    try {
      await withToastFeedback(
        updateWorkoutAction(workoutId, { status: normalizedNext }),
        {
          loading: "Updating workout status...",
          success: "Status updated",
          error: "Failed to update status",
        }
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trainingKeys.sessions() }),
        queryClient.invalidateQueries({ queryKey: trainingKeys.session(workoutId) }),
      ]);
    } catch {
      // Revert optimistic UI state on failed write.
      onStatusChange?.(normalizedCurrent);
    }
  };

  return (
    <Select value={normalizedCurrent} onValueChange={handleStatusChange}>
      <SelectTrigger className={cn("h-8 min-w-[112px] rounded-full text-xs font-semibold", className)}>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(normalizedCurrent))} />
          <SelectValue>{statusLabel(normalizedCurrent)}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60 bg-popover/95 backdrop-blur">
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  );
}
