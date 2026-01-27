"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/utils";
import { updateWorkoutAction } from "@/app/actions/workout";

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
    const router = useRouter();

    const handleStatusChange = async (newStatus: string) => {
        // 1. OPTIMISTIC UPDATE: Update parent UI immediately
        if (onStatusChange) {
            onStatusChange(newStatus);
        }

        try {
            // 2. SERVER UPDATE: Send to DB
            await updateWorkoutAction(workoutId, { 
                status: newStatus as 'active' | 'draft' | 'archived' | 'completed' 
            });
            toast.success(`Status updated`);
            router.refresh();
        } catch {
            toast.error("Failed to update status");
            // Optional: You could revert the status here on error if you wanted strict safety
        }
    };

    return (
        <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn("w-[110px] h-7 text-xs font-medium", className)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
        </Select>
    );
}