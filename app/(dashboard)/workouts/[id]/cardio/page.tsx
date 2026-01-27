"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Edit2, Trash2, Plus, 
  MapPin, Flame, Activity, Heart, 
  Timer, Mountain 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query"; // Import QueryClient

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"; // Use Sheet for Mobile Form
import { useWorkouts } from "@/hooks/use-workout";
import { deleteCardioLog } from "@/app/actions/cardio";
import { CardioLogForm } from "@/components/workout/cardio-log-form";
import { cn } from "@/utils";
import { CardioSkeleton } from "../_components/cardio-skeleton";

export default function ManageCardioPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const queryClient = useQueryClient(); // Initialize Query Client
  
  const { getWorkout } = useWorkouts();
  const { data: workout, isLoading } = getWorkout(id);

  // State
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  if (isLoading) return <CardioSkeleton />;
  if (!workout) return <div className="p-8 text-center">Workout not found</div>;

  const cardioLogs = workout.cardio_logs || [];

  // --- Handlers ---

  const handleRefresh = async () => {
    // 1. Invalidate React Query Cache (Fixes the reload issue)
    await queryClient.invalidateQueries({ queryKey: ["workout", id] });
    // 2. Refresh Server Components
    router.refresh();
  };

  const handleSuccess = () => {
    setEditingLog(null);
    setIsMobileSheetOpen(false); // Close mobile sheet if open
    handleRefresh();
  };

  const handleDelete = async (logId: string) => {
    if (!confirm("Delete this log?")) return;
    try {
      await deleteCardioLog(logId, id);
      toast.success("Log deleted");
      if (editingLog?.id === logId) setEditingLog(null);
      handleRefresh();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (log: any) => {
    setEditingLog(log);
    // On mobile, opening edit also opens the sheet
    if (window.innerWidth < 1024) {
      setIsMobileSheetOpen(true);
    }
  };

  const openNew = () => {
    setEditingLog(null);
    setIsMobileSheetOpen(true);
  };

  // --- Render Components ---

  // The Form Component (Reused for Desktop Sidebar and Mobile Sheet)
  const FormInstance = () => (
    <CardioLogForm 
      workoutId={id} 
      initialData={editingLog} 
      onSuccess={handleSuccess}
      onCancel={() => {
        setEditingLog(null);
        setIsMobileSheetOpen(false);
      }} 
    />
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-auto lg:block">
      
      {/* HEADER */}
      <div className="flex-none p-4 lg:px-0 lg:pt-0 lg:pb-6 border-b lg:border-none bg-background z-10">
        <div className="flex items-center gap-3 container max-w-5xl mx-auto lg:mx-0 lg:px-0">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/workouts/${id}`)} className="-ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-bold truncate">Cardio Logs</h1>
            <p className="text-xs text-muted-foreground hidden lg:block">
              {format(new Date(workout.date), "PPP")}
            </p>
          </div>
          {/* Mobile "Add" Button (Top Right) */}
          <Button size="sm" onClick={openNew} className="lg:hidden">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden lg:overflow-visible container max-w-7xl mx-auto lg:px-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        
        {/* --- LEFT COLUMN: LIST (Scrollable on Mobile) --- */}
        <div className="h-full overflow-y-auto lg:h-auto lg:col-span-7 xl:col-span-8 p-4 lg:p-0 space-y-4">
          <div className="flex items-center justify-between hidden lg:flex">
             <h2 className="text-lg font-semibold">Session History ({cardioLogs.length})</h2>
          </div>

          {cardioLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/30 p-6">
              <Activity className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">No cardio logs yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Track your runs, rides, or swims.</p>
              <Button variant="outline" onClick={openNew} className="lg:hidden">Start Logging</Button>
            </div>
          ) : (
            <div className="space-y-3 pb-20 lg:pb-0">
              {cardioLogs.map((log: any) => (
                <Card 
                  key={log.id} 
                  className={cn(
                    "group transition-all hover:shadow-md cursor-pointer border-l-4",
                    editingLog?.id === log.id ? "border-l-primary ring-1 ring-primary/20 bg-primary/5" : "border-l-transparent hover:border-l-primary/30"
                  )}
                  onClick={() => openEdit(log)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      
                      {/* Icon & Main Info */}
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base flex items-center gap-2">
                            {log.activity_type}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 text-foreground font-medium">
                              <Timer className="h-3.5 w-3.5" /> {log.duration_minutes}m
                            </span>
                            {log.distance_km && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {log.distance_km}km
                              </span>
                            )}
                            {log.calories_burned && (
                              <span className="flex items-center gap-1">
                                <Flame className="h-3.5 w-3.5" /> {log.calories_burned}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop Actions (Hidden on mobile usually, but keeping visible for ease) */}
                      <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openEdit(log); }}>
                           <Edit2 className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>

                    {/* Extended Stats Row */}
                    {(log.average_heart_rate || log.elevation_gain_m) && (
                      <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                        {log.average_heart_rate && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {log.average_heart_rate} bpm
                          </span>
                        )}
                        {log.elevation_gain_m && (
                          <span className="flex items-center gap-1">
                            <Mountain className="h-3 w-3" /> {log.elevation_gain_m}m
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: DESKTOP STICKY FORM --- */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6">
           <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
             <div className="bg-muted/30 p-4 border-b">
               <h3 className="font-semibold flex items-center gap-2">
                 {editingLog ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                 {editingLog ? "Edit Entry" : "Add New Entry"}
               </h3>
             </div>
             <div className="p-4">
               <FormInstance />
               {editingLog && (
                  <Button variant="ghost" className="w-full mt-2" onClick={() => setEditingLog(null)}>
                    Cancel Editing
                  </Button>
               )}
             </div>
           </div>
        </div>

      </div>

      {/* --- MOBILE/TABLET: SHEET DRAWER FOR FORM --- */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] lg:hidden rounded-t-2xl p-0">
          <ScrollArea className="h-full">
            <div className="p-6 pb-20">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle>{editingLog ? "Edit Log" : "New Cardio Log"}</SheetTitle>
                <SheetDescription>
                  {editingLog ? "Update details below." : "Enter your session metrics."}
                </SheetDescription>
              </SheetHeader>
              <FormInstance />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* MOBILE FAB (Floating Action Button) - Visible only when list has items */}
      {cardioLogs.length > 0 && (
        <Button 
          size="icon" 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg lg:hidden z-40"
          onClick={openNew}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}