"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Plus, Folder, Dumbbell, Trash2, X, CheckSquare, Loader2, LayoutGrid, List 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Removed unused imports
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePrograms } from "@/hooks/use-program"; 
import { createProgram, deletePrograms } from "@/app/actions/program";
import { cn } from "@/utils"; 
import { useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ProgramListItem } from "@/components/program/program-list-item";

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
     // Dimensions
     "w-[200px] h-[130px] shrink-0", 
     // Flex Layout
     "flex flex-col justify-between",
     // Hover & Selection States
     isSelectionMode ? "cursor-pointer" : "hover:shadow-md hover:border-primary/50",
     isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card"
  )}>
   <CardContent className="p-3 flex flex-col h-full">
     
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
       <span>{program.program_items?.[0]?.count || 0} Items</span>
     </div>

   </CardContent>
  </Card>
);

export default function ProgramsPage() {
  const { programs } = usePrograms();
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
      await queryClient.invalidateQueries({ queryKey: ["workout-programs"] });
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
      await deletePrograms(selectedIds);
      await queryClient.invalidateQueries({ queryKey: ["workout-programs"] });
      setSelectedIds([]); 
      setIsSelectionMode(false);
      toast.success("Deleted successfully");
    } catch {
      toast.error("Delete failed");
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
    if (programs.data) {
      if (selectedIds.length === programs.data.length) {
        setSelectedIds([]); 
      } else {
        setSelectedIds(programs.data.map((p: any) => p.id));
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
    <div className="space-y-6 pb-24 md:pb-12 px-2">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between min-h-[3.5rem]">
        
        {/* SELECTION HEADER */}
        {isSelectionMode ? (
          <div className="w-full bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleSelectionMode} className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
              <span className="font-semibold">{selectedIds.length} Selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {programs.data && selectedIds.length === programs.data.length ? "None" : "All"}
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete} 
                disabled={isDeleting || selectedIds.length === 0}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                <span className="sr-only md:not-sr-only">Delete</span>
              </Button>
            </div>
          </div>
        ) : (
          /* STANDARD HEADER */
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Programs</h2>
                  <p className="text-muted-foreground text-sm">Manage your training schedules.</p>
                </div>
                 {/* Mobile Select Button */}
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden text-primary" 
                    onClick={toggleSelectionMode}
                  >
                    Select
                  </Button>
              </div>

              <div className="flex items-center gap-2">
                 {/* VIEW TOGGLE TAB */}
                 <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")} className="w-auto">
                    <TabsList className="grid w-[100px] grid-cols-2">
                      <TabsTrigger value="grid" title="Grid View"><LayoutGrid className="h-4 w-4"/></TabsTrigger>
                      <TabsTrigger value="list" title="List View"><List className="h-4 w-4"/></TabsTrigger>
                    </TabsList>
                 </Tabs>

                 {/* DESKTOP SELECT */}
                 <Button variant="outline" className="hidden md:flex" onClick={toggleSelectionMode}>
                    <CheckSquare className="mr-2 h-4 w-4" /> Select
                 </Button>

                 {/* CREATE ACTION */}
                 {isDesktop ? (
                   <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="mr-2 h-4 w-4" /> New</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader><DialogTitle>Create New Program</DialogTitle></DialogHeader>
                      <CreateProgramForm />
                    </DialogContent>
                   </Dialog>
                 ) : (
                   <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                      <Button size="icon" className="w-10 h-10"><Plus className="h-5 w-5" /></Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-xl h-[80vh] px-2">
                      <SheetHeader className="text-left mb-4"><SheetTitle>Create New Program</SheetTitle></SheetHeader>
                      <CreateProgramForm />
                    </SheetContent>
                   </Sheet>
                 )}
              </div>
            </div>
          </>
        )}
      </div>

      

      {/* CONTENT AREA */}
      {programs.isLoading ? (
         <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
         </div>
      ) : (
        <>
          {/* GRID VIEW */}
          {/* Use Flex Wrap for tight packing of fixed-width cards */}
          <div className={cn("flex flex-wrap gap-4", view === "list" && "hidden")}>
             {programs.data?.map((program: any) => {
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
            {programs.data?.map((program: any) => {
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
          {programs.data?.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl opacity-50">
               <Folder className="h-10 w-10 mx-auto mb-3" />
               <p>No programs yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}