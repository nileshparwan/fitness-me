"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { nutritionProgramKeys } from "@/lib/query-keys-nutrition-program";
import { toast } from "sonner";

// Actions
import { 
  getProgramById, getProgramMeals, updateProgramStatus, updateProgramNotes, deleteMeal, updateMealPositions, getProgramOptions, updateMealStatus
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/responsive-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, CalendarDays, FileText, MoreHorizontal, Trash2 } from "lucide-react";

import { AddMealDialog } from "@/components/nutrition/add-meal-dialog";
import { SortableMealCard } from "@/components/nutrition/sortable-meal-card";
import { NutritionAnalytics } from "@/components/nutrition/nutrition-analytics";
import { ShareProgramDialog } from "@/components/nutrition/share-program-dialog";
import { NutritionProgramDetailSkeleton } from "../_components/nutrition-program-skeleton";
import { NutritionMeal, NutritionProgram, ProgramSummary } from "@/types/nutrition";
import NotFound from "@/app/not-found";

const DownloadNutritionButton = dynamic(
  () => import("@/components/nutrition/download-nutrition-button"),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled>PDF</Button> }
);

export default function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // State
  const [notesBuffer, setNotesBuffer] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false); // State for Notes Modal
  const [orderedMeals, setOrderedMeals] = useState<NutritionMeal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 1. Queries
  const { data: program, isLoading: progLoading, refetch: refetchProg } = useQuery<NutritionProgram | null>({
    queryKey: nutritionProgramKeys.plan(id),
    queryFn: async () => {
      const data = await getProgramById(id);

      // If data is null, we return null. 
      // The Type Generic <NutritionProgram | null> now accepts this.
      if (!data) return null;

      setNotesBuffer(data.notes || "");
      return data;
    }
});

  const { data: meals, refetch: refetchMeals, isLoading: mealsLoading } = useQuery<NutritionMeal[]>({
    queryKey: nutritionProgramKeys.planMeals(id),
    queryFn: () => getProgramMeals(id),
    enabled: !!program 
  });

  const { data: allPrograms } = useQuery<ProgramSummary[]>({
    queryKey: nutritionProgramKeys.planOptions(),
    queryFn: getProgramOptions
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
      await updateMealPositions(updatedWithPositions.map((m) => ({ id: m.id, position: m.position! })), id);
    } catch (err) {
      toast.error("Failed to save order");
      refetchMeals();
    }
  };
  
  const handleDeleteMeal = async (mealId: string) => {
    if (confirm("Delete this meal?")) {
      setOrderedMeals(prev => prev.filter(m => m.id !== mealId));
      setSelectedIds(prev => prev.filter(id => id !== mealId));
      await deleteMeal(mealId);
      refetchMeals();
    }
  };

  const handleBulkDelete = async () => {
    if(!confirm(`Delete ${selectedIds.length} items?`)) return;
    setOrderedMeals(prev => prev.filter(m => !selectedIds.includes(m.id)));
    const idsToDelete = [...selectedIds];
    setSelectedIds([]);

    try {
      await Promise.all(idsToDelete.map(id => deleteMeal(id)));
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
    setIsNotesOpen(false);
  };

  const handleStatusChange = async (val: string) => {
    await updateProgramStatus(id, val);
    refetchProg();
    toast.success(`Status updated to ${val}`);
  };

  const handleMealStatusChange = async (mealId: string, newStatus: 'active' | 'draft') => {
    // Optimistic Update
    setOrderedMeals(prev => prev.map(m => 
      m.id === mealId ? { ...m, status: newStatus } : m
    ));
    
    try {
      await updateMealStatus(mealId, newStatus);
      toast.success(`Meal marked as ${newStatus}`);
      refetchMeals(); // Sync with server to be safe
    } catch (error) {
      toast.error("Failed to update status");
      refetchMeals(); // Revert
    }
  };

  // --- RENDER HELPERS ---
  const NotesForm = (
    <div className="space-y-4 pt-4">
      <Textarea 
        value={notesBuffer} 
        onChange={(e) => setNotesBuffer(e.target.value)} 
        className="min-h-[200px]" 
        placeholder="Add general notes for this nutrition plan..."
      />
      <Button onClick={handleSaveNotes} className="w-full">Save Notes</Button>
    </div>
  );

  if (progLoading || mealsLoading) return <NutritionProgramDetailSkeleton />;
  if (!program) return NotFound();

  return (
    <div className="page-shell section-gap relative mx-auto max-w-4xl pb-40">
      
      {/* RESPONSIVE HEADER */}
      <div className="flex flex-col gap-4">
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
                         {program.start_date && format(parseISO(program.start_date), "MMM d")} - {program.end_date && format(parseISO(program.end_date), "MMM d")}
                      </div>
                   </div>
                </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden gap-1">
               <ShareProgramDialog programId={id} programName={program.name} />
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuItem onSelect={() => setIsNotesOpen(true)}>
                        <FileText className="mr-2 h-4 w-4" /> Notes
                     </DropdownMenuItem>
                     <div className="p-2">
                        <DownloadNutritionButton program={program} meals={orderedMeals} />
                     </div>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={() => setIsNotesOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" /> Notes
               </Button>
               <ShareProgramDialog programId={id} programName={program.name} />
               <DownloadNutritionButton program={program} meals={orderedMeals} />
            </div>
         </div>
         
         <div className="flex items-center justify-between gap-4 border-b pb-4">
             <div className="flex items-center gap-3">
               <Select defaultValue={program.status || 'draft'} onValueChange={handleStatusChange}>
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

      <NutritionAnalytics meals={orderedMeals} />

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
                {orderedMeals.map((meal) => (
                   <SortableMealCard 
                      key={meal.id} 
                      meal={meal} 
                      isSelected={selectedIds.includes(meal.id)}
                      onSelect={(c) => handleSelect(meal.id, c)}
                      onDelete={handleDeleteMeal}
                      programs={allPrograms || []}
                      onStatusChange={handleMealStatusChange}
                    />
                ))}
              </div>
            </SortableContext>
         </DndContext>
      </div>

      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent size={{ tablet: "md", desktop: "lg" }}>
          <DialogHeader><DialogTitle>Program Notes</DialogTitle></DialogHeader>
          {NotesForm}
        </DialogContent>
      </Dialog>

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
