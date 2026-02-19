"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { 
  MoreHorizontal, 
  Pencil, 
  Copy, 
  Trash2, 
  Calendar,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose 
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { NutritionProgram } from "@/types/nutrition";

interface NutritionListItemProps {
  program: NutritionProgram; // Typed!
  onEdit: (program: NutritionProgram) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function NutritionListItem({ 
  program, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onStatusChange 
}: NutritionListItemProps) {
  
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isOpen, setIsOpen] = useState(false);

  const startDate = program.start_date ? parseISO(program.start_date) : null;
  const endDate = program.end_date ? parseISO(program.end_date) : null;

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-stone-100 text-stone-600 border-stone-200",
    archived: "bg-orange-50 text-orange-700 border-orange-200",
  };

  return (
    <div className="group relative flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all hover:bg-accent/10 sm:p-3.5">
      
      {/* Date Badge (Clickable) */}
      <Link href={`/nutrition/program/${program.id}`} className="shrink-0">
        <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl border bg-muted/20 text-muted-foreground">
          {startDate ? (
            <>
              <span className="text-[10px] uppercase font-bold leading-none">
                {format(startDate, "MMM")}
              </span>
              <span className="text-xl font-bold leading-none tracking-tight mt-0.5">
                {format(startDate, "d")}
              </span>
            </>
          ) : (
            <Calendar className="h-5 w-5 opacity-50" />
          )}
        </div>
      </Link>

      {/* Main Info (Clickable) */}
      <Link href={`/nutrition/${program.id}`} className="min-w-0 flex-1 py-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-base truncate leading-none">
            {program.name}
          </h3>
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-5 border-0 ${statusColors[program.status] || statusColors.draft}`}
          >
            {program.status}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground truncate">
          {startDate && endDate ? (
             <span>
               {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
             </span>
          ) : (
             <span className="italic">No dates scheduled</span>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" asChild className="hidden sm:flex h-8 w-8 text-muted-foreground">
           <Link href={`/nutrition/${program.id}`}><ArrowRight className="h-4 w-4"/></Link>
        </Button>

        {isDesktop ? (
          // DESKTOP: Dropdown Menu
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(program)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(program.id)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onStatusChange(program.id, "active")}>
                Mark Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(program.id, "draft")}>
                Mark Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(program.id, "archived")}>
                Archive
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(program.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // MOBILE: Sheet Drawer
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              {/* UPDATED BUTTON: Added color and background */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 -mr-1 text-primary transition-colors active:bg-primary/30 bg-primary/10 hover:bg-primary/20 sm:-mr-2"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl px-3 pb-8 sm:px-4">
              <SheetHeader className="text-left mb-4">
                <SheetTitle className="text-lg">Manage {program.name}</SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col gap-3">
                 <SheetClose asChild>
                    <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onEdit(program)}>
                      <Pencil className="mr-3 h-4 w-4" /> Edit Details
                    </Button>
                 </SheetClose>
                 
                 <SheetClose asChild>
                    <Button variant="outline" className="w-full justify-start h-12 text-base" onClick={() => onDuplicate(program.id)}>
                      <Copy className="mr-3 h-4 w-4" /> Duplicate Plan
                    </Button>
                 </SheetClose>

                 <div className="my-1 border-t" />
                 <p className="text-xs font-medium text-muted-foreground px-1">Update Status</p>
                 
                 <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    <SheetClose asChild>
                      <Button variant="outline" className="border-green-200 bg-green-50 text-green-700" onClick={() => onStatusChange(program.id, "active")}>
                        Active
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" className="border-stone-200 bg-stone-50 text-stone-700" onClick={() => onStatusChange(program.id, "draft")}>
                        Draft
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" className="border-orange-200 bg-orange-50 text-orange-700" onClick={() => onStatusChange(program.id, "archived")}>
                        Archived
                      </Button>
                    </SheetClose>
                 </div>

                 <div className="my-1 border-t" />
                 
                 <SheetClose asChild>
                    <Button variant="destructive" className="w-full justify-start h-12 text-base" onClick={() => onDelete(program.id)}>
                      <Trash2 className="mr-3 h-4 w-4" /> Delete Program
                    </Button>
                 </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
