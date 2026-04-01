"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function WorkoutAiTextTab() {
  const [aiText, setAiText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleGenerate() {
    if (!aiText.trim()) {
      toast.error("Please enter your workout details");
      return;
    }

    setIsProcessing(true);
    try {
      toast.error("AI text parsing is not available yet.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={aiText}
        onChange={(event) => setAiText(event.target.value)}
        placeholder="Paste or describe your workout session..."
        className="min-h-[300px] font-mono text-sm"
      />
      <div className="flex justify-end">
        <Button type="button" onClick={handleGenerate} disabled={isProcessing} className="rounded-xl">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate
        </Button>
      </div>
    </div>
  );
}
