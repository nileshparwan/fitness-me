"use client";

import { useState } from "react";
import { updateMeal } from "@/app/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { NutritionMeal } from "@/types/nutrition";
import { useMediaQuery } from "@/hooks/use-media-query";

interface EditMealDialogProps {
  meal: NutritionMeal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMealDialog({ meal, open, onOpenChange }: EditMealDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  async function action(formData: FormData) {
    if (!meal.program_id) return;
    await updateMeal(formData, meal.id, meal.program_id);
    toast.success("Meal updated");
    onOpenChange(false);
  }

  const FormContent = (
    <form action={action} className="grid gap-4 py-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select name="meal_type" defaultValue={meal.meal_type || "breakfast"}>
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
      </div>
      <div className="space-y-2"><Label>Food Name</Label><Input name="food_name" defaultValue={meal.food_name} required /></div>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1"><Label>Cals</Label><Input name="calories" defaultValue={meal.calories ?? ""} type="number" /></div>
        <div className="space-y-1"><Label>Prot</Label><Input name="protein_g" defaultValue={meal.protein_g ?? ""} type="number" /></div>
        <div className="space-y-1"><Label>Carbs</Label><Input name="carbs_g" defaultValue={meal.carbs_g ?? ""} type="number" /></div>
        <div className="space-y-1"><Label>Fat</Label><Input name="fats_g" defaultValue={meal.fats_g ?? ""} type="number" /></div>
      </div>
      <div className="space-y-2"><Label>Instructions</Label><Textarea name="instructions" defaultValue={meal.instructions || ""} /></div>
      <div className="space-y-2"><Label>Alternatives</Label><Textarea name="alternatives" defaultValue={meal.alternatives || ""} /></div>
      <Button type="submit">Update Meal</Button>
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
          </DialogHeader>
          {FormContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto">
        <SheetHeader className="text-left"><SheetTitle>Edit Meal</SheetTitle></SheetHeader>
        {FormContent}
      </SheetContent>
    </Sheet>
  );
}