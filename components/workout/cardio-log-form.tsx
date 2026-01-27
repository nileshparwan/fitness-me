"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Timer, MapPin, Flame, Heart, Activity, Mountain, Repeat } from "lucide-react";
import { toast } from "sonner";
import { upsertCardioLog } from "@/app/actions/cardio";

interface CardioLogFormProps {
  workoutId: string;
  initialData?: any; // <--- NEW: Accepts data for editing
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CardioLogForm({ workoutId, initialData, onSuccess, onCancel }: CardioLogFormProps) {
  const [loading, setLoading] = useState(false);
  
  // Default State
  const defaultState = {
    id: undefined,
    activity_type: "",
    duration_minutes: "",
    distance_km: "",
    calories_burned: "",
    average_heart_rate: "",
    max_heart_rate: "",
    average_pace: "",
    elevation_gain_m: "",
    reps: "",
    notes: ""
  };

  const [formData, setFormData] = useState(defaultState);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        activity_type: initialData.activity_type || "",
        duration_minutes: initialData.duration_minutes || "",
        distance_km: initialData.distance_km || "",
        calories_burned: initialData.calories_burned || "",
        average_heart_rate: initialData.average_heart_rate || "",
        max_heart_rate: initialData.max_heart_rate || "",
        average_pace: initialData.average_pace || "",
        elevation_gain_m: initialData.elevation_gain_m || "",
        reps: initialData.reps || "",
        notes: initialData.notes || ""
      });
    } else {
      setFormData(defaultState);
    }
  }, [initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.activity_type || !formData.duration_minutes) {
      toast.error("Activity and Duration are required");
      return;
    }

    setLoading(true);
    try {
      await upsertCardioLog({
        id: formData.id, // Pass ID for updates
        workout_id: workoutId,
        activity_type: formData.activity_type,
        duration_minutes: Number(formData.duration_minutes),
        distance_km: formData.distance_km ? Number(formData.distance_km) : null,
        calories_burned: formData.calories_burned ? Number(formData.calories_burned) : null,
        average_heart_rate: formData.average_heart_rate ? Number(formData.average_heart_rate) : null,
        max_heart_rate: formData.max_heart_rate ? Number(formData.max_heart_rate) : null,
        elevation_gain_m: formData.elevation_gain_m ? Number(formData.elevation_gain_m) : null,
        reps: formData.reps ? Number(formData.reps) : null,
        average_pace: formData.average_pace || null,
        notes: formData.notes || null,
      });

      toast.success(formData.id ? "Log updated" : "Log added");
      setFormData(defaultState); // Reset form
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-card">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        {initialData ? "Edit Cardio Log" : "Add Cardio Log"}
      </h3>

      {/* Inputs (Same as before) */}
      <div className="grid grid-cols-2 gap-4">
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

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-3 gap-3">
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

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-3 gap-3">
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

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Update Log" : "Add Log"}
        </Button>
      </div>
    </form>
  );
}