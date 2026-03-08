"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/responsive-modal";
import { NutritionProgram } from "@/types/nutrition";

interface ProgramSelectorProps {
  programs: NutritionProgram[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ProgramSelector({ programs, selectedId, onSelect }: ProgramSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectedProgram = programs.find((p) => p.id === selectedId);

  // Shared List Component to avoid duplication
  const ProgramList = () => (
    <Command>
      <CommandInput placeholder="Search programs..." />
      <CommandList>
        <CommandEmpty>No program found.</CommandEmpty>
        <CommandGroup>
          {programs.map((program) => (
            <CommandItem
              key={program.id}
              value={program.name} // Allows searching by name
              onSelect={() => {
                onSelect(program.id);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedId === program.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex flex-col">
                <span>{program.name}</span>
                <span className="text-xs text-muted-foreground">
                  {program.start_date?.split("T")[0]}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between"
          >
            {selectedProgram ? selectedProgram.name : "Select program..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <ProgramList />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedProgram ? selectedProgram.name : "Select program..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent size={{ tablet: "md", desktop: "md" }} className="p-0">
        <DialogHeader className="p-4 pb-0 text-left">
          <DialogTitle>Select Nutrition Plan</DialogTitle>
        </DialogHeader>
        <div className="h-full p-2">
          <ProgramList />
        </div>
      </DialogContent>
    </Dialog>
  );
}
