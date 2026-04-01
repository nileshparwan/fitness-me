"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Plus, Folder, Dumbbell, Trash2, X, CheckSquare, Loader2, LayoutGrid, List 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Removed unused imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/app-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useInfinitePrograms } from "@/hooks/use-program"; 
import { createProgram, deletePrograms } from "@/app/actions/program";
import { trainingKeys } from "@/lib/query-keys-training";
import { cn } from "@/utils"; 
import { useQueryClient } from "@tanstack/react-query";
import { ProgramListItem } from "@/components/program/program-list-item";
import { withToastFeedback } from "@/lib/ui/toast-feedback";

// --- Extracted Grid Card Component ---
// This prevents re-creation on every render and keeps the main component clean.
const ProgramGridCard = ({ 
  program, 
  isSelectionMode, 
  isSelected 
}: { 
  program: any; 
  isSelectionMode: boolean; 
  isSelected: boolean; 
}) => (
  <Card className={cn(
     "group relative overflow-hidden transition-all duration-200",
     "w-[200px] h-[130px] shrink-0 py-2!", 
     "flex flex-col justify-between",
     isSelectionMode ? "cursor-pointer" : "hover:shadow-md hover:border-primary/50",
     isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card",
  )}>
   <CardContent className="md:px-3 flex flex-col h-full">
     
     {/* Top Row: Icon & Selection */}
     <div className="flex items-start justify-between mb-2">
       <div className={cn(
         "flex items-center justify-center w-8 h-8 rounded-lg",
         "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500"
       )}>
         <Folder className="h-4 w-4 fill-current" />
       </div>

       {isSelectionMode && (
         <div className={cn(
           "h-4 w-4 rounded border flex items-center justify-center transition-all",
           isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
         )}>
           {isSelected && <CheckSquare className="h-2.5 w-2.5 text-primary-foreground" />}
         </div>
       )}
     </div>

     {/* Middle: Text */}
     <div className="flex-1 min-w-0 flex flex-col justify-center">
       <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
         {program.name}
       </h3>
       <p className="text-[10px] text-muted-foreground truncate mt-0.5">
         {program.description || "No description"}
       </p>
     </div>

     {/* Footer: Count */}
     <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
       <Dumbbell className="h-3 w-3" />
       <span>{program.training_plan_items?.[0]?.count || 0} Items</span>
     </div>

   </CardContent>
  </Card>
);

