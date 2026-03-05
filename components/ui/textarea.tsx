import * as React from "react"

import { cn } from "@/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "text-foreground placeholder:text-muted-foreground aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-2xl border-0 bg-input px-3 py-2 text-base ring-1 ring-inset ring-foreground/15 shadow-none transition-[background-color,box-shadow,ring-color] outline-none focus-visible:bg-background focus-visible:ring-primary/55 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
