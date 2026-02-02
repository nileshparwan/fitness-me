"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar, Clock, Dumbbell, Trash2, ArrowLeft, Activity, Flame, MapPin, Heart,
  MoreVertical, HeartPulse, Share2, Pencil
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Replaced Dropdown with Sheet
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";

import { useWorkouts } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { StatCard } from "./_components/stat-card";
import { EditableText } from "@/components/shared/editable-text";
import { WorkoutDetailSkeleton } from "./_components/workout-detailed-skeleton";
import { WorkoutActions } from "@/components/workout/workout-actions";
import { Database } from "@/types/database";

// DB Types for mapping
type WorkoutLog = Database['public']['Tables']['workout_logs']['Row'];
type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { getWorkout, deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = getWorkout(id);

  if (isLoading) return <WorkoutDetailSkeleton />;
  if (!workout) return <div className="p-8 text-center">Workout not found</div>;

  // Type Casting safely
  const strengthLogs = (workout.workout_logs || []) as WorkoutLog[];
  const cardioLogs = (workout.cardio_logs || []) as CardioLog[];

  // Group logs
  const exercises = groupLogsByExercise(strengthLogs);

  // Safe Calculation
  const totalVolume = strengthLogs.reduce(
    (acc, log) => acc + ((log.weight || 0) * (log.reps || 0)),
    0
  );

  const handleRename = async (newName: string) => {
    try {
      // @ts-ignore
      await updateWorkout.mutateAsync({ id, data: { name: newName } });
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  const handleManageStrength = () => router.push(`/workouts/${id}/edit`);
  const handleManageCardio = () => router.push(`/workouts/${id}/cardio`);

  const handleDelete = () => {
    deleteWorkout.mutate(id);
    router.push("/workouts");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden pr-12 md:pr-0">
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
          <WorkoutActions
            workout={workout}
            strengthLogs={strengthLogs}
            cardioLogs={cardioLogs}
          />
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="outline" onClick={handleManageStrength}>
            <Dumbbell className="mr-2 h-4 w-4" /> Manage Strength
          </Button>
          <Button variant="outline" onClick={handleManageCardio}>
            <Activity className="mr-2 h-4 w-4" /> Manage Cardio
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* MOBILE MENU (SHEET DRAWER) */}
        <div className="md:hidden absolute top-0 right-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
                <MoreVertical className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl pb-8 px-2">
              <SheetHeader className="text-left mb-4">
                <SheetTitle>Workout Options</SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-3">
                {/* Mobile version of WorkoutActions - typically just a link sharing for now */}
                <SheetClose asChild>
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => window.open(`/share/workout/${id}`, '_blank')}>
                    <Share2 className="mr-3 h-4 w-4" /> Share / PDF View
                  </Button>
                </SheetClose>

                <div className="my-1 border-t" />

                <SheetClose asChild>
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={handleManageStrength}>
                    <Dumbbell className="mr-3 h-4 w-4" /> Manage Strength
                  </Button>
                </SheetClose>

                <SheetClose asChild>
                  <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={handleManageCardio}>
                    <Activity className="mr-3 h-4 w-4" /> Manage Cardio
                  </Button>
                </SheetClose>

                <div className="my-1 border-t" />

                <SheetClose asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start h-12 text-base"
                    onClick={() => { if (confirm("Delete this workout? This cannot be undone.")) handleDelete(); }}
                  >
                    <Trash2 className="mr-3 h-4 w-4" /> Delete Workout
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="px-2">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            label="Duration"
            value={`${workout.duration_minutes || "--"} min`}
            icon={Clock}
          />
          <StatCard
            label="Volume"
            value={`${(totalVolume / 1000).toFixed(1)}k kg`}
            icon={Dumbbell}
          />
          <StatCard
            label="Strength"
            value={`${exercises.length} Exercises`}
            icon={Dumbbell}
          />
          <StatCard
            label="Cardio"
            value={`${cardioLogs.length} Sessions`}
            icon={Activity}
          />
        </div>

        <Separator />

        {/* STRENGTH SECTION */}
        {exercises.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5" /> Strength Logs
              </h3>
              <Button variant="ghost" size="sm" className="md:hidden text-xs" onClick={handleManageStrength}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
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
                        {ex.sets.map((set: WorkoutLog) => (
                          <tr key={set.id}>
                            <td className="py-2.5 text-center font-medium text-muted-foreground bg-muted/5">{set.set_number}</td>
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

        {/* CARDIO SECTION */}
        {cardioLogs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HeartPulse className="h-5 w-5" /> Cardio Logs
              </h3>
              <Button variant="ghost" size="sm" className="md:hidden text-xs" onClick={handleManageCardio}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cardioLogs.map((log: CardioLog) => (
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
                      {log.distance_km && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500" /><span>{log.distance_km} km</span></div>}
                      {log.calories_burned && <div className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-500" /><span>{log.calories_burned} kcal</span></div>}
                      {log.average_heart_rate && <div className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-red-500" /><span>{log.average_heart_rate} bpm</span></div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}