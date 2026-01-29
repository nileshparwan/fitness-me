"use client";

import { Flame, Beef, Wheat, Droplets } from "lucide-react";

export function NutritionAnalytics({ meals }: { meals: any[] }) {
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein_g || 0),
    carbs: acc.carbs + (m.carbs_g || 0),
    fats: acc.fats + (m.fats_g || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 border rounded-lg p-3 text-sm mb-6">
      
      {/* Total Calories */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="bg-primary/10 p-1.5 rounded-full text-primary">
          <Flame className="h-4 w-4 fill-current" />
        </div>
        <div>
          <span className="block font-bold text-lg leading-none">{totals.calories}</span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">kcal Total</span>
        </div>
      </div>

      {/* Macros Horizontal List */}
      <div className="flex flex-1 w-full sm:w-auto grid grid-cols-3 gap-2 sm:flex sm:gap-6 justify-between sm:justify-end">
        
        {/* Protein */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-1 bg-red-500/20 rounded-full overflow-hidden">
             <div className="h-full bg-red-500 w-full" /> 
           </div>
           <div>
              <span className="block font-bold">{totals.protein}g</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Beef className="h-3 w-3" /> Protein
              </span>
           </div>
        </div>

        {/* Carbs */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-1 bg-green-500/20 rounded-full overflow-hidden">
             <div className="h-full bg-green-500 w-full" /> 
           </div>
           <div>
              <span className="block font-bold">{totals.carbs}g</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Wheat className="h-3 w-3" /> Carbs
              </span>
           </div>
        </div>

        {/* Fats */}
        <div className="flex items-center gap-2">
           <div className="h-8 w-1 bg-yellow-500/20 rounded-full overflow-hidden">
             <div className="h-full bg-yellow-500 w-full" /> 
           </div>
           <div>
              <span className="block font-bold">{totals.fats}g</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Droplets className="h-3 w-3" /> Fats
              </span>
           </div>
        </div>
      </div>
    </div>
  );
}