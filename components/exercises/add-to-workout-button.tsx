"use client";

import { useState, useEffect } from "react";
import { Plus, PlayCircle, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { toast } from "sonner"; // Assuming sonner, or use your toast lib
import { useRouter } from "next/navigation";
import {
    getOpenWorkouts,
    addExerciseToWorkout,
    createWorkoutWithExercise
} from "@/app/actions/workout-quick-actions";

export function AddToWorkoutButton({ exercise }: { exercise: any }) {
    const [open, setOpen] = useState(false);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Load active workouts when dialog opens
    useEffect(() => {
        if (open) {
            getOpenWorkouts().then(setWorkouts);
        }
    }, [open]);

    const handleAddToExisting = async (workoutId: string, workoutName: string) => {
        setLoading(true);
        try {
            await addExerciseToWorkout(workoutId, exercise);
            toast.success(`Added to ${workoutName}`);
            setOpen(false);
            // Optional: Navigate user to that workout
            // router.push(`/workouts/${workoutId}`); 
        } catch (error) {
            toast.error("Failed to add exercise");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = async () => {
        setLoading(true);
        try {
            const { workoutId } = await createWorkoutWithExercise(exercise);
            toast.success("Workout started!");
            router.push(`/workouts/${workoutId}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create workout. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Add to Workout
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Add to Workout</DialogTitle>
                    <DialogDescription>
                        Choose where to add <b>{exercise.name}</b>.
                    </DialogDescription>
                </DialogHeader>

                <Command className="border-t">
                    <CommandInput placeholder="Search active workouts..." />
                    <CommandList>
                        <CommandEmpty>No matching workouts found.</CommandEmpty>

                        {/* OPTION 1: Start Fresh */}
                        <CommandGroup heading="Quick Start">
                            <CommandItem onSelect={handleCreateNew} className="gap-3 cursor-pointer py-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">Start New Session</span>
                                    <span className="text-xs text-muted-foreground">Create a new active workout with this exercise</span>
                                </div>
                            </CommandItem>
                        </CommandGroup>

                        {/* OPTION 2: Existing Workouts */}
                        <CommandGroup heading="Active & Drafts">
                            {workouts.map((workout) => (
                                <CommandItem
                                    key={workout.id}
                                    onSelect={() => handleAddToExisting(workout.id, workout.name)}
                                    className="gap-3 cursor-pointer py-3"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{workout.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(workout.date).toLocaleDateString()} • <span className="capitalize">{workout.status}</span>
                                        </span>
                                    </div>
                                    {loading && <Loader2 className="ml-auto h-4 w-4 animate-spin opacity-50" />}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}