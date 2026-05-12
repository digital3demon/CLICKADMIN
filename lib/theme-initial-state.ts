import {
  computeResolvedDark,
  readThemePreferenceFromLocalStorage,
  type ThemePreference,
} from "@/lib/theme-storage";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Стартовое состояние темы на клиенте (до fetch из API) — из localStorage или «как в системе». */
export function getClientThemeInitialState(): {
  theme: ThemePreference;
  resolvedDark: boolean;
} {
  if (typeof window === "undefined") {
    return { theme: "system", resolvedDark: false };
  }
  const theme = readThemePreferenceFromLocalStorage() ?? "system";
  return {
    theme,
    resolvedDark: computeResolvedDark(theme, systemPrefersDark()),
  };
}
