"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Dumbbell,
  Trash2,
  ArrowLeft,
  Activity,
  Flame,
  MapPin,
  Heart,
  MoreVertical,
  Settings2,
  HeartPulse,
  Share2 // Imported Share Icon
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator // Added Separator
} from "@/components/ui/dropdown-menu";

import { useWorkouts } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { StatCard } from "./_components/stat-card";
import { EditableText } from "@/components/shared/editable-text";
import { WorkoutDetailSkeleton } from "./_components/workout-detailed-skeleton";
import { WorkoutActions } from "@/components/workout/workout-actions";
// import { AddCardioDialog } from "@/components/workout/add-cardio-dialog"; // Unused in this snippet

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { getWorkout, deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = getWorkout(id);

  if (isLoading) return <WorkoutDetailSkeleton />;
  if (!workout) return <div className="p-8 text-center">Workout not found</div>;

  // Data Preparation for Display
  const exercises = groupLogsByExercise(workout.workout_logs || []);
  
  // Data Preparation for Printing/Actions
  const strengthLogs = workout.workout_logs || [];
  const cardioLogs = workout.cardio_logs || [];

  const totalVolume = strengthLogs.reduce(
    (acc: number, log: any) => acc + (log.weight * log.reps),
    0
  );

  const handleRename = async (newName: string) => {
    try {
      await updateWorkout.mutateAsync({ id, data: { name: newName } });
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  // Shared Action Handlers
  const handleManageStrength = () => router.push(`/workouts/${id}/edit`);
  const handleManageCardio = () => router.push(`/workouts/${id}/cardio`);
  const handleDelete = () => {
    deleteWorkout.mutate(id);
    router.push("/workouts");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <EditableText
              initialValue={workout.name}
              onSave={handleRename}
              className="text-xl md:text-2xl font-bold tracking-tight truncate block"
            />
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3" />
              {format(new Date(workout.date), "PPP")}
            </div>
          </div>
        </div>

        {/* DESKTOP ACTIONS */}
        <div className="hidden md:flex items-center gap-2">
          
          {/* 2. NEW: Workout Actions (PDF, Reader, Share) */}
          <WorkoutActions 
            workout={workout}
            strengthLogs={strengthLogs}
            cardioLogs={cardioLogs}
          />
          
          <Separator orientation="vertical" className="h-6 mx-2" />

          <Button variant="outline" onClick={handleManageStrength}>
            <Dumbbell className="mr-2 h-4 w-4" />
            Manage Strength
          </Button>
          <Button variant="outline" onClick={handleManageCardio}>
            <Activity className="mr-2 h-4 w-4" />
            Manage Cardio
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
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* MOBILE ACTIONS MENU */}
        <div className="md:hidden absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              
              {/* 3. NEW: Mobile Share Shortcut (Redirects to Reader Mode) */}
              <DropdownMenuItem onClick={() => window.open(`/share/workout/${id}`, '_blank')}>
                <Share2 className="mr-2 h-4 w-4" /> Share / PDF View
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleManageStrength}>
                <Dumbbell className="mr-2 h-4 w-4" /> Manage Strength
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleManageCardio}>
                <Activity className="mr-2 h-4 w-4" /> Manage Cardio
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                if (confirm("Delete workout? This cannot be undone.")) handleDelete();
              }}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Workout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* --- MOBILE ACTION GRID --- */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Button
          variant="outline"
          className="h-12 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
          onClick={handleManageStrength}
        >
          <Dumbbell className="mr-2 h-5 w-5" />
          Strength
        </Button>
        <Button
          variant="outline"
          className="h-12 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600"
          onClick={handleManageCardio}
        >
          <Activity className="mr-2 h-5 w-5" />
          Cardio
        </Button>
      </div>

      {/* STATS */}
      <div className="hidden md:grid  grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Duration" value={`${workout.duration_minutes || "--"} min`} icon={Clock} />
        <StatCard label="Volume" value={`${(totalVolume / 1000).toFixed(1)}k kg`} icon={Dumbbell} />
        <StatCard label="Strength" value={exercises.length} icon={Dumbbell} />
        <StatCard label="Cardio" value={cardioLogs.length} icon={Activity} />
      </div>

      <Separator className="hidden md:block" />

      {/* 1. STRENGTH SECTION */}
      {exercises.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell />
            Strength Logs
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex: any, i: number) => (
              <Card key={i} className="overflow-hidden border-l-4 border-l-primary/50 shadow-sm">
                <CardHeader className="bg-muted/30 py-3 px-4">
                  <CardTitle className="text-sm md:text-base font-medium truncate">{ex.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/10 text-muted-foreground text-xs font-medium border-b">
                      <tr>
                        <th className="py-2 text-center w-12 bg-muted/20">Set</th>
                        <th className="py-2 text-center">kg</th>
                        <th className="py-2 text-center">Reps</th>
                        <th className="py-2 text-center w-12">RPE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ex.sets.map((set: any) => (
                        <tr key={set.id}>
                          <td className="py-2.5 text-center font-medium text-muted-foreground bg-muted/5">
                            {set.set_number}
                          </td>
                          <td className="py-2.5 text-center font-medium">{set.weight}</td>
                          <td className="py-2.5 text-center">{set.reps}</td>
                          <td className="py-2.5 text-center text-muted-foreground text-xs">{set.rpe || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. CARDIO SECTION */}
      {cardioLogs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <HeartPulse />
            Cardio Logs
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cardioLogs.map((log: any) => (
              <Card key={log.id} className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="py-3 px-4 bg-blue-50/50 dark:bg-blue-900/10">
                  <CardTitle className="text-sm md:text-base font-medium flex justify-between items-center">
                    <span>{log.activity_type}</span>
                    <span className="text-xs font-normal px-2 py-0.5 bg-background rounded border shadow-sm">
                      {log.duration_minutes} min
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm space-y-3">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-muted-foreground">
                    {log.distance_km && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        <span>{log.distance_km} km</span>
                      </div>
                    )}
                    {log.calories_burned && (
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        <span>{log.calories_burned} kcal</span>
                      </div>
                    )}
                    {log.average_heart_rate && (
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-red-500" />
                        <span>{log.average_heart_rate} bpm</span>
                      </div>
                    )}
                  </div>
                  {log.notes && (
                    <div className="text-xs bg-muted/30 p-2 rounded border-l-2 border-muted-foreground/20 italic">
                      "{log.notes}"
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {exercises.length === 0 && cardioLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/10 mx-4 md:mx-0">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Settings2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Empty Session</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-[250px] text-center">
            This workout has no logs yet. Add exercises or cardio to get started.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleManageStrength}>Add Strength</Button>
            <Button variant="outline" onClick={handleManageCardio}>Add Cardio</Button>
          </div>
        </div>
      )}

      <div className="block md:hidden grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Duration" value={`${workout.duration_minutes || "--"} min`} icon={Clock} />
        <StatCard label="Volume" value={`${(totalVolume / 1000).toFixed(1)}k kg`} icon={Dumbbell} />
        <StatCard label="Strength" value={exercises.length} icon={Dumbbell} />
        <StatCard label="Cardio" value={cardioLogs.length} icon={Activity} />
      </div>
    </div>
  );
}