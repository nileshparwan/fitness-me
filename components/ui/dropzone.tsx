"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

type DropzoneProps = {
  onDrop: (files: File[]) => void | Promise<void>;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  onError?: (message: string) => void;
  className?: string;
};

function toAcceptAttribute(accept?: Record<string, string[]>) {
  if (!accept) return undefined;
  return Object.entries(accept)
    .flatMap(([mime, extensions]) => [mime, ...extensions])
    .join(",");
}

export function Dropzone({ onDrop, accept, maxFiles = 1, maxSize, disabled = false, onError, className }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const acceptAttribute = useMemo(() => toAcceptAttribute(accept), [accept]);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (files.length === 0 || disabled) return;
    if (files.length > maxFiles) {
      onError?.(`Upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`);
      return;
    }
    if (maxSize && files.some((file) => file.size > maxSize)) {
      onError?.(`Each file must be ${Math.round(maxSize / (1024 * 1024))} MB or smaller.`);
      return;
    }
    await onDrop(files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDropFiles = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => void onDropFiles(event)}
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center transition-colors",
        isDragging && !disabled ? "border-chart-2/45 bg-chart-2/10" : "hover:border-chart-2/35 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute}
        className="hidden"
        disabled={disabled}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <UploadCloud className="mb-3 h-6 w-6 text-chart-2" />
      <p className="text-sm font-medium">Drop an image here or click to upload</p>
      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, or WebP up to 5 MB</p>
      <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl border-border/60" disabled={disabled}>
        Choose File
      </Button>
    </div>
  );
}
