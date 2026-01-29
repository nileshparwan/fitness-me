"use client";

import { useState } from "react";
import { Plus, ChefHat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { addMeal } from "@/app/actions/nutrition";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query"; // 1. IMPORT THIS

interface Props {
  programId: string;
}

export function AddMealDialog({ programId }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient(); // 2. HOOK

  async function action(formData: FormData) {
    try {
      await addMeal(formData, programId);
      
      // 3. INVALIDATE THE QUERY
      // This forces the main page to fetch the new list immediately
      await queryClient.invalidateQueries({ queryKey: ["program-meals", programId] });

      toast.success("Meal added successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to add meal");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Meal
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Meal</DialogTitle>
        </DialogHeader>
        
        <form action={action} className="grid gap-5 py-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meal Type</Label>
              <Select name="meal_type" defaultValue="breakfast">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="pre_workout">Pre-Workout</SelectItem>
                  <SelectItem value="post_workout">Post-Workout</SelectItem>
                  <SelectItem value="protein_drink">Protein Drink</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Food Name</Label>
              <Input name="food_name" placeholder="e.g. Oatmeal & Eggs" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nutrition Stats</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border">
              <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">Calories</Label>
                 <Input name="calories" type="number" placeholder="kcal" required className="bg-background" />
              </div>
              <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                 <Input name="protein_g" type="number" className="bg-background" />
              </div>
              <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                 <Input name="carbs_g" type="number" className="bg-background" />
              </div>
              <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">Fats (g)</Label>
                 <Input name="fats_g" type="number" className="bg-background" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" /> Preparation Instructions
            </Label>
            <Textarea name="instructions" placeholder="Step 1: Mix ingredients..." rows={3} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Info className="h-4 w-4" /> Alternatives
            </Label>
            <Input name="alternatives" placeholder="Or swap X for Y..." />
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full">Save Meal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}