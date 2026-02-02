"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  getPrograms, createProgram, deleteProgram, updateProgramStatus, duplicateProgram, updateProgram 
} from "@/app/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Plus, Search, Utensils } from "lucide-react";
import { toast } from "sonner";
import { ProgramsTableSkeleton } from "./_components/nutrition-skeletons";
import { NutritionListItem } from "@/components/nutrition/nutrition-list-item"; 
import { useMediaQuery } from "@/hooks/use-media-query";
import { NutritionProgram } from "@/types/nutrition"; // Ensure this type exists

export default function NutritionDashboard() {
  const [search, setSearch] = useState("");
  const [editingProgram, setEditingProgram] = useState<NutritionProgram | null>(null); 
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { data: programs, isLoading, refetch } = useQuery<NutritionProgram[]>({
    queryKey: ["programs"],
    queryFn: getPrograms
  });

  const handleDelete = async (id: string) => {
    if(confirm("Delete this program?")) {
      await deleteProgram(id);
      refetch();
      toast.success("Program deleted");
    }
  };

  const handleCopy = async (id: string) => {
    toast.info("Duplicating program...");
    await duplicateProgram(id);
    refetch();
    toast.success("Program duplicated!");
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateProgramStatus(id, status);
    refetch();
    toast.success(`Status updated to ${status}`);
  };

  const handleCreateSubmit = async (formData: FormData) => {
    await createProgram(formData); 
    refetch(); 
    setIsCreateOpen(false); 
    toast.success("Program created");
  };

  const handleEditSubmit = async (formData: FormData) => {
    if(!editingProgram) return;
    await updateProgram(formData, editingProgram.id); 
    setIsEditOpen(false); 
    refetch(); 
    toast.success("Updated successfully"); 
  };

  const filteredPrograms = programs?.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.status || "").toLowerCase().includes(search.toLowerCase())
  );

  // --- JSX Definitions ---
  // We define the form content here (not as a component) to reuse in Dialog/Sheet without performance issues
  const createFormContent = (
    <form action={handleCreateSubmit} className="space-y-4 py-4">
      <div className="space-y-2"><Label>Name</Label><Input name="name" required placeholder="e.g. Cutting Phase 1" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Start</Label><Input name="start_date" type="date" required /></div>
        <div className="space-y-2"><Label>End</Label><Input name="end_date" type="date" required /></div>
      </div>
      <Button type="submit" className="w-full">Create Plan</Button>
    </form>
  );

  const editFormContent = (
    <form action={handleEditSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Name</Label>
        {/* FIX: Handle null with || "" */}
        <Input name="name" defaultValue={editingProgram?.name || ""} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>Start</Label>
            {/* FIX: Handle potentially null date strings */}
            <Input name="start_date" type="date" defaultValue={editingProgram?.start_date?.split('T')[0] || ""} />
        </div>
        <div className="space-y-2">
            <Label>End</Label>
            <Input name="end_date" type="date" defaultValue={editingProgram?.end_date?.split('T')[0] || ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        {/* FIX: Handle null description */}
        <Input name="description" defaultValue={editingProgram?.description || ""} />
      </div>
      <Button type="submit" className="w-full">Save Changes</Button>
    </form>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrition Plans</h1>
          <p className="text-muted-foreground">Manage your meal schedules.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search programs..." 
              className="pl-8" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* CREATE MODAL */}
          {isDesktop ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
              </DialogTrigger>
              <DialogContent className="px-2">
                <DialogHeader><DialogTitle>Create New Plan</DialogTitle></DialogHeader>
                {createFormContent}
              </DialogContent>
            </Dialog>
          ) : (
            <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <SheetTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-2">
                <SheetHeader className="text-left"><SheetTitle>Create New Plan</SheetTitle></SheetHeader>
                {createFormContent}
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isDesktop ? (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
            {editFormContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader className="text-left"><SheetTitle>Edit Program</SheetTitle></SheetHeader>
            {editFormContent}
          </SheetContent>
        </Sheet>
      )}

      {/* List View */}
      {isLoading ? <ProgramsTableSkeleton /> : (
        <div className="space-y-3">
          {!filteredPrograms || filteredPrograms.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
                <Utensils className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No plans found</h3>
                <p className="text-muted-foreground">Create a new nutrition plan to get started.</p>
             </div>
          ) : (
            filteredPrograms.map((program) => (
              <NutritionListItem 
                key={program.id} 
                program={program}
                onEdit={(p) => { setEditingProgram(p); setIsEditOpen(true); }}
                onDuplicate={handleCopy}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}