"use client";

import * as React from "react";
import { AlertCircle, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/utils";
import { useWorkouts } from "@/hooks/use-workout";
import { addWorkoutsToProgram } from "@/app/actions/program";
import { useProgramStore } from "@/stores/use-program-store";


export function WorkoutSelector({ programId, onClose }: { programId: string; onClose: () => void }) {
    const { history } = useWorkouts();
    const [search, setSearch] = React.useState("");
    const [selected, setSelected] = React.useState<string[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
  
    // 2. Get current program items from Store
    const { items, addItem } = useProgramStore();
  
    const { data: workouts, isLoading, isError } = history;
  
    // 3. Filter Logic: Remove items already in the store
    const filteredWorkouts = React.useMemo(() => {
      if (!workouts) return [];
  
      return workouts.filter((w: any) => {
        const matchesSearch = w.name?.toLowerCase().includes(search.toLowerCase());
        const alreadyInProgram = items.some((item) => item.workout_id === w.id);
        
        // Only show if matches search AND is NOT in program
        return matchesSearch && !alreadyInProgram;
      });
    }, [workouts, search, items]);
  
    const toggleSelection = (id: string) => {
      setSelected(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    };
  
    const handleSave = async () => {
      if (selected.length === 0) return;
      if (!workouts || selected.length === 0) return;
      
      setIsSaving(true);
      
      try {
        // 4. Optimistic Update: Add to Store immediately
        // We need to find the full workout object to add it to the store correctly
        selected.forEach((selectedId, index) => {
          const workoutData = workouts.find((w: any) => w.id === selectedId);
          if (workoutData) {
             addItem({
              id: `temp-${Date.now()}-${index}`, // Temporary ID until refresh
              workout_id: selectedId,
              program_id: programId,
              order_index: items.length + index,
              item_type: "workout",
              day_label: "New",
              workouts: workoutData,
            });
          }
        });
  
        // 5. Server Update
        await addWorkoutsToProgram(programId, selected);
        toast.success(`Added ${selected.length} workouts`);
        
        onClose();
        setSelected([]);
      } catch (error) {
        toast.error("Failed to add workouts");
        // Note: In a real app, you might revert the store change here
      } finally {
        setIsSaving(false);
      }
    };
  
    return (
      <div className="flex flex-col flex-1 overflow-hidden gap-4 mt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
  
        <div className="flex-1 overflow-hidden border rounded-md relative bg-muted/10">
          <ScrollArea className="h-full p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading workouts...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <span>Failed to load workouts.</span>
              </div>
            ) : filteredWorkouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
                {search ? (
                   <p>No matching workouts found.</p>
                ) : (
                   <p>All workouts are already in this program!</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkouts.map((w: any) => {
                  const isSelected = selected.includes(w.id);
                  return (
                    <div 
                      key={w.id} 
                      onClick={() => toggleSelection(w.id)}
                      className={cn(
                        "flex items-center p-3 rounded-lg border cursor-pointer transition-all bg-background hover:bg-muted/50",
                        isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 rounded border mr-3 flex items-center justify-center transition-colors shrink-0", 
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{w.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(w.date).toLocaleDateString()} • {w.duration_minutes || 0}m
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
  
        <div className="flex items-center justify-between pt-2 border-t mt-auto">
          <div className="text-sm text-muted-foreground font-medium">
            {selected.length} selected
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={selected.length === 0 || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : "Add Selected"}
            </Button>
          </div>
        </div>
      </div>
    );
  }