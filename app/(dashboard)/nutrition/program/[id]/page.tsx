"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Actions
import { 
  getProgramMeals, updateProgramStatus, updateProgramNotes, deleteMeal, updateMealPositions, getPrograms 
} from "@/app/actions/nutrition";

// dnd-kit
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from "@dnd-kit/sortable";

// Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, ExternalLink, CalendarDays, FileText, ChevronDown, Save, MoreHorizontal, X, Trash2 } from "lucide-react";

import { AddMealDialog } from "@/components/nutrition/add-meal-dialog";
import { SortableMealCard } from "@/components/nutrition/sortable-meal-card";
import { NutritionAnalytics } from "@/components/nutrition/nutrition-analytics";
import { ShareProgramDialog } from "@/components/nutrition/share-program-dialog";
import { NutritionProgramDetailSkeleton } from "../../_components/nutrition-program-skeleton";

const DownloadNutritionButton = dynamic(
  () => import("@/components/nutrition/download-nutrition-button"),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled>PDF</Button> }
);

export default function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const [notesBuffer, setNotesBuffer] = useState("");
  const [orderedMeals, setOrderedMeals] = useState<any[]>([]);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. Queries
  const { data: program, isLoading: progLoading, refetch: refetchProg } = useQuery({
    queryKey: ["program-meta", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nutrition_programs").select("*").eq("id", id).single();
      if (error) throw error;
      setNotesBuffer(data.notes || "");
      return data;
    }
  });

  const { data: meals, refetch: refetchMeals, isLoading: mealsLoading } = useQuery({
    queryKey: ["program-meals", id],
    queryFn: () => getProgramMeals(id),
    enabled: !!program 
  });

  const { data: allPrograms } = useQuery({
    queryKey: ["all-programs"],
    queryFn: getPrograms
  });

  // 2. Sync State
  useEffect(() => {
    if (meals) {
      const sorted = [...meals].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setOrderedMeals(sorted);
    }
  }, [meals]);

  // 3. Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedMeals.findIndex((m) => m.id === active.id);
    const newIndex = orderedMeals.findIndex((m) => m.id === over.id);
    const newItems = arrayMove(orderedMeals, oldIndex, newIndex);
    
    const updatedWithPositions = newItems.map((item, idx) => ({ ...item, position: idx }));
    setOrderedMeals(updatedWithPositions);

    try {
      await updateMealPositions(updatedWithPositions.map((m) => ({ id: m.id, position: m.position })), id);
    } catch (err) {
      toast.error("Failed to save order");
      refetchMeals();
    }
  };

  // const handleToggle = async (mealId: string, current: boolean) => {
  //   setOrderedMeals(prev => prev.map(m => m.id === mealId ? { ...m, is_completed: !current } : m));
  //   await toggleMealCompletion(mealId, !current);
  //   refetchMeals();
  // };

  const handleDeleteMeal = async (mealId: string) => {
    if (confirm("Delete this meal?")) {
      setOrderedMeals(prev => prev.filter(m => m.id !== mealId));
      setSelectedIds(prev => prev.filter(id => id !== mealId)); // Remove from selection
      await deleteMeal(mealId);
      refetchMeals();
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if(!confirm(`Delete ${selectedIds.length} items?`)) return;

    // Optimistic UI
    setOrderedMeals(prev => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);

    // Server Requests (Looping deletes is simplest for Supabase RLS consistency)
    try {
      await Promise.all(selectedIds.map(id => deleteMeal(id)));
      toast.success("Items deleted");
      refetchMeals();
    } catch(e) {
      toast.error("Error deleting items");
      refetchMeals();
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if(checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleSaveNotes = async () => {
    await updateProgramNotes(id, notesBuffer);
    toast.success("Notes saved");
  };

  const handleStatusChange = async (val: string) => {
    await updateProgramStatus(id, val);
    refetchProg();
    toast.success(`Status updated to ${val}`);
  };

  if (progLoading || mealsLoading) return <NutritionProgramDetailSkeleton />;
  if (!program) return <div>Not Found</div>;

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto pb-40 space-y-4 relative">
      
      {/* --- RESPONSIVE HEADER --- */}
      <div className="flex flex-col gap-4">
         {/* Top Row: Back + Title + Mobile Actions */}
         <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
                <Link href="/nutrition">
                  <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2"><ArrowLeft className="h-5 w-5" /></Button>
                </Link>
                <div className="min-w-0">
                   <h1 className="text-xl md:text-2xl font-bold truncate pr-2">{program.name}</h1>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Badge variant={program.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 capitalize rounded-sm">
                         {program.status}
                      </Badge>
                      <span className="hidden sm:inline">•</span>
                      <div className="hidden md:flex flex-wrap items-center gap-1">
                         <CalendarDays className="h-3 w-3" />
                         {format(parseISO(program.start_date), "MMM d")} - {format(parseISO(program.end_date), "MMM d")}
                      </div>
                   </div>
                </div>
            </div>

            {/* Mobile: Dropdown Menu for Secondary Actions */}
            <div className="flex md:hidden gap-1">
               <ShareProgramDialog programId={id} programName={program.name} />
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <Dialog>
                        <DialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <FileText className="mr-2 h-4 w-4" /> Notes
                           </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                           <DialogHeader><DialogTitle>Notes</DialogTitle></DialogHeader>
                           <Textarea value={notesBuffer} onChange={(e) => setNotesBuffer(e.target.value)} className="min-h-[150px]" />
                           <Button onClick={handleSaveNotes}>Save</Button>
                        </DialogContent>
                     </Dialog>
                     <div className="p-2">
                        <DownloadNutritionButton program={program} meals={orderedMeals} />
                     </div>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>

            {/* Desktop: Full Actions */}
            <div className="hidden md:flex items-center gap-2">
               <Dialog>
                 <DialogTrigger asChild>
                   <Button variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" /> Notes</Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader><DialogTitle>Notes</DialogTitle></DialogHeader>
                   <Textarea value={notesBuffer} onChange={(e) => setNotesBuffer(e.target.value)} className="min-h-[150px]" />
                   <Button onClick={handleSaveNotes}>Save</Button>
                 </DialogContent>
               </Dialog>
               
               <ShareProgramDialog programId={id} programName={program.name} />
               <DownloadNutritionButton program={program} meals={orderedMeals} />
            </div>
         </div>
         
         {/* Action Bar: Status & Add Meal (Always visible) */}
         <div className="flex items-center justify-between gap-4 border-b pb-4">
             <div className="flex items-center gap-3">
               <Select defaultValue={program.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 w-[110px] text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                 </Select>
                 <span className="text-sm text-muted-foreground hidden sm:inline-block">
                    {orderedMeals.length} Meals
                 </span>
             </div>
             <AddMealDialog programId={program.id} />
         </div>
      </div>

      {/* --- ANALYTICS --- */}
      <NutritionAnalytics meals={orderedMeals} />

      {/* --- SORTABLE LIST --- */}
      <div>
         <div className="flex items-center justify-between mb-2 px-1">
             <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Plan Schedule</h2>
             {selectedIds.length > 0 && (
                <span className="text-xs text-primary font-medium">{selectedIds.length} selected</span>
             )}
         </div>

         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedMeals.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="pb-10 min-h-[200px]">
                {orderedMeals.map((meal: any) => (
                   <SortableMealCard 
                      key={meal.id} 
                      meal={meal} 
                      isSelected={selectedIds.includes(meal.id)}
                      onSelect={(c) => handleSelect(meal.id, c)}
                      // onToggle={handleToggle}
                      onDelete={handleDeleteMeal}
                      programs={allPrograms || []}
                    />
                ))}
              </div>
            </SortableContext>
         </DndContext>
      </div>

      {/* --- BULK ACTIONS FLOATING BAR --- */}
      {selectedIds.length > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-foreground text-background p-3 rounded-lg shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5 fade-in">
            <div className="flex items-center gap-3 pl-2">
               <div className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                  {selectedIds.length}
               </div>
               <span className="text-sm font-medium">Items selected</span>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" className="text-muted hover:text-white h-8" onClick={() => setSelectedIds([])}>
                  Cancel
               </Button>
               <Button variant="destructive" size="sm" className="h-8" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
               </Button>
            </div>
         </div>
      )}
    </div>
  );
}