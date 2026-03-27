"use client";

import * as React from "react";
import { X } from "lucide-react";

import {
  Sheet as BaseSheet,
  SheetClose as BaseSheetClose,
  SheetContent as BaseSheetContent,
  SheetDescription as BaseSheetDescription,
  SheetHeader as BaseSheetHeader,
  SheetTitle as BaseSheetTitle,
  SheetTrigger as BaseSheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/utils";

type AppSheetSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | {
      tablet?: "sm" | "md" | "lg" | "xl" | "2xl";
      desktop?: "sm" | "md" | "lg" | "xl" | "2xl";
    };

type AppSheetContextValue = {
  isDesktop: boolean;
};

const AppSheetContext = React.createContext<AppSheetContextValue | null>(null);

function useAppSheetContext() {
  const context = React.useContext(AppSheetContext);
  return context ?? { isDesktop: true };
}

function resolveSize(size: AppSheetSize | undefined) {
  if (!size) {
    return { tablet: "md" as const, desktop: "lg" as const };
  }
  if (typeof size === "string") {
    return { tablet: size, desktop: size };
  }
  return {
    tablet: size.tablet ?? "md",
    desktop: size.desktop ?? "lg",
  };
}

function desktopWidthClass(size: NonNullable<ReturnType<typeof resolveSize>>["desktop"]) {
  if (size === "sm") return "max-w-[480px]";
  if (size === "md") return "max-w-[640px]";
  if (size === "lg") return "max-w-[720px]";
  if (size === "xl") return "max-w-[840px]";
  return "max-w-[960px]";
}

function AppSheet({ children, ...props }: React.ComponentProps<typeof BaseSheet>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <AppSheetContext.Provider value={{ isDesktop }}>
      <BaseSheet {...props}>{children}</BaseSheet>
    </AppSheetContext.Provider>
  );
}

function AppSheetTrigger({ ...props }: React.ComponentProps<typeof BaseSheetTrigger>) {
  return <BaseSheetTrigger {...props} />;
}

function AppSheetClose({ ...props }: React.ComponentProps<typeof BaseSheetClose>) {
  return <BaseSheetClose {...props} />;
}

function AppSheetContent({
  className,
  children,
  size,
  showCloseButton = true,
  showHandle = true,
  ...props
}: React.ComponentProps<typeof BaseSheetContent> & {
  size?: AppSheetSize;
  showHandle?: boolean;
  showCloseButton?: boolean;
}) {
  const { isDesktop } = useAppSheetContext();
  const resolvedSize = resolveSize(size);

  return (
    <BaseSheetContent
      side={isDesktop ? "right" : "bottom"}
      showCloseButton={false}
      className={cn(
        "bg-card/96 backdrop-blur-xl",
        isDesktop
          ? cn(
              "w-[calc(100vw-1.5rem)] border-l border-border/70 shadow-[0_30px_70px_-38px_rgba(0,0,0,0.85)]",
              desktopWidthClass(resolvedSize.desktop),
              "h-full max-h-screen"
            )
          : "max-h-[92svh] rounded-t-3xl border-x border-t border-border/70 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-0 shadow-2xl",
        "flex flex-col gap-4 overflow-y-auto",
        className
      )}
      {...props}
    >
      {!isDesktop && showHandle ? (
        <div className="px-4 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/35" />
        </div>
      ) : null}
      {children}
      {showCloseButton ? <AppSheetCloseButton className="top-4 right-4 sm:top-5 sm:right-5" /> : null}
    </BaseSheetContent>
  );
}

function AppSheetHeader({ className, ...props }: React.ComponentProps<typeof BaseSheetHeader>) {
  return <BaseSheetHeader className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />;
}

function AppSheetTitle({ className, ...props }: React.ComponentProps<typeof BaseSheetTitle>) {
  return <BaseSheetTitle className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

function AppSheetDescription({ className, ...props }: React.ComponentProps<typeof BaseSheetDescription>) {
  return <BaseSheetDescription className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function AppSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "[&>*]:w-full sm:[&>*]:w-auto",
        className
      )}
      {...props}
    />
  );
}

const DialogFooter = AppSheetFooter;

function AppSheetCloseButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <AppSheetClose asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-4 top-4 z-10 h-8 w-8 rounded-full border border-border/70 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground",
          className
        )}
        {...props}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </AppSheetClose>
  );
}

export {
  AppSheet,
  AppSheetTrigger,
  AppSheetClose,
  AppSheetContent,
  AppSheetHeader,
  AppSheetTitle,
  AppSheetDescription,
  AppSheetFooter,
  AppSheet as Dialog,
  AppSheetTrigger as DialogTrigger,
  AppSheetClose as DialogClose,
  AppSheetContent as DialogContent,
  AppSheetHeader as DialogHeader,
  AppSheetTitle as DialogTitle,
  AppSheetDescription as DialogDescription,
  DialogFooter,
};
export type { AppSheetSize };
