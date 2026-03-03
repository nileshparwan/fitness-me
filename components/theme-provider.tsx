"use client";

import { useEffect, useState } from "react";

import { COLOR_THEMES, ColorTheme, THEME_CLASS_MAP } from "@/lib/theme-config";
import { useThemeStore } from "@/store/use-theme-store";

const ALL_THEME_CLASSES = COLOR_THEMES.map((theme) => THEME_CLASS_MAP[theme]);

export function applyColorTheme(theme: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const className of ALL_THEME_CLASSES) {
    root.classList.remove(className);
  }
  root.classList.add(THEME_CLASS_MAP[theme]);
  root.dataset.colorTheme = theme;
}

export default function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyColorTheme(theme);
  }, [mounted, theme]);

  return <>{children}</>;
}
