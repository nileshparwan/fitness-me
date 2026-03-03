"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ColorTheme, THEME_STORAGE_KEY } from "@/lib/theme-config";

type ThemeState = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "default",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
