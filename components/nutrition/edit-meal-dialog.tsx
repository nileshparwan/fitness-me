"use client";

import { useState } from "react";
import { updateMeal } from "@/app/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem } from "../ui/dropdown-menu";

export function EditMealDialog({ meal, asMenuItem }: { meal: any, asMenuItem?: boolean }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    await updateMeal(formData, meal.id, meal.program_id);
    toast.success("Meal updated");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {asMenuItem ? (
        <DialogTrigger asChild>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit Details
          </DropdownMenuItem>
        </DialogTrigger>
      ) : (
        // Standard Button Trigger
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Meal</DialogTitle></DialogHeader>
        <form action={action} className="grid gap-4 py-4">
          {/* Include date so it can be moved */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" name="meal_date" defaultValue={meal.meal_date} required /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select name="meal_type" defaultValue={meal.meal_type}>
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
            <div className="space-y-1"><Label>Cals</Label><Input name="calories" defaultValue={meal.calories} type="number" /></div>
            <div className="space-y-1"><Label>Prot</Label><Input name="protein_g" defaultValue={meal.protein_g} type="number" /></div>
            <div className="space-y-1"><Label>Carbs</Label><Input name="carbs_g" defaultValue={meal.carbs_g} type="number" /></div>
            <div className="space-y-1"><Label>Fat</Label><Input name="fats_g" defaultValue={meal.fats_g} type="number" /></div>
          </div>

          <div className="space-y-2"><Label>Instructions</Label><Textarea name="instructions" defaultValue={meal.instructions || ""} /></div>
          <div className="space-y-2"><Label>Alternatives</Label><Textarea name="alternatives" defaultValue={meal.alternatives || ""} /></div>

          <Button type="submit">Update Meal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}