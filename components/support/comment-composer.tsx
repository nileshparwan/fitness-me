"use client";

import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentComposerProps = {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
  isPending?: boolean;
};

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  isPending = false,
}: CommentComposerProps) {
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add a comment..."
        className="min-h-[100px]"
      />
      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={isPending || value.trim().length === 0}>
          {isPending ? <Loader2 className="mr-0 h-4 w-4 animate-spin sm:mr-2" /> : <Send className="mr-0 h-4 w-4 sm:mr-2" />}
          <span className="hidden sm:inline">Post Comment</span>
        </Button>
      </div>
    </div>
  );
}
