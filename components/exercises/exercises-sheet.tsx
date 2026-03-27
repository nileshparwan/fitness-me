"use client";

import { useState, useMemo, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { ExerciseFormValues, exerciseSchema } from "@/lib/validations/exercise";
import { useExerciseMutations } from "@/hooks/use-exercise";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/app-sheet";

// --- TAG INPUT COMPONENT (Unchanged) ---
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
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 min-h-[40px]">
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

// --- MAIN SHEET COMPONENT ---

interface ExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToEdit?: any | null;
}

export function ExerciseSheet({ open, onOpenChange, exerciseToEdit }: ExerciseSheetProps) {
  const { create, update } = useExerciseMutations();
  const isEditing = !!exerciseToEdit;

  // Memoize default values
  const defaultValues = useMemo<ExerciseFormValues>(() => {
    if (exerciseToEdit) {
      return {
        name: exerciseToEdit.name,
        category: exerciseToEdit.category || "",
        equipment: exerciseToEdit.equipment || "",
        description: exerciseToEdit.description || "",
        video_url: exerciseToEdit.video_url || "",
        
        // Ensure strictly arrays
        muscle_groups: Array.isArray(exerciseToEdit.muscle_groups)
          ? exerciseToEdit.muscle_groups
          : [],
          
        aliases: Array.isArray(exerciseToEdit.aliases)
          ? exerciseToEdit.aliases
          : exerciseToEdit.aliases?.split(",").filter(Boolean) || [],
      };
    }
    
    // Default Empty State (Strictly typed)
    return {
      name: "",
      category: "",
      muscle_groups: [], // Must be initialized as []
      equipment: "",
      description: "",
      video_url: "",
      aliases: [],       // Must be initialized as []
    };
  }, [exerciseToEdit]);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
    values: defaultValues, // Keeps form in sync with prop changes
  });

  const onSubmit = async (values: ExerciseFormValues) => {
    try {
      if (isEditing) {
        await update.mutateAsync({ id: exerciseToEdit.id, values });
      } else {
        await create.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save exercise:", error);
    }
  };

  const isLoading = create.isPending || update.isPending;

  const FormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        
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
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="Strength" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="equipment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <FormControl>
                  <Input placeholder="Barbell, Dumbbell" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="muscle_groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Muscle Groups</FormLabel>
              <FormControl>
                <TagInput 
                  placeholder="Add muscle (e.g. chest, push)" 
                  value={field.value} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Include one focus tag for strength exercises: <code>push</code>, <code>pull</code>, <code>core</code>,
                or <code>legs</code>.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="aliases"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aliases</FormLabel>
              <FormControl>
                <TagInput 
                  placeholder="Add alias (e.g. Flat Bench)" 
                  value={field.value} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Instructions..." 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="video_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Exercise"}
            </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={{ tablet: "md", desktop: "md" }} className="overflow-y-auto">
        <DialogHeader className="text-left">
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
