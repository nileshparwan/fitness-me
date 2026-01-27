"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EditableTextProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
}

export function EditableText({ initialValue, onSave, className }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (value.trim() === initialValue) {
      setIsEditing(false);
      return;
    }
    try {
      setIsLoading(true);
      await onSave(value);
      toast.success("Updated successfully");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update");
      setValue(initialValue);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 max-w-[300px] text-lg font-bold"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isLoading} className="h-8 w-8">
          <Check className="h-4 w-4 text-green-500" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isLoading} className="h-8 w-8">
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={`group flex items-center gap-2 cursor-pointer ${className}`} 
      onClick={() => setIsEditing(true)}
    >
      <span className="truncate">{value}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}