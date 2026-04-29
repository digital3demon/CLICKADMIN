export const THEME_STORAGE_KEY = "click-admin-theme" as const;

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(v: string | null): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}
