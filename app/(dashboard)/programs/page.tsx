"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Folder, Dumbbell, Trash2, X, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePrograms } from "@/hooks/use-program"; 
import { createProgram, deletePrograms } from "@/app/actions/program";
import { cn } from "@/utils"; // Ensure correct path
import { useQueryClient } from "@tanstack/react-query";

export default function ProgramsPage() {
  const { programs } = usePrograms();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false); // New explicit mode
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Handlers ---

  async function handleSubmit(formData: FormData) {
    try {
      await createProgram(formData);
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
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
      await queryClient.invalidateQueries({ queryKey: ["programs"] });
      
      // Reset State
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
      // Exit mode
      setIsSelectionMode(false);
      setSelectedIds([]);
    } else {
      // Enter mode
      setIsSelectionMode(true);
    }
  };

  const selectAll = () => {
    if (programs.data) {
      if (selectedIds.length === programs.data.length) {
        setSelectedIds([]); // Deselect all if already all selected
      } else {
        setSelectedIds(programs.data.map((p: any) => p.id));
      }
    }
  };

  // --- Render ---

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between min-h-[3.5rem]">
        
        {/* SELECTION HEADER (Mobile Friendly Action Bar) */}
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
            <div className="flex items-center justify-between w-full md:w-auto">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Programs</h2>
                <p className="text-muted-foreground text-sm">Manage your training schedules.</p>
              </div>
              
              {/* Mobile: Show "Select" button next to title on small screens */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="md:hidden text-primary" 
                onClick={toggleSelectionMode}
              >
                Select
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-2 md:mt-0">
               {/* Desktop: Select Button */}
               <Button variant="outline" className="hidden md:flex" onClick={toggleSelectionMode}>
                  <CheckSquare className="mr-2 h-4 w-4" /> Select
               </Button>

               <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    New Program
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Program</DialogTitle>
                  </DialogHeader>
                  <form action={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input name="name" placeholder="e.g. Mass Builder 2024" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" placeholder="Focus on compound lifts..." />
                    </div>
                    <Button type="submit" className="w-full">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </>
        )}
      </div>

      {/* GRID CONTENT */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {programs.isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : programs.data?.map((program: any) => {
          const isSelected = selectedIds.includes(program.id);

          // Card Content Component to avoid code duplication
          const CardInner = () => (
            <Card className={cn(
                "h-full transition-all duration-200",
                // In selection mode, give explicit border feedback
                isSelectionMode 
                  ? "cursor-pointer border-2" 
                  : "hover:bg-muted/50 border",
                // Highlight selected items
                isSelected 
                  ? "border-primary bg-primary/5 shadow-sm" 
                  : "border-border"
            )}>
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Folder className={cn(
                    "h-5 w-5 transition-colors", 
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="truncate">{program.name}</span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {program.description || "No description"}
                </CardDescription>

                {/* Visible Checkbox Indicator in Selection Mode */}
                {isSelectionMode && (
                  <div className={cn(
                    "absolute top-4 right-4 h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
                  )}>
                    {isSelected && <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Dumbbell className="h-4 w-4" />
                    {program.program_items?.[0]?.count || 0} Items
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          // LOGIC: If Selection Mode -> Div with OnClick. If View Mode -> Link.
          return isSelectionMode ? (
            <div key={program.id} onClick={() => toggleSelection(program.id)}>
              <CardInner />
            </div>
          ) : (
            <Link key={program.id} href={`/programs/${program.id}`} className="block h-full">
              <CardInner />
            </Link>
          );
        })}
      </div>
      
      {/* Empty State */}
      {!programs.isLoading && programs.data?.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl opacity-50">
           <Folder className="h-10 w-10 mx-auto mb-3" />
           <p>No programs yet.</p>
        </div>
      )}
    </div>
  );
}