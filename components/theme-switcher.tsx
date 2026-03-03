"use client";

import { Paintbrush } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLOR_THEMES, ColorTheme } from "@/lib/theme-config";
import { useThemeStore } from "@/store/use-theme-store";

const THEME_META: Record<ColorTheme, { label: string; swatchClass: string }> = {
  default: { label: "Default", swatchClass: "bg-neutral-700" },
  blue: { label: "Blue", swatchClass: "bg-blue-600" },
  rose: { label: "Rose", swatchClass: "bg-rose-600" },
  green: { label: "Green", swatchClass: "bg-emerald-600" },
};

export function ThemeSwitcher() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 text-xs">
          <Paintbrush className="size-4" />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ColorTheme)}>
          {COLOR_THEMES.map((item) => (
            <DropdownMenuRadioItem key={item} value={item} className="capitalize">
              <span className={`mr-2 inline-flex size-3 rounded-full ${THEME_META[item].swatchClass}`} />
              {THEME_META[item].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
