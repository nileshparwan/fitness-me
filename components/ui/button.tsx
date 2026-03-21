import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/index"

const STANDARD_BUTTON_RADIUS = "rounded-[10px]"

function stripRoundedClasses(className?: string) {
  if (!className) return className

  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => {
      const lastSegment = token.split(":").pop() ?? token
      const normalized = lastSegment.startsWith("!") ? lastSegment.slice(1) : lastSegment
      return normalized !== "rounded" && !normalized.startsWith("rounded-")
    })
    .join(" ")
}

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap ${STANDARD_BUTTON_RADIUS} text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 active:scale-[0.99]`,
  {
    variants: {
      variant: {
        default:
          "border-0 bg-gradient-to-r from-primary via-chart-5 to-chart-4 text-primary-foreground shadow-colored hover:opacity-95",
        destructive:
          "border-0 bg-destructive text-primary-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/90",
        outline:
          "border-0 bg-card text-foreground shadow-soft hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border/80 bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  const normalizedClassName = stripRoundedClasses(className)

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className: normalizedClassName }), STANDARD_BUTTON_RADIUS)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
