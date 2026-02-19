"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { upsertCardioLog } from "@/app/actions/cardio";
import { Database } from "@/types/database";

type CardioLog = Database['public']['Tables']['cardio_logs']['Row'];
type CardioLogInsert = Database['public']['Tables']['cardio_logs']['Insert'];

interface CardioLogFormProps {
  workoutId: string;
  initialData?: Partial<CardioLog>; // Strict typing
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CardioLogForm({ workoutId, initialData, onSuccess, onCancel }: CardioLogFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Use strings for inputs to handle "empty" state better than numbers
  const defaultState = {
    id: undefined as string | undefined,
    activity_type: "",
    duration_minutes: "",
    distance_km: "",
    calories_burned: "",
    average_heart_rate: "",
    max_heart_rate: "",
    average_pace: "",
    elevation_gain_m: "",
    reps: "", // Laps/Reps
    notes: ""
  };

  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        activity_type: initialData.activity_type || "",
        duration_minutes: initialData.duration_minutes?.toString() || "",
        distance_km: initialData.distance_km?.toString() || "",
        calories_burned: initialData.calories_burned?.toString() || "",
        average_heart_rate: initialData.average_heart_rate?.toString() || "",
        max_heart_rate: initialData.max_heart_rate?.toString() || "",
        average_pace: initialData.average_pace || "",
        elevation_gain_m: initialData.elevation_gain_m?.toString() || "",
        reps: initialData.reps?.toString() || "", // Using 'reps' column for Laps if needed
        notes: initialData.notes || ""
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof typeof defaultState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to convert string input -> DB Number or Null (avoid 0 for missing data)
  const getNumber = (val: string) => (val.trim() === "" ? null : Number(val));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_type || !formData.duration_minutes) {
      toast.error("Activity and Duration are required");
      return;
    }

    setLoading(true);
    try {
      // Construct Payload using strict DB types
      const payload: Omit<CardioLogInsert, "user_id" | "created_at" | "updated_at"> = {
        id: formData.id,
        workout_id: workoutId,
        activity_type: formData.activity_type,
        duration_minutes: Number(formData.duration_minutes), // Required
        distance_km: getNumber(formData.distance_km),
        calories_burned: getNumber(formData.calories_burned),
        average_heart_rate: getNumber(formData.average_heart_rate),
        max_heart_rate: getNumber(formData.max_heart_rate),
        elevation_gain_m: getNumber(formData.elevation_gain_m),
        average_pace: formData.average_pace || null,
        reps: getNumber(formData.reps), // Optional Laps
        notes: formData.notes || null,
      };

      await upsertCardioLog(payload);

      toast.success(formData.id ? "Log updated" : "Log added");
      if (!initialData) setFormData(defaultState); // Clear only if adding new
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-3 sm:p-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        {initialData ? "Edit Cardio Log" : "Add Cardio Log"}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label>Activity Type *</Label>
          <Input 
            placeholder="Running, Cycling..." 
            value={formData.activity_type} 
            onChange={e => handleChange("activity_type", e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>Duration (min) *</Label>
          <Input 
            type="number" 
            placeholder="30" 
            value={formData.duration_minutes} 
            onChange={e => handleChange("duration_minutes", e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs">Dist (km)</Label>
          <Input type="number" step="0.01" value={formData.distance_km} onChange={e => handleChange("distance_km", e.target.value)} />
        </div>
        <div className="space-y-2">
           <Label className="text-xs">Calories</Label>
           <Input type="number" value={formData.calories_burned} onChange={e => handleChange("calories_burned", e.target.value)} />
        </div>
        <div className="space-y-2">
           <Label className="text-xs">Avg HR</Label>
           <Input type="number" value={formData.average_heart_rate} onChange={e => handleChange("average_heart_rate", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
           <Label className="text-xs">Max HR</Label>
           <Input type="number" value={formData.max_heart_rate} onChange={e => handleChange("max_heart_rate", e.target.value)} />
        </div>
        <div className="space-y-2">
           <Label className="text-xs">Elev (m)</Label>
           <Input type="number" value={formData.elevation_gain_m} onChange={e => handleChange("elevation_gain_m", e.target.value)} />
        </div>
        <div className="space-y-2">
           <Label className="text-xs">Reps/Laps</Label>
           <Input type="number" value={formData.reps} onChange={e => handleChange("reps", e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Notes..." value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
        )}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Log" : "Add Log"}
        </Button>
      </div>
    </form>
  );
}
