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
import { Plus, Search, Utensils, TrendingUp, LayoutGrid, List, MoreVertical, Copy, Trash2, Pencil, Eye, EyeOff, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ProgramsTableSkeleton } from "./_components/nutrition-skeletons"; // Ensure this path is correct
import { NutritionListItem } from "@/components/nutrition/nutrition-list-item"; 
import { useMediaQuery } from "@/hooks/use-media-query";
import { NutritionProgram } from "@/types/nutrition";
import Link from "next/link";
import { cn } from "@/utils";
import { format, parseISO } from "date-fns";

// --- Extracted Grid Card Component ---
const NutritionGridCard = ({ 
  program, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onStatusChange 
}: { 
  program: NutritionProgram; 
  onEdit: (p: NutritionProgram) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) => {
  const isActive = program.status === 'active';
  
  return (
    <Card className={cn(
       "group relative overflow-hidden transition-all duration-200",
       "w-[200px] h-[130px] shrink-0", 
       "flex flex-col justify-between",
       "hover:shadow-md hover:border-primary/50 border-border bg-card"
    )}>
     <CardContent className="p-3 flex flex-col h-full">
       
       {/* Top Row: Icon & Menu */}
       <div className="flex items-start justify-between mb-2">
         <div className={cn(
           "flex items-center justify-center w-8 h-8 rounded-lg",
           "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500"
         )}>
           <Utensils className="h-4 w-4 fill-current" />
         </div>

         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-muted-foreground/50 hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(program); }}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(program.id); }}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(program.id, isActive ? 'draft' : 'active'); }}>
                 {isActive ? <EyeOff className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
                 {isActive ? "Set Draft" : "Set Active"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(program.id); }} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
       </div>

       {/* Middle: Text */}
       <div className="flex-1 min-w-0 flex flex-col justify-center">
         <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
           {program.name}
         </h3>
         <div className="flex items-center gap-1.5 mt-0.5">
           {!isActive && (
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground border px-1 rounded-sm">Draft</span>
           )}
           <p className="text-[10px] text-muted-foreground truncate">
             {program.start_date ? format(parseISO(program.start_date), "MMM d") : "No date"}
           </p>
         </div>
       </div>

       {/* Footer: Date Range / Status */}
       <div className="mt-2 pt-2 border-t flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
         <CalendarDays className="h-3 w-3" />
         <span>
            {program.end_date 
              ? `${Math.ceil((new Date(program.end_date).getTime() - new Date(program.start_date!).getTime()) / (1000 * 60 * 60 * 24))} Days` 
              : "Ongoing"
            }
         </span>
       </div>

     </CardContent>
    </Card>
  );
};

export default function NutritionDashboard() {
  const [view, setView] = useState<"grid" | "list">("grid"); // NEW: View State
  const [search, setSearch] = useState("");
  const [editingProgram, setEditingProgram] = useState<NutritionProgram | null>(null); 
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { data: programs, isLoading, refetch } = useQuery<NutritionProgram[]>({
    queryKey: ["nutrition-programs"],
    queryFn: getPrograms
  });

  // --- Handlers ---
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

  // --- Forms ---
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
        <Input name="name" defaultValue={editingProgram?.name || ""} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>Start</Label>
            <Input name="start_date" type="date" defaultValue={editingProgram?.start_date?.split('T')[0] || ""} />
        </div>
        <div className="space-y-2">
            <Label>End</Label>
            <Input name="end_date" type="date" defaultValue={editingProgram?.end_date?.split('T')[0] || ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
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

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
          
          {/* Search */}
          <div className="relative w-full sm:w-auto md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             {/* View Toggle */}
             <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")} className="w-auto">
                <TabsList className="grid w-[80px] grid-cols-2 h-9">
                  <TabsTrigger value="grid" className="px-2"><LayoutGrid className="h-4 w-4"/></TabsTrigger>
                  <TabsTrigger value="list" className="px-2"><List className="h-4 w-4"/></TabsTrigger>
                </TabsList>
             </Tabs>

             {/* Progress Link */}
             <Link href="/progress/nutrition">
              <Button variant="outline" size="icon" title="Progress">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </Link>

            {/* CREATE MODAL */}
            {isDesktop ? (
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" /> New</Button>
                </DialogTrigger>
                <DialogContent className="px-2">
                    <DialogHeader><DialogTitle>Create New Plan</DialogTitle></DialogHeader>
                    {createFormContent}
                </DialogContent>
                </Dialog>
            ) : (
                <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <SheetTrigger asChild>
                    <Button size="icon"><Plus className="h-4 w-4" /></Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-xl px-2">
                    <SheetHeader className="text-left"><SheetTitle>Create New Plan</SheetTitle></SheetHeader>
                    {createFormContent}
                </SheetContent>
                </Sheet>
            )}
          </div>
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

      {/* CONTENT AREA */}
      {isLoading ? <ProgramsTableSkeleton /> : (
        <>
           {!filteredPrograms || filteredPrograms.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
                <Utensils className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No plans found</h3>
                <p className="text-muted-foreground">Create a new nutrition plan to get started.</p>
             </div>
           ) : (
             <>
               {/* GRID VIEW */}
               <div className={cn("flex flex-wrap gap-4", view === "list" && "hidden")}>
                  {filteredPrograms.map((program) => (
                    <Link key={program.id} href={`/nutrition/${program.id}`} className="block">
                      <NutritionGridCard 
                        program={program}
                        onEdit={(p) => { setEditingProgram(p); setIsEditOpen(true); }}
                        onDuplicate={handleCopy}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    </Link>
                  ))}
               </div>

               {/* LIST VIEW */}
               <div className={cn("space-y-3", view === "grid" && "hidden")}>
                  {filteredPrograms.map((program) => (
                    <NutritionListItem 
                        key={program.id} 
                        program={program}
                        onEdit={(p) => { setEditingProgram(p); setIsEditOpen(true); }}
                        onDuplicate={handleCopy}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                    />
                  ))}
               </div>
             </>
           )}
        </>
      )}
    </div>
  );
}