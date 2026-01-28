"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExerciseFormValues, exerciseSchema } from "@/lib/validations/exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useExerciseMutations } from "@/hooks/use-exercise";

interface ExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToEdit?: any | null;
}

export function ExerciseSheet({ open, onOpenChange, exerciseToEdit }: ExerciseSheetProps) {
  const { create, update } = useExerciseMutations();
  const isEditing = !!exerciseToEdit;

  // --- CRITICAL FIX: Memoize Default Values ---
  // We compute the form values here. If exerciseToEdit is null, we return empty defaults.
  // This object is only recreated when exerciseToEdit changes.
  const defaultValues = useMemo<ExerciseFormValues>(() => {
    if (exerciseToEdit) {
      return {
        name: exerciseToEdit.name,
        category: exerciseToEdit.category || "",
        muscle_groups: exerciseToEdit.muscle_groups || [],
        equipment: exerciseToEdit.equipment || "",
        description: exerciseToEdit.description || "",
        video_url: exerciseToEdit.video_url || "",
        aliases: exerciseToEdit.aliases?.join(", ") || "",
      };
    }
    return {
      name: "",
      category: "",
      muscle_groups: [],
      equipment: "",
      description: "",
      video_url: "",
      aliases: "",
    };
  }, [exerciseToEdit]);

  // --- FIX: Use 'values' prop ---
  // Passing 'values' tells RHF to update the form whenever defaultValues changes.
  // This replaces the need for a useEffect reset loop.
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    values: defaultValues, // <--- Magic prop
    defaultValues: defaultValues, // Initial fallback
  });

  const onSubmit = async (values: ExerciseFormValues) => {
    try {
      if (isEditing) {
        await update.mutateAsync({ id: exerciseToEdit.id, values });
      } else {
        await create.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset(); // Clear form after successful submit
    } catch (error) {
      // Toast handles error
    }
  };

  const isLoading = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Exercise" : "New Exercise"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update exercise details." : "Add a new exercise to your library."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
             {/* Fields remain the same ... */}
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
            {/* ... other fields ... */}
            
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

            <FormField
              control={form.control}
              name="muscle_groups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Muscle Groups</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="Chest, Triceps" 
                        value={field.value?.join(", ")}
                        onChange={e => field.onChange(e.target.value.split(",").map(s => s.trim()))}
                    />
                  </FormControl>
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
                    <Input placeholder="Alt Name 1, Alt Name 2" {...field} />
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
      </SheetContent>
    </Sheet>
  );
}