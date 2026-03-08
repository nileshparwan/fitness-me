"use client";

import * as React from "react";
import { X } from "lucide-react";

import {
  Dialog as BaseDialog,
  DialogClose as BaseDialogClose,
  DialogContent as BaseDialogContent,
  DialogDescription as BaseDialogDescription,
  DialogTitle as BaseDialogTitle,
  DialogTrigger as BaseDialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet as BaseSheet,
  SheetClose as BaseSheetClose,
  SheetContent as BaseSheetContent,
  SheetDescription as BaseSheetDescription,
  SheetTitle as BaseSheetTitle,
  SheetTrigger as BaseSheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";
type ResponsiveModalSize =
  | ModalSize
  | {
      tablet?: ModalSize;
      desktop?: ModalSize;
    };

type ModalContextValue = {
  isMobile: boolean;
};

const ModalContext = React.createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = React.useContext(ModalContext);
  if (!context) {
    return { isMobile: false };
  }
  return context;
}

function resolveSize(size: ResponsiveModalSize | undefined) {
  if (!size) {
    return { tablet: "md" as ModalSize, desktop: "lg" as ModalSize };
  }
  if (typeof size === "string") {
    return { tablet: size, desktop: size };
  }
  return {
    tablet: size.tablet ?? "md",
    desktop: size.desktop ?? "lg",
  };
}

function tabletWidthClass(size: ModalSize) {
  if (size === "sm") return "sm:max-w-md";
  if (size === "md") return "sm:max-w-xl";
  if (size === "lg") return "sm:max-w-2xl";
  if (size === "xl") return "sm:max-w-3xl";
  return "sm:max-w-4xl";
}

function desktopWidthClass(size: ModalSize) {
  if (size === "sm") return "lg:max-w-lg";
  if (size === "md") return "lg:max-w-2xl";
  if (size === "lg") return "lg:max-w-3xl";
  if (size === "xl") return "lg:max-w-4xl";
  return "lg:max-w-5xl";
}

function ResponsiveModal({
  children,
  ...props
}: React.ComponentProps<typeof BaseDialog>) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const Root = isMobile ? BaseSheet : BaseDialog;

  return (
    <ModalContext.Provider value={{ isMobile }}>
      <Root {...props}>{children}</Root>
    </ModalContext.Provider>
  );
}

function ResponsiveModalTrigger({
  ...props
}: React.ComponentProps<typeof BaseDialogTrigger>) {
  const { isMobile } = useModalContext();
  const Trigger = isMobile ? BaseSheetTrigger : BaseDialogTrigger;
  return <Trigger {...props} />;
}

function ResponsiveModalClose({
  ...props
}: React.ComponentProps<typeof BaseDialogClose>) {
  const { isMobile } = useModalContext();
  const Close = isMobile ? BaseSheetClose : BaseDialogClose;
  return <Close {...props} />;
}

function ResponsiveModalContent({
  className,
  children,
  size,
  showCloseButton = true,
  showHandle = true,
  ...props
}: React.ComponentProps<typeof BaseDialogContent> & {
  size?: ResponsiveModalSize;
  showHandle?: boolean;
  showCloseButton?: boolean;
}) {
  const { isMobile } = useModalContext();
  const resolvedSize = resolveSize(size);

  if (isMobile) {
    return (
      <BaseSheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "max-h-[92svh] rounded-t-3xl border-x border-t border-border/70 bg-card/96 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-0 shadow-2xl backdrop-blur-xl",
          "flex flex-col gap-4 overflow-y-auto",
          className
        )}
        {...props}
      >
        {showHandle ? (
          <div className="px-4 pt-3">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/35" />
          </div>
        ) : null}
        {children}
        {showCloseButton ? <ResponsiveModalCloseButton className="top-4 right-4 sm:top-5 sm:right-5" /> : null}
      </BaseSheetContent>
    );
  }

  return (
    <BaseDialogContent
      showCloseButton={false}
      className={cn(
        "w-[calc(100vw-1.5rem)] max-h-[90svh] overflow-y-auto rounded-2xl border border-border/70 bg-card/96 p-6 shadow-[0_30px_70px_-38px_rgba(0,0,0,0.85)] backdrop-blur-xl",
        "grid gap-4",
        tabletWidthClass(resolvedSize.tablet),
        desktopWidthClass(resolvedSize.desktop),
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton ? <ResponsiveModalCloseButton /> : null}
    </BaseDialogContent>
  );
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
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

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialogTitle>) {
  const { isMobile } = useModalContext();
  if (isMobile) {
    return <BaseSheetTitle className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
  }
  return <BaseDialogTitle className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialogDescription>) {
  const { isMobile } = useModalContext();
  if (isMobile) {
    return <BaseSheetDescription className={cn("text-sm text-muted-foreground", className)} {...props} />;
  }
  return <BaseDialogDescription className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function ResponsiveModalCloseButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <ResponsiveModalClose asChild>
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
    </ResponsiveModalClose>
  );
}

export const Dialog = ResponsiveModal;
export const DialogTrigger = ResponsiveModalTrigger;
export const DialogClose = ResponsiveModalClose;
export const DialogContent = ResponsiveModalContent;
export const DialogHeader = ResponsiveModalHeader;
export const DialogTitle = ResponsiveModalTitle;
export const DialogDescription = ResponsiveModalDescription;
export const DialogFooter = ResponsiveModalFooter;
