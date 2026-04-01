"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Control } from "react-hook-form";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { WorkoutFormValues } from "@/types/workout";
import { cn } from "@/utils";

const SPORT_TYPE_OPTIONS = [
  "Strength Training",
  "Running",
  "Cycling",
  "Swimming",
  "HIIT",
  "Yoga",
  "CrossFit",
  "Hyrox",
  "Rowing",
  "Boxing",
  "Mobility / Stretching",
  "Other",
] as const;

const LOCATION_OPTIONS = [
  "Gym",
  "Home",
  "Outdoor / Track",
  "Pool",
  "Sports Field",
  "Other",
] as const;

interface WorkoutMetaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  control: Control<WorkoutFormValues>;
  programOptions: Array<{ label: string; value: string }>;
}

export function WorkoutMetaSheet({
  open,
  onOpenChange,
  control,
  programOptions,
}: WorkoutMetaSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isDesktop ? "w-[420px]" : "h-[90vh] rounded-t-[14px]"
        )}
      >
        <SheetHeader className="relative border-b border-border/60 px-5 py-4">
          <SheetTitle>Workout Details</SheetTitle>
          <SheetDescription>
            Name, date, program, sport type, location, and notes.
          </SheetDescription>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4 h-8 rounded-lg px-2 text-xs sm:hidden"
            >
              Done
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="stack-gap">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Pull Day, Leg Day A"
                      className="font-semibold"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full justify-start pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="programIds"
              render={({ field }) => {
                const selected = field.value?.[0] ?? "";

                return (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select value={selected} onValueChange={(value) => field.onChange(value ? [value] : [])}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programOptions.map((program) => (
                          <SelectItem key={program.value} value={program.value}>
                            {program.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
            />

            <FormField
              control={control}
              name="sport_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport Type</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sport type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPORT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="general-notes">
                <AccordionTrigger>General Notes</AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="General notes: strategy, cues, and progression guidance"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