export default function ProgramsPage() {
  const programs = useInfinitePrograms();
  const queryClient = useQueryClient();
  const programRows = programs.data?.pages.flatMap((page) => page.data) || [];
  const totalPrograms = programs.data?.pages?.[0]?.total ?? programRows.length;

  // State
  const [view, setView] = useState<"grid" | "list">("grid"); // Defaulted to grid to show changes
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Handlers ---

  async function handleSubmit(formData: FormData) {
    try {
      await createProgram(formData);
      await queryClient.invalidateQueries({ queryKey: trainingKeys.plans() });
      setIsOpen(false);
      toast.success("Program created!");
    } catch (e) {
      toast.error("Failed to create program");
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} programs? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await withToastFeedback(
        (async () => {
          await deletePrograms(selectedIds);
          await queryClient.invalidateQueries({ queryKey: trainingKeys.plans() });
        })(),
        {
          loading: "Deleting programs...",
          success: "Deleted successfully",
          error: "Delete failed",
        }
      );
      setSelectedIds([]); 
      setIsSelectionMode(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds([]);
    } else {
      setIsSelectionMode(true);
    }
  };

  const selectAll = () => {
    if (programRows.length > 0) {
      if (selectedIds.length === programRows.length) {
        setSelectedIds([]); 
      } else {
        setSelectedIds(programRows.map((p: any) => p.id));
      }
    }
  };

  // Shared Form Component
  const CreateProgramForm = () => (
    <form action={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input name="name" placeholder="e.g. Mass Builder 2024" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea name="description" placeholder="Focus on compound lifts..." />
      </div>
      <Button type="submit" className="w-full">Create Program</Button>
    </form>
  );

  return (
    <div className="page-shell section-gap pb-24 md:pb-12">
      {/* HEADER BAR */}
      <div className="flex min-h-[3.5rem] flex-col gap-4">
        
        {/* SELECTION HEADER */}
        {isSelectionMode ? (
          <div className="flex w-full items-center justify-between rounded-[10px] border border-primary/20 bg-primary/10 p-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleSelectionMode} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
              <span className="font-semibold">{selectedIds.length} Selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {programRows.length > 0 && selectedIds.length === programRows.length ? "None" : "All"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete} 
                disabled={isDeleting || selectedIds.length === 0}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-0 h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        ) : (
          /* STANDARD HEADER */
          <>
            <div className="flex w-full flex-wrap items-start justify-between gap-3">
              <div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Program Timelines</h1>
                  <p className="text-sm text-muted-foreground">{totalPrograms} programs</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 {/* SELECT MODE */}
                 <Button type="button" variant="outline" className="border-border/60 bg-muted/20 px-4 text-muted-foreground hover:text-foreground" onClick={toggleSelectionMode}>
                    <CheckSquare className="mr-0 h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Select</span>
                 </Button>

                 {/* CREATE ACTION */}
                 <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button className="accent-strong px-4 text-black sm:px-5">
                      <Plus className="mr-0 h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">New Program</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent size={{ tablet: "md", desktop: "md" }}>
                    <DialogHeader><DialogTitle>Create New Program</DialogTitle></DialogHeader>
                    <CreateProgramForm />
                  </DialogContent>
                 </Dialog>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="inline-flex rounded-[10px] border border-border/60 bg-muted/20 p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", view === "list" ? "bg-chart-5/15 text-chart-5" : "text-muted-foreground")}
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn("h-8 w-8", view === "grid" ? "bg-chart-1/18 text-chart-1" : "text-muted-foreground")}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      

      {/* CONTENT AREA */}
      {programs.isLoading ? (
         <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-[10px]" />)}
         </div>
      ) : (
        <>
          {/* GRID VIEW */}
          {/* Use Flex Wrap for tight packing of fixed-width cards */}
          <div className={cn("flex flex-wrap gap-4", view === "list" && "hidden")}>
             {programRows.map((program: any) => {
                const isSelected = selectedIds.includes(program.id);
                
                return isSelectionMode ? (
                  <div key={program.id} onClick={() => toggleSelection(program.id)}>
                    <ProgramGridCard 
                        program={program} 
                        isSelectionMode={true} 
                        isSelected={isSelected} 
                    />
                  </div>
                ) : (
                  <Link key={program.id} href={`/programs/${program.id}`} className="block">
                    <ProgramGridCard 
                        program={program} 
                        isSelectionMode={false} 
                        isSelected={isSelected} 
                    />
                  </Link>
                );
             })}
          </div>

          {/* LIST VIEW */}
          <div className={cn("space-y-3", view === "grid" && "hidden")}>
            {programRows.map((program: any) => {
              const isSelected = selectedIds.includes(program.id);
              return isSelectionMode ? (
                <div key={program.id} onClick={() => toggleSelection(program.id)}>
                   <ProgramListItem program={program} isSelected={isSelected} isSelectionMode={true} />
                </div>
              ) : (
                <Link key={program.id} href={`/programs/${program.id}`}>
                   <ProgramListItem program={program} isSelected={isSelected} isSelectionMode={false} />
                </Link>
              );
            })}
          </div>

          {/* Empty State */}
          {programRows.length === 0 && (
            <div className="py-12 text-center opacity-50 rounded-[10px] border-2 border-dashed">
               <Folder className="h-10 w-10 mx-auto mb-3" />
               <p>No programs yet.</p>
            </div>
          )}

          {programs.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => programs.fetchNextPage()} disabled={programs.isFetchingNextPage}>
                {programs.isFetchingNextPage ? "Loading..." : "Load more programs"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
