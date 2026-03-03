export const THEME_STORAGE_KEY = "fittrack-color-theme";

export const COLOR_THEMES = ["default", "blue", "rose", "green"] as const;

export type ColorTheme = (typeof COLOR_THEMES)[number];

export const THEME_CLASS_MAP: Record<ColorTheme, string> = {
  default: "theme-default",
  blue: "theme-blue",
  rose: "theme-rose",
  green: "theme-green",
};
