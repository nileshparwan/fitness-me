"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

function isInstalledPwa() {
  const standaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
}

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || "");
}

function isIosDevice() {
  return /iPhone|iPad/i.test(navigator.userAgent || "");
}

export function PwaInstallBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setMounted(true);

    if (isInstalledPwa()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (!isMobileDevice()) return;

    setVisible(true);
    setIsIos(isIosDevice());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      setShowIosHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setShowIosHelp(false);
  };

  const handleInstall = async () => {
    if (isIos) {
      setShowIosHelp((current) => !current);
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  if (!mounted || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 px-3 md:hidden">
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-[14px] border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/70">
            <Image src="/icons/icon-192.png" alt="App icon" width={28} height={28} className="rounded-md" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Add to your home screen</p>
            <p className="text-xs text-muted-foreground">Get the full app experience and quicker access.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-md"
            onClick={dismiss}
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant={isIos ? "outline" : "default"}
            className={isIos ? "rounded-[10px]" : "accent-strong rounded-[10px] text-black"}
            onClick={() => void handleInstall()}
            disabled={!isIos && (!deferredPrompt || installing)}
          >
            {isIos ? (
              "How to install"
            ) : installing ? (
              "Installing..."
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Install
              </>
            )}
          </Button>
        </div>

        {isIos && showIosHelp ? (
          <div className="mt-3 rounded-[10px] border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Share2 className="h-3.5 w-3.5" />
              iPhone/iPad steps:
            </span>{" "}
            Tap Share, then choose <span className="font-medium text-foreground">Add to Home Screen</span>.
          </div>
        ) : null}
      </div>
    </div>
  );
}
