"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  Dumbbell, 
  Edit2, 
  Trash2, 
  ArrowLeft 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkouts } from "@/hooks/use-workout"; // Check your hook path
import { groupLogsByExercise } from "@/utils/log";
import { StatCard } from "./_components/stat-card";
import { DetailSkeleton } from "./_components/detailed-skeleton";
import { EditableText } from "@/components/shared/editable-text";

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  // 1. Destructure updateWorkout from the hook
  const { getWorkout, deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = getWorkout(id);

  if (isLoading) return <DetailSkeleton />;
  if (!workout) return <div className="p-8 text-center">Workout not found</div>;

  const exercises = groupLogsByExercise(workout.workout_logs);

  const totalVolume = workout.workout_logs.reduce(
    (acc: number, log: any) => acc + (log.weight * log.reps), 
    0
  );

  // 2. Handle Rename Logic
  const handleRename = async (newName: string) => {
    try {
      await updateWorkout.mutateAsync({ 
        id, 
        data: { 
          name: newName
        } 
      });
    } catch (error) {
      console.error("Failed to rename:", error);
      throw error;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {/* 3. Replace static H1 with EditableText */}
            <EditableText 
              initialValue={workout.name} 
              onSave={handleRename}
              className="text-2xl font-bold tracking-tight"
            />
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(workout.date), "PPP")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={() => router.push(`/workouts/${id}/edit`)}>
             <Edit2 className="mr-2 h-3 w-3" />
             Edit Session
           </Button>
           
           <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive" size="icon">
                 <Trash2 className="h-4 w-4" />
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
                 <AlertDialogDescription>
                   This action cannot be undone. This will permanently delete this workout session and all associated logs.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={() => deleteWorkout.mutate(id)}>
                   Delete
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Duration" value={`${workout.duration_minutes || "--"} min`} icon={Clock} />
        <StatCard label="Volume" value={`${(totalVolume / 1000).toFixed(1)}k kg`} icon={Dumbbell} />
        <StatCard label="Exercises" value={exercises.length} icon={Dumbbell} />
        <StatCard label="Status" value={workout.status} badge />
      </div>

      {/* Notes Section */}
      {workout.notes && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h4 className="text-sm font-semibold mb-1">Notes</h4>
            <p className="text-sm text-muted-foreground">{workout.notes}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Exercises Detail List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Session Log</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exercises.map((ex: any, i: number) => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-primary/50">
              <CardHeader className="bg-muted/40 py-3">
                <CardTitle className="text-base font-medium truncate">{ex.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 text-muted-foreground text-xs font-medium">
                    <tr>
                      <th className="py-2 text-center w-12">Set</th>
                      <th className="py-2 text-center">kg</th>
                      <th className="py-2 text-center">Reps</th>
                      <th className="py-2 text-center w-12">RPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ex.sets.map((set: any) => (
                      <tr key={set.id} className="hover:bg-muted/10">
                        <td className="py-2 text-center font-medium text-muted-foreground">
                          {set.set_number}
                        </td>
                        <td className="py-2 text-center font-medium">{set.weight}</td>
                        <td className="py-2 text-center">{set.reps}</td>
                        <td className="py-2 text-center text-muted-foreground text-xs">
                          {set.rpe || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}