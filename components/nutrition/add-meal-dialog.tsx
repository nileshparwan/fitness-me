"use client";

import { useState } from "react";
import { Plus, ChefHat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { addMeal } from "@/app/actions/nutrition";
import { nutritionProgramKeys } from "@/lib/query-keys-nutrition-program";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUnitLabels } from "@/stores/use-settings-store";

interface Props {
  programId: string;
}

export function AddMealDialog({ programId }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const units = useUnitLabels();

  async function action(formData: FormData) {
    try {
      await addMeal(formData, programId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: nutritionProgramKeys.planMeals(programId) }),
        queryClient.invalidateQueries({ queryKey: nutritionProgramKeys.plan(programId) }),
        queryClient.invalidateQueries({ queryKey: nutritionProgramKeys.planOptions() }),
      ]);
      toast.success("Meal added successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to add meal");
    }
  }

  const FormContent = (
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
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">Calories</Label><Input name="calories" type="number" placeholder={units.energy} required className="bg-background" /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{`Protein (${units.macro})`}</Label><Input name="protein_g" type="number" className="bg-background" /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{`Carbs (${units.macro})`}</Label><Input name="carbs_g" type="number" className="bg-background" /></div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">{`Fats (${units.macro})`}</Label><Input name="fats_g" type="number" className="bg-background" /></div>
        </div>
      </div>

      <div className="space-y-2"><Label>Instructions</Label><Textarea name="instructions" placeholder="Preparation steps..." rows={3} /></div>
      <div className="space-y-2"><Label>Alternatives</Label><Input name="alternatives" placeholder="Or swap for..." /></div>

      <Button type="submit" size="lg" className="mt-2 w-full">Save Meal</Button>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Meal
        </Button>
      </DialogTrigger>
      <DialogContent size={{ tablet: "lg", desktop: "lg" }} className="overflow-y-auto px-4">
        <DialogHeader>
          <DialogTitle>Add New Meal</DialogTitle>
        </DialogHeader>
        {FormContent}
      </DialogContent>
    </Dialog>
  );
}
