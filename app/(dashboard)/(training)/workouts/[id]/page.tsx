"use client";

import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar, Clock, Dumbbell, Trash2, ArrowLeft, Activity, Flame, MapPin, Heart,
  MoreVertical, Share2, Pencil, Timer, Hash, Weight, HeartPulse
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose
} from "@/components/ui/sheet";

import { useWorkout, useWorkouts } from "@/hooks/use-workout";
import { groupLogsByExercise } from "@/utils/log";
import { EditableText } from "@/components/shared/editable-text";
import { WorkoutDetailSkeleton } from "./_components/workout-detailed-skeleton";
import { WorkoutActions } from "@/components/workout/workout-actions";
import { Database } from "@/types/database";
import { LucideIcon } from "lucide-react";

// Types
type WorkoutLog = Database['public']['Tables']['strength_sets']['Row'];
type CardioLog = Database['public']['Tables']['cardio_sessions']['Row'];

export default function WorkoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { deleteWorkout, updateWorkout } = useWorkouts();
  const { data: workout, isLoading } = useWorkout(id);

  if (isLoading) return <WorkoutDetailSkeleton />;
  if (!workout) return <div className="page-shell text-center text-muted-foreground">Workout not found</div>;

  const strengthLogs = (workout.strength_sets || []) as WorkoutLog[];
  const cardioLogs = (workout.cardio_sessions || []) as CardioLog[];
  const exercises = groupLogsByExercise(strengthLogs);

  const totalVolume = strengthLogs.reduce(
    (acc, log) => acc + ((log.weight || 0) * (log.reps || 0)), 0
  );

  const handleRename = async (newName: string) => {
    try {
      await updateWorkout.mutateAsync({ id, data: { name: newName } });
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  };

  const handleDelete = () => {
    deleteWorkout.mutate(id);
    router.push("/workouts");
  };

  return (
    <div className="page-shell section-gap mx-auto max-w-5xl pb-24 md:pb-12 animate-in fade-in duration-300">

      {/* --- HEADER --- */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
           {/* Title Area */}
           <div className="flex items-center gap-3 overflow-hidden flex-1">
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <EditableText
                  initialValue={workout.name}
                  onSave={handleRename}
                  className="text-xl md:text-3xl font-bold tracking-tight truncate block"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Badge variant="secondary" className="rounded-sm px-1.5 py-0 font-normal text-[10px] h-5">
                    {workout.status || 'Draft'}
                  </Badge>
                  <span className="flex items-center gap-1">
                     <Calendar className="h-3 w-3" />
                     {format(new Date(workout.date), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
           </div>

           {/* Desktop Actions */}
           <div className="hidden md:flex items-center gap-2">
              <WorkoutActions
                workout={workout}
                strengthLogs={strengthLogs}
                cardioLogs={cardioLogs}
              />
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button variant="outline" size="sm" onClick={() => router.push(`/workouts/${id}/edit`)}>
                <Dumbbell className="mr-2 h-3.5 w-3.5" /> Strength
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/workouts/${id}/cardio`)}>
                <Activity className="mr-2 h-3.5 w-3.5" /> Cardio
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
           </div>

           {/* Mobile Menu */}
           <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8">
                  <SheetHeader className="text-left mb-6 border-b pb-4">
                    <SheetTitle>Workout Options</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-2">
                     <SheetClose asChild>
                        <Button variant="outline" className="w-full justify-start h-12" onClick={() => window.open(`/share/workout/${id}`, '_blank')}>
                           <Share2 className="mr-3 h-4 w-4" /> Share / PDF
                        </Button>
                     </SheetClose>
                     <div className="border-t my-2" />
                     <SheetClose asChild>
                        <Button variant="outline" className="w-full justify-start h-12" onClick={() => router.push(`/workouts/${id}/edit`)}>
                           <Dumbbell className="mr-3 h-4 w-4 text-primary" /> Manage Strength
                        </Button>
                     </SheetClose>
                     <SheetClose asChild>
                        <Button variant="outline" className="w-full justify-start h-12" onClick={() => router.push(`/workouts/${id}/cardio`)}>
                           <Activity className="mr-3 h-4 w-4 text-blue-500" /> Manage Cardio
                        </Button>
                     </SheetClose>
                     <div className="border-t my-2" />
                     <SheetClose asChild>
                        <Button variant="destructive" className="w-full justify-start h-12 mt-4" onClick={() => { if(confirm("Delete?")) handleDelete(); }}>
                           <Trash2 className="mr-3 h-4 w-4" /> Delete Workout
                        </Button>
                     </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
           </div>
        </div>

        {/* --- STATS GRID --- */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
           <DetailStat icon={Clock} label="Duration" value={`${workout.duration_minutes || "--"} min`} />
           <DetailStat icon={Weight} label="Volume" value={`${(totalVolume / 1000).toFixed(1)}k kg`} />
           <DetailStat icon={Hash} label="Strength" value={`${exercises.length} Exercises`} />
           <DetailStat icon={Activity} label="Cardio" value={`${cardioLogs.length} Sessions`} />
           <DetailStat icon={HeartPulse} label="Rating" value={workout.overall_rating ? `${workout.overall_rating}/10` : "--"} />
           <DetailStat icon={Timer} label="Template" value={workout.template_id ? "Linked" : "Custom"} />
        </div>
      </div>

      <Separator className="my-6 opacity-50" />

      {/* --- STRENGTH SECTION --- */}
      {exercises.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Dumbbell className="h-4 w-4" /> Strength Routine
             </h3>
             <Button variant="ghost" size="sm" className="h-7 text-xs md:hidden" onClick={() => router.push(`/workouts/${id}/edit`)}>
                Edit <Pencil className="ml-2 h-3 w-3" />
             </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {exercises.map((ex, i: number) => (
                <Card key={i} className="overflow-hidden border-none shadow-sm ring-1 ring-border">
                   {/* Card Header */}
                   <div className="bg-muted/40 p-3 border-b flex justify-between items-start">
                      <div>
                         <h4 className="font-semibold text-sm line-clamp-1" title={ex.name}>{ex.name}</h4>
                         <p className="text-[10px] text-muted-foreground mt-0.5">{ex.sets.length} Sets</p>
                      </div>
                      <div className="h-6 w-6 rounded-full bg-background border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                         {i + 1}
                      </div>
                   </div>
                   
                   {/* Sets Grid - Replaces Table */}
                   <div className="p-3 space-y-2">
                      {/* Header Row */}
                      <div className="grid grid-cols-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">
                         <span>Set</span>
                         <span>Kg</span>
                         <span>Reps</span>
                      </div>
                      {/* Data Rows */}
                      <div className="space-y-1">
                        {ex.sets.map((set: WorkoutLog, idx: number) => (
                           <div key={set.id} className="grid grid-cols-3 text-xs text-center items-center py-1.5 rounded-sm hover:bg-muted/50 transition-colors">
                              <span className="font-medium text-muted-foreground">{idx + 1}</span>
                              <span className="font-semibold">
                                {set.weight}
                                {set.is_warmup ? "W" : ""}
                              </span>
                              <span>{set.reps}</span>
                           </div>
                        ))}
                      </div>
                      {ex.sets.some((set) => set.rest_seconds || set.tempo || set.is_dropset) && (
                        <div className="mt-2 text-[10px] text-muted-foreground space-y-1">
                          {ex.sets.map((set) => (
                            <div key={`${set.id}-meta`} className="flex gap-2">
                              <span>#{set.set_number}</span>
                              {set.rest_seconds ? <span>Rest {set.rest_seconds}s</span> : null}
                              {set.tempo ? <span>Tempo {set.tempo}</span> : null}
                              {set.is_dropset ? <span>Drop Set</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </Card>
             ))}
          </div>
        </section>
      )}

      {/* --- CARDIO SECTION --- */}
      {cardioLogs.length > 0 && (
        <section className="mt-8 space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="h-4 w-4" /> Cardio Sessions
             </h3>
             <Button variant="ghost" size="sm" className="h-7 text-xs md:hidden" onClick={() => router.push(`/workouts/${id}/cardio`)}>
                Edit <Pencil className="ml-2 h-3 w-3" />
             </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
             {cardioLogs.map((log) => (
                <Card key={log.id} className="group relative overflow-hidden border-l-4 border-l-blue-500 bg-blue-50/10 dark:bg-blue-900/5">
                   <CardContent className="surface-pad flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                         <span className="font-semibold text-sm">{log.activity_type}</span>
                         <Badge variant="outline" className="bg-background/50 font-normal text-xs">{log.duration_minutes}m</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Dist</span>
                            <div className="font-medium flex items-center gap-1">
                               <MapPin className="h-3 w-3 text-blue-500" />
                               {log.distance_km || "-"}
                            </div>
                         </div>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Cals</span>
                            <div className="font-medium flex items-center gap-1">
                               <Flame className="h-3 w-3 text-orange-500" />
                               {log.calories_burned || "-"}
                            </div>
                         </div>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">HR</span>
                            <div className="font-medium flex items-center gap-1">
                               <Heart className="h-3 w-3 text-red-500" />
                               {log.average_heart_rate || "-"}
                            </div>
                         </div>
                      </div>
                   </CardContent>
                </Card>
             ))}
          </div>
        </section>
      )}

      {workout.ai_feedback && (
        <section className="mt-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-sm">AI Feedback</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {workout.ai_feedback}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

// Minimal Stat Component
function DetailStat({ icon: Icon, label, value }: { icon: LucideIcon, label: string, value: string }) {
   return (
      <div className="bg-card border rounded-lg p-3 flex items-center gap-3 shadow-sm">
         <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
         </div>
         <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase">{label}</p>
            <p className="text-sm font-bold leading-none mt-0.5">{value}</p>
         </div>
      </div>
   )
}
