"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  getPrograms, createProgram, deleteProgram, updateProgramStatus, duplicateProgram, updateProgram 
} from "@/app/actions/nutrition";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Trash2, MoreHorizontal, Search, Copy, Pencil, Loader2, ArrowRight 
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ProgramsTableSkeleton } from "./_components/nutrition-skeletons";

export default function NutritionDashboard() {
  const [search, setSearch] = useState("");
  const [editingProgram, setEditingProgram] = useState<any>(null); // For Edit Dialog
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: programs, isLoading, refetch } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms
  });

  // Handlers
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

  // Search Filter
  const filteredPrograms = programs?.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.status.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
    draft: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
    archived: "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200",
  };

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
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Plan</DialogTitle></DialogHeader>
              <form action={async (fd) => { await createProgram(fd); refetch(); }} className="space-y-4 py-4">
                <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Start</Label><Input name="start_date" type="date" required /></div>
                  <div className="space-y-2"><Label>End</Label><Input name="end_date" type="date" required /></div>
                </div>
                <Button type="submit" className="w-full">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog (Controlled) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
          <form action={async (fd) => { await updateProgram(fd, editingProgram.id); setIsEditOpen(false); refetch(); toast.success("Updated"); }} className="space-y-4 py-4">
            <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editingProgram?.name} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start</Label><Input name="start_date" type="date" defaultValue={editingProgram?.start_date} /></div>
              <div className="space-y-2"><Label>End</Label><Input name="end_date" type="date" defaultValue={editingProgram?.end_date} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input name="description" defaultValue={editingProgram?.description} /></div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      {isLoading ? <ProgramsTableSkeleton /> : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Program Name</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No results found.</TableCell>
                </TableRow>
              ) : (
                filteredPrograms?.map((program: any) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-base">{program.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{program.description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(program.start_date), "MMM d")} - {format(parseISO(program.end_date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusColors[program.status]} capitalize`}>
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                         <Button variant="secondary" size="sm" asChild className="hidden sm:flex">
                           <Link href={`/nutrition/program/${program.id}`}>Open <ArrowRight className="ml-2 h-3 w-3"/></Link>
                         </Button>
                         
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingProgram(program); setIsEditOpen(true); }}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(program.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Set Status</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleStatusChange(program.id, "active")}>Active</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(program.id, "draft")}>Draft</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(program.id, "archived")}>Archived</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(program.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}