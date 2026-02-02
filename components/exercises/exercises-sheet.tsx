"use client";

import { useState, useMemo, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { ExerciseFormValues, exerciseSchema } from "@/lib/validations/exercise";
import { useExerciseMutations } from "@/hooks/use-exercise";
import { useMediaQuery } from "@/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// --- NEW COMPONENT: TagInput ---
interface TagInputProps {
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

function TagInput({ placeholder, value = [], onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault();
      const newValue = [...value];
      newValue.pop();
      onChange(newValue);
    } else if (e.key === ",") {
       // Also allow comma to trigger add, but prevent the comma character
       e.preventDefault();
       const trimmed = inputValue.trim();
       if (trimmed && !value.includes(trimmed)) {
         onChange([...value, trimmed]);
         setInputValue("");
       }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="gap-1 pr-1">
          {tag}
          <div
            className="cursor-pointer hover:bg-muted rounded-full p-0.5"
            onClick={() => removeTag(tag)}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </div>
        </Badge>
      ))}
      <input
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm min-w-[120px]"
        placeholder={value.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

// --- MAIN COMPONENT ---

interface ExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToEdit?: any | null;
}

export function ExerciseSheet({ open, onOpenChange, exerciseToEdit }: ExerciseSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { create, update } = useExerciseMutations();
  const isEditing = !!exerciseToEdit;

  const defaultValues = useMemo<ExerciseFormValues>(() => {
    if (exerciseToEdit) {
      return {
        name: exerciseToEdit.name,
        category: exerciseToEdit.category || "",
        // Ensure these are arrays
        muscle_groups: exerciseToEdit.muscle_groups || [],
        equipment: exerciseToEdit.equipment || "",
        description: exerciseToEdit.description || "",
        video_url: exerciseToEdit.video_url || "",
        // Assuming aliases comes as array from DB, or split it if string
        aliases: Array.isArray(exerciseToEdit.aliases) 
          ? exerciseToEdit.aliases 
          : exerciseToEdit.aliases?.split(",").map((s: string) => s.trim()) || [],
      };
    }
    return {
      name: "",
      category: "",
      muscle_groups: [],
      equipment: "",
      description: "",
      video_url: "",
      aliases: [], // Initialize as array
    };
  }, [exerciseToEdit]);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    values: defaultValues, 
    defaultValues: defaultValues,
  });

  const onSubmit = async (values: ExerciseFormValues) => {
    try {
      // API expects arrays? Ensure data structure matches what backend needs.
      // If backend expects comma-joined strings, join them here. 
      // Assuming backend handles arrays based on previous context:
      
      const payload = {
        ...values,
        // If your DTO expects strings for these, you might need:
        // aliases: values.aliases.join(", "),
        // muscle_groups: values.muscle_groups, 
      };

      if (isEditing) {
        await update.mutateAsync({ id: exerciseToEdit.id, values: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  const isLoading = create.isPending || update.isPending;

  // Shared Form Content
  const FormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Bench Press" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="Strength" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Equipment */}
          <FormField
            control={form.control}
            name="equipment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <FormControl>
                  <Input placeholder="Barbell, Dumbbell" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Muscle Groups - UPDATED TO TAG INPUT */}
        <FormField
          control={form.control}
          name="muscle_groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Muscle Groups</FormLabel>
              <FormControl>
                <TagInput 
                  placeholder="Type & Enter (e.g. Chest)" 
                  value={field.value || []} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Instructions..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Video URL */}
        <FormField
          control={form.control}
          name="video_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Aliases - UPDATED TO TAG INPUT */}
        <FormField
          control={form.control}
          name="aliases"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aliases</FormLabel>
              <FormControl>
                <TagInput 
                  placeholder="Type & Enter (e.g. Flat Bench)" 
                  value={Array.isArray(field.value) ? field.value : []} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
        </div>
      </form>
    </Form>
  );

  // RESPONSIVE RENDER
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] px-2">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Exercise" : "New Exercise"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update exercise details." : "Add a new exercise to your library."}
            </DialogDescription>
          </DialogHeader>
          {FormContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto px-2">
        <SheetHeader className="text-left">
          <SheetTitle>{isEditing ? "Edit Exercise" : "New Exercise"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update exercise details." : "Add a new exercise to your library."}
          </SheetDescription>
        </SheetHeader>
        {FormContent}
      </SheetContent>
    </Sheet>
  );
}